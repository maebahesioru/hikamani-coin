import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET /api/ad-serve?site=xxx&sessionToken=yyy
// Returns: { show: false } | { show: true, ad: {...} | null }
export async function GET(req: NextRequest) {
  const site = req.nextUrl.searchParams.get("site") || "all";
  const sessionToken = req.nextUrl.searchParams.get("sessionToken");

  // Check if user has ad-hide purchase
  let hideAds = false;
  if (sessionToken) {
    const session = await prisma.session.findUnique({
      where: { token: sessionToken },
      include: { user: { include: { purchases: { include: { item: true } } } } },
    });
    if (session?.user) {
      const now = new Date();
      hideAds = session.user.purchases.some((p) => {
        if (!["ad-hide-30d", "ad-hide-forever"].includes(p.item.slug)) return false;
        return !p.expiresAt || p.expiresAt > now;
      });
    }
  }

  if (hideAds) {
    return NextResponse.json({ show: false }, {
      headers: corsHeaders(req),
    });
  }

  // Get active HKM ads for this site
  const now = new Date();
  const ads = await prisma.ad.findMany({
    where: {
      active: true,
      expiresAt: { gt: now },
      OR: [
        { type: "ALL_SITES" },
        { type: "SINGLE_SITE" },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // Pick random ad
  const ad = ads.length > 0 ? ads[Math.floor(Math.random() * ads.length)] : null;

  return NextResponse.json({ show: true, ad: ad ? {
    id: ad.id,
    content: ad.content,
    imageUrl: ad.imageUrl,
    linkUrl: ad.linkUrl,
    type: ad.type,
  } : null }, {
    headers: corsHeaders(req),
  });
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
