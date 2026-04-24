import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, ok } from "@/lib/api-utils";

export async function GET() {
  const session = await getAuthUser();
  if (!session) return unauthorized();

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    include: {
      wallet: true,
      dailyLogins: { orderBy: { date: "desc" }, take: 1 },
      linkedAccounts: true,
      stockPositions: { include: { stock: true } },
    },
  });

  if (!user) return unauthorized();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayLogin = await prisma.dailyLogin.findUnique({
    where: { userId_date: { userId: user.id, date: today } },
  });

  // Last 30 days login history
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  const loginHistory = await prisma.dailyLogin.findMany({
    where: { userId: user.id, date: { gte: thirtyDaysAgo } },
    select: { date: true, streak: true, amount: true },
    orderBy: { date: "asc" },
  });

  return ok({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar,
    referralCode: user.referralCode,
    balance: user.wallet?.balance.toString() ?? "0",
    streak: user.dailyLogins[0]?.streak ?? 0,
    dailyClaimed: !!todayLogin,
    loginHistory: loginHistory.map((l) => ({
      date: l.date.toISOString().split("T")[0],
      streak: l.streak,
      amount: l.amount.toString(),
    })),
    linkedAccounts: user.linkedAccounts.map((a) => a.provider),
    birthday: user.birthday?.toISOString() ?? null,
    stockPositions: user.stockPositions.map((p) => ({
      stockName: p.stock.name,
      quantity: p.quantity,
      isShort: p.isShort,
      avgPrice: p.avgPrice.toString(),
    })),
    createdAt: user.createdAt,
  });
}

export async function PATCH(req: import("next/server").NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { displayName, avatar } = await req.json() as { displayName?: string; avatar?: string };
  if (displayName !== undefined && (displayName.length < 1 || displayName.length > 50))
    return (await import("@/lib/api-utils")).badRequest("表示名は1〜50文字にしてください");

  await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(displayName !== undefined ? { displayName } : {}),
      ...(avatar !== undefined ? { avatar } : {}),
    },
  });

  return ok({ message: "プロフィールを更新しました" });
}
