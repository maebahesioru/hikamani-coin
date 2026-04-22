import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

// POST /api/external/system-grant
// APIキー認証 + システム発行（無から生成）
// VC滞在ボーナスなどシステム報酬専用
export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 120, window: 60 });
  if (!rl.ok) return rateLimitResponse(rl.remaining, rl.reset);

  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) return NextResponse.json({ error: "APIキーが必要です" }, { status: 401 });

  const key = await prisma.apiKey.findUnique({ where: { key: apiKey, active: true } });
  if (!key) return NextResponse.json({ error: "無効なAPIキー" }, { status: 401 });

  const { discordId, amount: amountStr, memo } = await req.json() as {
    discordId: string; amount: string; memo?: string;
  };

  const amount = BigInt(amountStr || "0");
  if (amount <= 0n || amount > 100n) {
    return NextResponse.json({ error: "1回の付与上限は100 HKMです" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { discordId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.wallet.update({ where: { userId: user.id }, data: { balance: { increment: amount } } });
    await tx.transaction.create({
      data: { type: "BONUS", amount, receiverId: user.id, memo: memo || "システム報酬" },
    });
  });

  return NextResponse.json({ success: true });
}
