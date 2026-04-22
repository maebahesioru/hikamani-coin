import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { verifyUserToken } from "@/lib/user-token";
import { NextRequest, NextResponse } from "next/server";

const AD_REVENUE_SHARE = 0.2; // 20% to site owner

// GET /api/ad-serve?site=xxx&sessionToken=yyy
// Returns: { show: false } | { show: true, ad: {...} | null }
export async function GET(req: NextRequest) {
  const site = req.nextUrl.searchParams.get("site") || "all";
  const sessionToken = req.nextUrl.searchParams.get("sessionToken");

  // Check if user has ad-hide purchase
  let hideAds = false;
  if (sessionToken) {
    const userId = verifyUserToken(sessionToken);
    if (userId) {
      const purchases = await prisma.purchase.findMany({
        where: {
          userId,
          item: { slug: { in: ["ad-hide-30d", "ad-hide-forever"] } },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      });
      hideAds = purchases.length > 0;
    }
  }

  if (hideAds) {
    return NextResponse.json({ show: false }, { headers: corsHeaders(req) });
  }

  // Get active HKM ads (全サイト or このサイト指定のもの)
  const now = new Date();
  const ads = await prisma.ad.findMany({
    where: {
      active: true,
      startsAt: { lte: now },
      expiresAt: { gt: now },
      OR: [
        { targetSite: null },
        { targetSite: site },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const ad = ads.length > 0 ? ads[Math.floor(Math.random() * ads.length)] : null;

  // Record site for ad-hide site selection
  if (site && site !== "all") {
    try { await redis.sadd("ad_sites", site); } catch {}
  }

  // Revenue share: APIキーまたはdata-user-idで収益分配
  if (ad) {
    const apiKey = req.headers.get("x-api-key") || req.nextUrl.searchParams.get("apiKey");
    const ownerId = req.nextUrl.searchParams.get("userId");
    let recipientId: string | null = null;

    if (apiKey) {
      const key = await prisma.apiKey.findUnique({ where: { key: apiKey, active: true } });
      if (key) recipientId = key.userId;
    } else if (ownerId) {
      // Verify userId exists in DB to prevent spoofing
      const exists = await prisma.wallet.findUnique({ where: { userId: ownerId }, select: { userId: true } });
      if (exists) recipientId = ownerId;
    }

    if (recipientId && recipientId !== ad.userId) {
      try {
        await prisma.$transaction(async (tx) => {
          const adOwnerWallet = await tx.wallet.findUnique({ where: { userId: ad.userId } });
          if (adOwnerWallet && adOwnerWallet.balance >= 1n) {
            await tx.wallet.update({ where: { userId: ad.userId }, data: { balance: { decrement: 1n } } });
            await tx.wallet.update({ where: { userId: recipientId! }, data: { balance: { increment: 1n } } });
            await tx.transaction.create({
              data: { type: "BONUS", amount: 1n, senderId: ad.userId, receiverId: recipientId!, memo: `広告収益: ${site}` },
            });
          }
        });
      } catch { /* ignore */ }
    }
  }

  return NextResponse.json({ show: true, ad: ad ? {
    id: ad.id, content: ad.content, imageUrl: ad.imageUrl, linkUrl: ad.linkUrl, type: ad.type,
  } : null }, { headers: corsHeaders(req) });
}

function corsHeaders(req: NextRequest) {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET",
    "Cache-Control": "no-store",
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}
