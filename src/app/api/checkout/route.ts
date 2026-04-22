import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { getAuthUser, unauthorized, badRequest, ok } from "@/lib/api-utils";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

// POST: 決済トークン発行のみ（課金はGET検証時）
export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 10, window: 60 });
  if (!rl.ok) return rateLimitResponse(rl.remaining, rl.reset);

  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { itemSlug, callbackUrl } = await req.json() as { itemSlug: string; callbackUrl: string };

  const item = await prisma.shopItem.findUnique({ where: { slug: itemSlug } });
  if (!item) return badRequest("アイテムが見つかりません");

  // Validate callback URL (whitelist)
  const allowed = (process.env.CHECKOUT_CALLBACK_WHITELIST || "").split(",").map(s => s.trim()).filter(Boolean);
  if (allowed.length > 0 && !allowed.some(origin => callbackUrl.startsWith(origin))) {
    return badRequest("無効なコールバックURLです");
  }

  // Check balance before issuing token
  const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
  if (!wallet || wallet.balance < item.price) return badRequest("残高不足");

  // Issue pending token (valid 10 min) — no charge yet
  const token = randomBytes(32).toString("hex");
  const payload = JSON.stringify({ itemSlug, itemId: item.id, userId: user.id, price: item.price.toString(), callbackUrl, charged: false });
  try { await redis.setex(`checkout_token:${token}`, 600, payload); } catch {}

  return ok({ token });
}

// GET: トークン検証 + 課金実行（外部サイトから呼ぶ、1回限り）
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return badRequest("tokenが必要です");

  let raw: string | null = null;
  try { raw = await redis.get(`checkout_token:${token}`); } catch {}
  if (!raw) return NextResponse.json({ valid: false, error: "無効または期限切れのトークンです" }, { status: 400 });

  const payload = JSON.parse(raw) as { itemSlug: string; itemId: string; userId: string; price: string; callbackUrl: string; charged: boolean };

  // Prevent double-charge
  if (payload.charged) return NextResponse.json({ valid: false, error: "既に使用済みのトークンです" }, { status: 400 });

  // Mark as charged atomically before processing
  payload.charged = true;
  try { await redis.setex(`checkout_token:${token}`, 60, JSON.stringify(payload)); } catch {}

  const price = BigInt(payload.price);
  let purchaseId: string;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId: payload.userId } });
      if (!wallet || wallet.balance < price) throw new Error("残高不足");
      await tx.wallet.update({ where: { userId: payload.userId }, data: { balance: { decrement: price } } });
      const adminId = process.env.ADMIN_USER_ID;
      if (adminId) {
        await tx.wallet.upsert({
          where: { userId: adminId },
          update: { balance: { increment: price } },
          create: { userId: adminId, balance: price },
        });
      }
      const item = await tx.shopItem.findUnique({ where: { id: payload.itemId } });
      await tx.transaction.create({
        data: { type: "PURCHASE", amount: price, senderId: payload.userId, memo: item?.name || payload.itemSlug },
      });
      const purchase = await tx.purchase.create({
        data: { userId: payload.userId, itemId: payload.itemId, amount: price, expiresAt: item?.recurring ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null },
      });
      return purchase;
    });
    purchaseId = result.id;
  } catch (e) {
    // Rollback charged flag
    payload.charged = false;
    try { await redis.setex(`checkout_token:${token}`, 60, JSON.stringify(payload)); } catch {}
    return NextResponse.json({ valid: false, error: (e as Error).message }, { status: 400 });
  }

  // Delete token after successful charge
  try { await redis.del(`checkout_token:${token}`); } catch {}

  return ok({ valid: true, purchaseId, itemSlug: payload.itemSlug, userId: payload.userId });
}
