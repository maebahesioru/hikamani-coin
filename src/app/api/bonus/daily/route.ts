import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, badRequest, ok } from "@/lib/api-utils";
import { BONUS } from "@/lib/constants";

export async function POST() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.dailyLogin.findUnique({
    where: { userId_date: { userId: user.id, date: today } },
  });
  if (existing) return badRequest("本日は既にログイン済みです");

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const prev = await prisma.dailyLogin.findUnique({
    where: { userId_date: { userId: user.id, date: yesterday } },
  });
  const streak = prev ? prev.streak + 1 : 1;

  let reward = BONUS.DAILY_LOGIN;
  const bonuses: { type: "STREAK_7" | "STREAK_30"; amount: bigint }[] = [];
  if (streak === 7) bonuses.push({ type: "STREAK_7", amount: BONUS.STREAK_7 });
  if (streak === 30) bonuses.push({ type: "STREAK_30", amount: BONUS.STREAK_30 });
  const totalBonus = bonuses.reduce((s, b) => s + b.amount, 0n);
  reward += totalBonus;

  await prisma.$transaction(async (tx) => {
    await tx.dailyLogin.create({ data: { userId: user.id, date: today, streak, amount: reward } });
    await tx.wallet.update({ where: { userId: user.id }, data: { balance: { increment: reward } } });
    await tx.transaction.create({
      data: { type: "BONUS", amount: reward, receiverId: user.id, memo: `デイリーログイン (${streak}日目)` },
    });
    for (const b of bonuses) {
      await tx.bonusClaim.create({ data: { userId: user.id, type: b.type, amount: b.amount } });
    }
  });

  return ok({ streak, reward: reward.toString() });
}
