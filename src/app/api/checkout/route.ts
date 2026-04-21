import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { getAuthUser, unauthorized, badRequest, ok } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

// POST: 決済実行 → ワンタイムトークン発行
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { itemSlug, callbackUrl } = await req.json() as { itemSlug: string; callbackUrl: string };

  const item = await prisma.shopItem.findUnique({ where: { slug: itemSlug } });
  if (!item || !item.active) return badRequest("アイテムが見つかりません");

  // Validate callback URL (whitelist)
  const allowed = (process.env.CHECKOUT_CALLBACK_WHITELIST || "").split(",").map(s => s.trim());
  const isAllowed = allowed.length === 0 || allowed.some(origin => callbackUrl.startsWith(origin));
  if (!isAllowed) return badRequest("無効なコールバックURLです");

  // Execute purchase
  const result = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId: user.id } });
    if (!wallet || wallet.balance < item.price) throw new Error("残高不足");
    await tx.wallet.update({ where: { userId: user.id }, data: { balance: { decrement: item.price } } });
    const adminId = process.env.ADMIN_USER_ID;
    if (adminId) {
      await tx.wallet.upsert({
        where: { userId: adminId },
        update: { balance: { increment: item.price } },
        create: { userId: adminId, balance: item.price },
      });
    }
    await tx.transaction.create({
      data: { type: "PURCHASE", amount: item.price, senderId: user.id, memo: item.name },
    });
    return tx.purchase.create({
      data: { userId: user.id, itemId: item.id, amount: item.price, expiresAt: item.recurring ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null },
    });
  });

  // Issue one-time token (valid 5 min)
  const token = randomBytes(32).toString("hex");
  const payload = JSON.stringify({ purchaseId: result.id, itemSlug, userId: user.id });
  try { await redis.setex(`checkout_token:${token}`, 300, payload); } catch {}

  return ok({ token, purchaseId: result.id });
}

// GET: トークン検証（外部サイトから呼ぶ）
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return badRequest("tokenが必要です");

  let payload: { purchaseId: string; itemSlug: string; userId: string } | null = null;
  try {
    const raw = await redis.get(`checkout_token:${token}`);
    if (raw) {
      payload = JSON.parse(raw);
      await redis.del(`checkout_token:${token}`); // one-time use
    }
  } catch {}

  if (!payload) return NextResponse.json({ valid: false }, { status: 400 });

  return ok({ valid: true, ...payload });
}
