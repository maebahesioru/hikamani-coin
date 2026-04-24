import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, badRequest, ok } from "@/lib/api-utils";
import { STOCK_FEE_RATE, STOCK_FEE_RATE_DISCOUNTED } from "@/lib/constants";
import { fetchFxProfile } from "@/lib/twitter";
import { redis } from "@/lib/redis";
import { NextRequest } from "next/server";

// GET: 株一覧（検索・ページネーション対応）
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
  const limit = 20;

  const where = q ? { name: { contains: q, mode: "insensitive" as const } } : {};
  const sort = req.nextUrl.searchParams.get("sort") || "price_desc";
    price_desc: { field: "currentPrice", dir: "desc" },
    price_asc:  { field: "currentPrice", dir: "asc" },
    updated:    { field: "updatedAt",    dir: "desc" },
    name:       { field: "name",         dir: "asc" },
  };
  const { field: orderField, dir: orderDir } = sortMap[sort] ?? sortMap.price_desc;

  const [stocks, total] = await Promise.all([
    prisma.stock.findMany({
      where,
      include: { priceHistory: { orderBy: { createdAt: "desc" }, take: 30 } },
      orderBy: { [orderField]: orderDir },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.stock.count({ where }),
  ]);

  // Fetch cached profiles from Redis
  const profiles = await Promise.all(stocks.map(async (s) => {
    try {
      const cached = await redis.get(`profile:${s.name}`);
      if (cached) {
        const p = JSON.parse(cached);
        return { name: p.name, description: p.description, avatarUrl: p.avatarUrl, followers: p.followers, verified: p.verified };
      }
    } catch {}
    return null;
  }));

  return ok({
    stocks: stocks.map((s, i) => ({
      ...s,
      currentPrice: s.currentPrice.toString(),
      priceHistory: s.priceHistory.map((p) => ({ price: p.price.toString(), createdAt: p.createdAt })),
      profile: profiles[i],
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

// POST: 売買
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { stockId, quantity, action } = (await req.json()) as {
    stockId: string;
    quantity: number;
    action: "BUY" | "SELL" | "SHORT_SELL" | "SHORT_COVER";
  };

  if (quantity <= 0) return badRequest("数量は1以上にしてください");

  const stock = await prisma.stock.findUnique({ where: { id: stockId } });
  if (!stock) return badRequest("銘柄が見つかりません");

  const totalCost = stock.currentPrice * BigInt(quantity);

  // Check fee discount
  const feeDiscount = await prisma.purchase.findFirst({
    where: {
      userId: user.id,
      item: { slug: "stock-fee-discount" },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });
  const feeRate = feeDiscount ? STOCK_FEE_RATE_DISCOUNTED : STOCK_FEE_RATE;
  const fee = BigInt(Math.ceil(Number(totalCost) * feeRate));

  // Check short sell unlock
  if ((action === "SHORT_SELL" || action === "SHORT_COVER") ) {
    const unlock = await prisma.purchase.findFirst({
      where: { userId: user.id, item: { slug: "stock-short-unlock" } },
    });
    if (!unlock) return badRequest("空売りポジションがアンロックされていません");
  }

  await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId: user.id } });
    if (!wallet) throw new Error("ウォレットが見つかりません");

    const isShort = action === "SHORT_SELL" || action === "SHORT_COVER";
    const isBuy = action === "BUY" || action === "SHORT_COVER";

    if (isBuy && wallet.balance < totalCost + fee) throw new Error("残高不足");

    if (isBuy) {
      await tx.wallet.update({ where: { userId: user.id }, data: { balance: { decrement: totalCost + fee } } });
    } else {
      // Selling: check position
      const pos = await tx.stockPosition.findUnique({
        where: { userId_stockId_isShort: { userId: user.id, stockId, isShort } },
      });
      if (!pos || pos.quantity < quantity) throw new Error("保有数量が不足しています");
      await tx.wallet.update({ where: { userId: user.id }, data: { balance: { increment: totalCost - fee } } });
    }

    // Fee to admin
    const adminId = process.env.ADMIN_USER_ID;
    if (adminId && fee > 0n) {
      await tx.wallet.upsert({
        where: { userId: adminId },
        update: { balance: { increment: fee } },
        create: { userId: adminId, balance: fee },
      });
    }

    // Update position
    if (isBuy) {
      await tx.stockPosition.upsert({
        where: { userId_stockId_isShort: { userId: user.id, stockId, isShort } },
        update: { quantity: { increment: quantity } },
        create: { userId: user.id, stockId, quantity, isShort, avgPrice: stock.currentPrice },
      });
    } else {
      const pos = await tx.stockPosition.findUnique({
        where: { userId_stockId_isShort: { userId: user.id, stockId, isShort } },
      });
      const newQty = (pos?.quantity ?? 0) - quantity;
      if (newQty <= 0) {
        await tx.stockPosition.delete({
          where: { userId_stockId_isShort: { userId: user.id, stockId, isShort } },
        });
      } else {
        await tx.stockPosition.update({
          where: { userId_stockId_isShort: { userId: user.id, stockId, isShort } },
          data: { quantity: newQty },
        });
      }
    }

    await tx.stockOrder.create({
      data: { userId: user.id, stockId, type: action, quantity, price: stock.currentPrice, fee },
    });
    await tx.transaction.create({
      data: {
        type: isBuy ? "STOCK_BUY" : "STOCK_SELL",
        amount: totalCost,
        fee,
        senderId: isBuy ? user.id : undefined,
        receiverId: isBuy ? undefined : user.id,
        memo: `${stock.name} x${quantity}`,
      },
    });
  });

  return ok({ message: "注文完了" });
}
