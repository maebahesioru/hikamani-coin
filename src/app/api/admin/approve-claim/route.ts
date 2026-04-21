import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, badRequest, ok } from "@/lib/api-utils";
import { NextRequest } from "next/server";

// POST: 申請を承認してHKMを付与（管理者のみ）
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (user.id !== process.env.ADMIN_USER_ID) return unauthorized();

  const { claimId, amount } = await req.json() as { claimId: string; amount: number };
  if (!claimId || !amount || amount <= 0) return badRequest("claimIdとamountが必要です");

  const claim = await prisma.bonusClaim.findUnique({ where: { id: claimId } });
  if (!claim) return badRequest("申請が見つかりません");
  if (claim.amount > 0n) return badRequest("既に承認済みです");

  const hkm = BigInt(amount);
  await prisma.$transaction(async (tx) => {
    await tx.bonusClaim.update({ where: { id: claimId }, data: { amount: hkm } });
    await tx.wallet.update({ where: { userId: claim.userId }, data: { balance: { increment: hkm } } });
    await tx.transaction.create({
      data: { type: "BONUS", amount: hkm, receiverId: claim.userId, memo: `申請承認: ${claim.type}` },
    });
  });

  return ok({ message: `${amount} HKMを付与しました` });
}
