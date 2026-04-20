import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, ok } from "@/lib/api-utils";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
  const recent = await prisma.transaction.findMany({
    where: { OR: [{ senderId: user.id }, { receiverId: user.id }] },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return ok({
    balance: wallet?.balance.toString() ?? "0",
    transactions: recent.map((t) => ({
      ...t,
      amount: t.amount.toString(),
      fee: t.fee.toString(),
    })),
  });
}
