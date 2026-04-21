import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Vercel Cron / Coolify cron から叩くエンドポイント
// 認証: CRON_SECRET環境変数で保護
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};

  // 1. 株価更新
  try {
    const res = await fetch(`${process.env.AUTH_URL}/api/stocks/update-prices`, {
      method: "POST",
      headers: { "x-cron-secret": process.env.CRON_SECRET || "" },
    });
    results.stockUpdate = await res.json();
  } catch (e) {
    results.stockUpdateError = String(e);
  }

  // 2. 期限切れ賭けマーケットを自動解決（引き分け扱い＝全額返金）
  try {
    const expired = await prisma.betMarket.findMany({
      where: { resolved: false, endsAt: { lt: new Date() } },
      include: { bets: true },
    });

    for (const market of expired) {
      const totalPool = market.yesPool + market.noPool;
      await prisma.$transaction(async (tx) => {
        await tx.betMarket.update({ where: { id: market.id }, data: { resolved: true, outcome: null } });
        // 引き分け: 全額返金
        for (const bet of market.bets) {
          await tx.bet.update({ where: { id: bet.id }, data: { payout: bet.amount } });
          await tx.wallet.update({ where: { userId: bet.userId }, data: { balance: { increment: bet.amount } } });
          await tx.transaction.create({
            data: { type: "BONUS", amount: bet.amount, receiverId: bet.userId, memo: `賭け返金: ${market.question}` },
          });
        }
      });
    }
    results.expiredMarkets = expired.length;
  } catch (e) {
    results.expiredMarketsError = String(e);
  }

  return NextResponse.json({ ok: true, ...results });
}
