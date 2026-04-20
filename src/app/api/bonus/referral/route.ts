import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, badRequest, ok } from "@/lib/api-utils";
import { BONUS } from "@/lib/constants";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { code } = (await req.json()) as { code: string };
  if (!code) return badRequest("紹介コードを入力してください");

  const me = await prisma.user.findUnique({ where: { id: user.id } });
  if (me?.referredById) return badRequest("既に紹介コードを使用済みです");

  const inviter = await prisma.user.findUnique({ where: { referralCode: code } });
  if (!inviter) return badRequest("無効な紹介コードです");
  if (inviter.id === user.id) return badRequest("自分の紹介コードは使えません");

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { referredById: inviter.id } });
    await tx.wallet.update({ where: { userId: user.id }, data: { balance: { increment: BONUS.REFERRAL_INVITEE } } });
    await tx.wallet.update({ where: { userId: inviter.id }, data: { balance: { increment: BONUS.REFERRAL_INVITER } } });
    await tx.transaction.create({
      data: { type: "BONUS", amount: BONUS.REFERRAL_INVITEE, receiverId: user.id, memo: "紹介ボーナス(被招待)" },
    });
    await tx.transaction.create({
      data: { type: "BONUS", amount: BONUS.REFERRAL_INVITER, receiverId: inviter.id, memo: "紹介ボーナス(招待)" },
    });
    await tx.bonusClaim.create({ data: { userId: user.id, type: "REFERRAL_INVITEE", amount: BONUS.REFERRAL_INVITEE } });
    await tx.bonusClaim.create({ data: { userId: inviter.id, type: "REFERRAL_INVITER", amount: BONUS.REFERRAL_INVITER } });
  });

  return ok({ message: "紹介コードを適用しました" });
}
