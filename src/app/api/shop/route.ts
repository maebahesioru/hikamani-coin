import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, badRequest, ok } from "@/lib/api-utils";
import { NextRequest } from "next/server";

// GET: ショップアイテム一覧
export async function GET() {
  const items = await prisma.shopItem.findMany({ where: { active: true }, orderBy: { category: "asc" } });
  return ok(items.map((i) => ({ ...i, price: i.price.toString() })));
}

// POST: 購入
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { itemSlug } = (await req.json()) as { itemSlug: string };
  const item = await prisma.shopItem.findUnique({ where: { slug: itemSlug } });
  if (!item || !item.active) return badRequest("アイテムが見つかりません");

  const result = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId: user.id } });
    if (!wallet || wallet.balance < item.price) throw new Error("残高不足");

    await tx.wallet.update({ where: { userId: user.id }, data: { balance: { decrement: item.price } } });

    // Fee to admin
    const adminId = process.env.ADMIN_USER_ID;
    if (adminId) {
      await tx.wallet.upsert({
        where: { userId: adminId },
        update: { balance: { increment: item.price } },
        create: { userId: adminId, balance: item.price },
      });
    }

    const expiresAt = item.recurring ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;

    await tx.transaction.create({
      data: { type: "PURCHASE", amount: item.price, senderId: user.id, memo: item.name },
    });

    return tx.purchase.create({
      data: { userId: user.id, itemId: item.id, amount: item.price, expiresAt },
    });
  });

  // TwiGacha連携: ガチャアイテムの場合はTwiGachaのAPIを叩く
  let twigachaCards = null;
  if (itemSlug === "twigacha-5pack" || itemSlug === "twigacha-ssr") {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { linkedAccounts: { where: { provider: "DISCORD" } } },
    });
    const discordId = dbUser?.linkedAccounts[0]?.providerId;
    if (discordId && process.env.TWIGACHA_URL) {
      try {
        const res = await fetch(`${process.env.TWIGACHA_URL}/api/gacha/hkm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ discordId, type: itemSlug === "twigacha-ssr" ? "ssr" : "normal" }),
        });
        if (res.ok) twigachaCards = await res.json();
      } catch { /* TwiGacha unavailable */ }
    }
  }

  return ok({ purchaseId: result.id, twigachaCards });
}
