import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, badRequest, ok } from "@/lib/api-utils";
import { NextRequest } from "next/server";

// POST: 管理者がユーザーにHKMを付与/減算
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.id !== process.env.ADMIN_USER_ID) return unauthorized();

  const { userId, amount, memo } = await req.json() as { userId?: string; amount: number; memo?: string };
  const targetId = userId || user.id;
  if (!amount) return badRequest("amountが必要です");

  const hkm = BigInt(amount);
  await prisma.$transaction(async (tx) => {
    if (hkm > 0n) {
      await tx.wallet.upsert({
        where: { userId: targetId },
        update: { balance: { increment: hkm } },
        create: { userId: targetId, balance: hkm },
      });
    } else {
      const w = await tx.wallet.findUnique({ where: { userId: targetId } });
      if (!w) throw new Error("ウォレットが見つかりません");
      await tx.wallet.update({ where: { userId: targetId }, data: { balance: { decrement: -hkm } } });
    }
    await tx.transaction.create({
      data: {
        type: "BONUS",
        amount: hkm > 0n ? hkm : -hkm,
        receiverId: hkm > 0n ? targetId : undefined,
        senderId: hkm < 0n ? targetId : undefined,
        memo: memo || `管理者操作: ${amount > 0 ? "+" : ""}${amount} HKM`,
      },
    });
  });

  const wallet = await prisma.wallet.findUnique({ where: { userId: targetId } });
  return ok({ userId: targetId, newBalance: wallet?.balance.toString(), changed: amount });
}
