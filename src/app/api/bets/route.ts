import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, badRequest, ok } from "@/lib/api-utils";
import { NextRequest } from "next/server";

// GET: マーケット一覧
export async function GET(req: NextRequest) {
  const active = req.nextUrl.searchParams.get("active") !== "false";
  const markets = await prisma.betMarket.findMany({
    where: active ? { resolved: false, endsAt: { gt: new Date() } } : {},
    include: { stock: true, _count: { select: { bets: true } } },
    orderBy: { endsAt: "asc" },
  });

  return ok(markets.map((m) => ({
    id: m.id,
    question: m.question,
    description: m.description,
    category: m.category,
    stockName: m.stock?.name,
    endsAt: m.endsAt,
    resolved: m.resolved,
    outcome: m.outcome,
    yesPool: m.yesPool.toString(),
    noPool: m.noPool.toString(),
    totalPool: (m.yesPool + m.noPool).toString(),
    yesOdds: m.yesPool + m.noPool > 0n ? Number(m.noPool) / Number(m.yesPool + m.noPool) + 1 : 2,
    noOdds: m.yesPool + m.noPool > 0n ? Number(m.yesPool) / Number(m.yesPool + m.noPool) + 1 : 2,
    betCount: m._count.bets,
  })));
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
