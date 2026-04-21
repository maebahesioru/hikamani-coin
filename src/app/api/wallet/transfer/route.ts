import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, badRequest, ok } from "@/lib/api-utils";
import { TRANSFER_FEE_RATE } from "@/lib/constants";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 10, window: 60 });
  if (!rl.ok) return rateLimitResponse(rl.remaining, rl.reset);
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const body = await req.json();
  const { recipientId, amount: amountStr, memo } = body as {
    recipientId: string;
    amount: string;
    memo?: string;
  };

  const amount = BigInt(amountStr || "0");
  if (amount <= 0n) return badRequest("金額は1以上にしてください");
  if (recipientId === user.id) return badRequest("自分自身には送金できません");

  const resolvedId = recipientId;

  const fee = BigInt(Math.ceil(Number(amount) * TRANSFER_FEE_RATE));
  const total = amount + fee;

  const result = await prisma.$transaction(async (tx) => {
    const sender = await tx.wallet.findUnique({ where: { userId: user.id } });
    if (!sender || sender.balance < total) throw new Error("残高不足");

    const recipient = await tx.wallet.findUnique({ where: { userId: resolvedId } });
    if (!recipient) throw new Error("送金先が見つかりません");

    await tx.wallet.update({ where: { userId: user.id }, data: { balance: { decrement: total } } });
    await tx.wallet.update({ where: { userId: resolvedId }, data: { balance: { increment: amount } } });

    // Fee to admin
    const adminId = process.env.ADMIN_USER_ID;
    if (adminId && fee > 0n) {
      await tx.wallet.upsert({
        where: { userId: adminId },
        update: { balance: { increment: fee } },
        create: { userId: adminId, balance: fee },
      });
      await tx.transaction.create({
        data: { type: "FEE", amount: fee, senderId: user.id, receiverId: adminId, memo: "送金手数料" },
      });
    }

    return tx.transaction.create({
      data: { type: "TRANSFER", amount, fee, senderId: user.id, receiverId: resolvedId, memo },
    });
  });

  return ok({ id: result.id, amount: result.amount.toString(), fee: fee.toString() });
}
