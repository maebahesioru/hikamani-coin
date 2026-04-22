import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, badRequest, ok } from "@/lib/api-utils";
import { redis } from "@/lib/redis";
import { NextRequest } from "next/server";

const CATEGORY_LABEL: Record<string, string> = {
  name_change: "名前変更",
  icon_change: "アイコン変更",
  profile_change: "プロフィール変更",
  lock_change: "鍵垢",
  tweet_momentum: "ツイート勢い",
  general: "一般",
};

// GET: マーケット一覧
export async function GET(req: NextRequest) {
  const active = req.nextUrl.searchParams.get("active") !== "false";
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1"));
  const limit = 20;
  const q = req.nextUrl.searchParams.get("q") || "";

  const where = {
    ...(active ? { resolved: false, endsAt: { gt: new Date() } } : {}),
    ...(q ? { stock: { name: { contains: q, mode: "insensitive" as const } } } : {}),
  };

  const [markets, total] = await Promise.all([
    prisma.betMarket.findMany({
      where,
      include: { stock: true, _count: { select: { bets: true } } },
      orderBy: [
        { yesPool: "desc" },
        { noPool: "desc" },
        { createdAt: "desc" },
      ],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.betMarket.count({ where }),
  ]);

  // Fetch cached profiles in parallel
  const profileMap = new Map<string, Record<string, unknown>>();
  const handles = [...new Set(markets.map(m => m.stock?.name).filter(Boolean) as string[])];
  await Promise.all(handles.map(async (h) => {
    try {
      const cached = await redis.get(`profile:${h}`);
      if (cached) profileMap.set(h, JSON.parse(cached));
    } catch {}
  }));

  return ok({
    markets: markets.map((m) => {
      const p = m.stock ? profileMap.get(m.stock.name) : null;
      return {
        id: m.id,
        question: m.question,
        category: m.category,
        categoryLabel: CATEGORY_LABEL[m.category] || m.category,
        stockName: m.stock?.name,
        stockPrice: m.stock?.currentPrice.toString(),
        profile: p ? { name: p.name, avatarUrl: p.avatarUrl, followers: p.followers, verified: p.verified } : null,
        endsAt: m.endsAt,
        resolved: m.resolved,
        outcome: m.outcome,
        yesPool: m.yesPool.toString(),
        noPool: m.noPool.toString(),
        yesOdds: m.yesPool + m.noPool > 0n ? Number(m.noPool) / Number(m.yesPool + m.noPool) + 1 : 2,
        noOdds: m.yesPool + m.noPool > 0n ? Number(m.yesPool) / Number(m.yesPool + m.noPool) + 1 : 2,
        betCount: m._count.bets,
      };
    }),
    total,
    pages: Math.ceil(total / limit),
  });
}

// POST: 賭ける
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { marketId, side, amount: amountStr } = (await req.json()) as {
    marketId: string;
    side: boolean; // true=YES, false=NO
    amount: string;
  };

  const amount = BigInt(amountStr || "0");
  if (amount < 10n) return badRequest("最低10 HKMから賭けられます");

  const market = await prisma.betMarket.findUnique({ where: { id: marketId } });
  if (!market) return badRequest("マーケットが見つかりません");
  if (market.resolved) return badRequest("このマーケットは既に終了しています");
  if (market.endsAt < new Date()) return badRequest("締切を過ぎています");

  await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId: user.id } });
    if (!wallet || wallet.balance < amount) throw new Error("残高不足");

    await tx.wallet.update({ where: { userId: user.id }, data: { balance: { decrement: amount } } });
    await tx.betMarket.update({
      where: { id: marketId },
      data: side ? { yesPool: { increment: amount } } : { noPool: { increment: amount } },
    });
    await tx.bet.create({ data: { userId: user.id, marketId, side, amount } });
    await tx.transaction.create({
      data: { type: "PURCHASE", amount, senderId: user.id, memo: `賭け: ${market.question} (${side ? "YES" : "NO"})` },
    });
  });

  return ok({ message: "賭け完了" });
}
