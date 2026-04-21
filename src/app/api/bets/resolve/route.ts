import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, badRequest, ok } from "@/lib/api-utils";
import { NextRequest } from "next/server";

// POST: マーケットを解決 (admin only)
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (user.id !== process.env.ADMIN_USER_ID) return unauthorized();

  const { marketId, outcome } = (await req.json()) as { marketId: string; outcome: boolean };

  const market = await prisma.betMarket.findUnique({ where: { id: marketId }, include: { bets: true } });
  if (!market) return badRequest("マーケットが見つかりません");
  if (market.resolved) return badRequest("既に解決済みです");

  const totalPool = market.yesPool + market.noPool;
  const winningPool = outcome ? market.yesPool : market.noPool;

  await prisma.$transaction(async (tx) => {
    await tx.betMarket.update({ where: { id: marketId }, data: { resolved: true, outcome } });

    for (const bet of market.bets) {
      if (bet.side === outcome && winningPool > 0n) {
        // Winner: proportional payout from total pool
        const payout = (bet.amount * totalPool) / winningPool;
        await tx.bet.update({ where: { id: bet.id }, data: { payout } });
        await tx.wallet.update({ where: { userId: bet.userId }, data: { balance: { increment: payout } } });
        await tx.transaction.create({
          data: { type: "BONUS", amount: payout, receiverId: bet.userId, memo: `賭け勝利: ${market.question}` },
        });
      } else {
        await tx.bet.update({ where: { id: bet.id }, data: { payout: 0n } });
      }
    }
  });

  return ok({ message: "マーケット解決完了" });
}
