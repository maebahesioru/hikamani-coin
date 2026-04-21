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

  return ok({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar,
    referralCode: user.referralCode,
    balance: user.wallet?.balance.toString() ?? "0",
    streak: user.dailyLogins[0]?.streak ?? 0,
    dailyClaimed: !!todayLogin,
    linkedAccounts: user.linkedAccounts.map((a) => a.provider),
    stockPositions: user.stockPositions.map((p) => ({
      stockName: p.stock.name,
      quantity: p.quantity,
      isShort: p.isShort,
      avgPrice: p.avgPrice.toString(),
    })),
    createdAt: user.createdAt,
  });
}
