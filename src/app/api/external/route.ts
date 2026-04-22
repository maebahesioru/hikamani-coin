import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

async function validateApiKey(req: NextRequest) {
  const key = req.headers.get("x-api-key");
  if (!key) return null;

  const apiKey = await prisma.apiKey.findUnique({ where: { key }, include: { user: true } });
  if (!apiKey || !apiKey.active) return null;

  // CORS origin check
  const origin = req.headers.get("origin");
  if (origin && apiKey.allowedOrigins.length > 0 && !apiKey.allowedOrigins.includes(origin)) {
    return null;
  }

  await prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });
  return apiKey;
}

function corsHeaders(origin: string | null, allowedOrigins: string[]) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key",
  };
  if (origin && (allowedOrigins.length === 0 || allowedOrigins.includes(origin))) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

// OPTIONS: CORS preflight
export async function OPTIONS(req: NextRequest) {
  const key = req.headers.get("x-api-key");
  const origin = req.headers.get("origin");
  let origins: string[] = [];
  if (key) {
    const apiKey = await prisma.apiKey.findUnique({ where: { key } });
    if (apiKey) origins = apiKey.allowedOrigins;
  }
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin, origins) });
}

// GET: ユーザーの残高を外部から取得
export async function GET(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 60, window: 60 });
  if (!rl.ok) return rateLimitResponse(rl.remaining, rl.reset);
  const apiKey = await validateApiKey(req);
  if (!apiKey) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });

  const userId = req.nextUrl.searchParams.get("userId");
  const discordId = req.nextUrl.searchParams.get("discordId");

  let wallet;
  if (userId) {
    wallet = await prisma.wallet.findUnique({ where: { userId } });
  } else if (discordId) {
    const user = await prisma.user.findUnique({ where: { discordId } });
    if (user) wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
  }

  const origin = req.headers.get("origin");
  return NextResponse.json(
    { balance: wallet?.balance.toString() ?? "0" },
    { headers: corsHeaders(origin, apiKey.allowedOrigins) }
  );
}

// POST: 外部からのポイント付与/消費
export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 30, window: 60 });
  if (!rl.ok) return rateLimitResponse(rl.remaining, rl.reset);
  const apiKey = await validateApiKey(req);
  if (!apiKey) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });

  const { discordId, amount: amountStr, memo, action } = (await req.json()) as {
    discordId: string;
    amount: string;
    memo?: string;
    action: "grant" | "deduct";
  };

  const user = await prisma.user.findUnique({ where: { discordId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const amount = BigInt(amountStr || "0");
  if (amount <= 0n) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  if (amount > 10000n) return NextResponse.json({ error: "1回の付与上限は10,000 HKMです" }, { status: 400 });

  // Daily grant limit per API key: 100,000 HKM
  if (action === "grant") {
    const dayKey = `grant_daily:${apiKey.id}:${new Date().toISOString().slice(0, 10)}`;
    const todayTotal = parseInt(await redis.get(dayKey) || "0");
    if (todayTotal + Number(amount) > 100000) {
      return NextResponse.json({ error: "1日の付与上限(100,000 HKM)を超えています" }, { status: 429 });
    }
    await redis.setex(dayKey, 86400, String(todayTotal + Number(amount)));
  }

  await prisma.$transaction(async (tx) => {
    if (action === "deduct") {
      const wallet = await tx.wallet.findUnique({ where: { userId: user.id } });
      if (!wallet || wallet.balance < amount) throw new Error("Insufficient balance");
      await tx.wallet.update({ where: { userId: user.id }, data: { balance: { decrement: amount } } });
    } else {
      await tx.wallet.update({ where: { userId: user.id }, data: { balance: { increment: amount } } });
    }
    await tx.transaction.create({
      data: {
        type: "BONUS",
        amount,
        ...(action === "grant" ? { receiverId: user.id } : { senderId: user.id }),
        memo: memo || `External API: ${action}`,
      },
    });
  });

  const origin = req.headers.get("origin");
  return NextResponse.json({ success: true }, { headers: corsHeaders(origin, apiKey.allowedOrigins) });
}
