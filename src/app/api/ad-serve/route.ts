import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
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
    // sessionToken is userId stored in localStorage
    const purchases = await prisma.purchase.findMany({
      where: {
        userId: sessionToken,
        item: { slug: { in: ["ad-hide-30d", "ad-hide-forever"] } },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    hideAds = purchases.length > 0;
  }

  if (hideAds) {
    return NextResponse.json({ show: false }, { headers: corsHeaders(req) });
  }

  // Get active HKM ads (全サイト or このサイト指定のもの)
  const now = new Date();
  const ads = await prisma.ad.findMany({
    where: {
      active: true,
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

  // Revenue share: pay site owner when ad is shown
  if (ad) {
    const apiKey = req.headers.get("x-api-key") || req.nextUrl.searchParams.get("apiKey");
    if (apiKey) {
      const key = await prisma.apiKey.findUnique({ where: { key: apiKey, active: true } });
      if (key && key.userId !== ad.userId) {
        // Pay 20% of ad cost to site owner (per impression, capped)
        const rewardPerImpression = BigInt(Math.floor(1)); // 1 HKM per impression
        try {
          await prisma.$transaction(async (tx) => {
            const adOwnerWallet = await tx.wallet.findUnique({ where: { userId: ad.userId } });
            if (adOwnerWallet && adOwnerWallet.balance >= rewardPerImpression) {
              await tx.wallet.update({ where: { userId: ad.userId }, data: { balance: { decrement: rewardPerImpression } } });
              await tx.wallet.update({ where: { userId: key.userId }, data: { balance: { increment: rewardPerImpression } } });
              await tx.transaction.create({
                data: { type: "BONUS", amount: rewardPerImpression, senderId: ad.userId, receiverId: key.userId, memo: `広告収益: ${site}` },
              });
            }
          });
        } catch { /* ignore */ }
      }
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
