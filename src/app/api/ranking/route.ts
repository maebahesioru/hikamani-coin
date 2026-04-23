import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/api-utils";

export async function GET() {
  const [balances, positions, bets] = await Promise.all([
    // HKM残高TOP20
    prisma.wallet.findMany({
      orderBy: { balance: "desc" },
      take: 20,
      include: { user: { select: { displayName: true, username: true, avatar: true } } },
    }),
    // 株時価総額TOP20 (保有数×現在価格)
    prisma.stockPosition.findMany({
      where: { isShort: false },
      include: { user: { select: { id: true, displayName: true, username: true, avatar: true } }, stock: { select: { currentPrice: true } } },
    }),
    // 賭け獲得TOP20
    prisma.bet.findMany({
      where: { payout: { not: null, gt: 0 } },
      include: { user: { select: { id: true, displayName: true, username: true, avatar: true } } },
    }),
  ]);

  // 株時価総額を集計
  const stockMap = new Map<string, { user: typeof positions[0]["user"]; total: bigint }>();
  for (const p of positions) {
    const val = BigInt(p.quantity) * p.stock.currentPrice;
    const prev = stockMap.get(p.userId);
    stockMap.set(p.userId, { user: p.user, total: (prev?.total ?? 0n) + val });
  }
  const stockRanking = [...stockMap.values()].sort((a, b) => (b.total > a.total ? 1 : -1)).slice(0, 20);

  // 賭け獲得を集計
  const betMap = new Map<string, { user: typeof bets[0]["user"]; total: bigint }>();
  for (const b of bets) {
    const prev = betMap.get(b.userId);
    betMap.set(b.userId, { user: b.user, total: (prev?.total ?? 0n) + (b.payout ?? 0n) });
  }
  const betRanking = [...betMap.values()].sort((a, b) => (b.total > a.total ? 1 : -1)).slice(0, 20);

  return ok({
    balance: balances.map((w, i) => ({ rank: i + 1, name: w.user.displayName || w.user.username, avatar: w.user.avatar, amount: w.balance.toString() })),
    stock: stockRanking.map((s, i) => ({ rank: i + 1, name: s.user.displayName || s.user.username, avatar: s.user.avatar, amount: s.total.toString() })),
    bet: betRanking.map((b, i) => ({ rank: i + 1, name: b.user.displayName || b.user.username, avatar: b.user.avatar, amount: b.total.toString() })),
  });
}
