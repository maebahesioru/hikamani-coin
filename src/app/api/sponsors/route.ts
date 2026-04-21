import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Public API: スポンサー一覧を返す（認証不要）
export async function GET() {
  const now = new Date();

  const purchases = await prisma.purchase.findMany({
    where: {
      item: { slug: { in: ["sponsor-30d", "sponsor-forever", "sponsor-big-forever"] } },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    include: {
      user: { select: { displayName: true, avatar: true, discordId: true } },
      item: { select: { slug: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const sponsors = purchases.map((p) => ({
    userId: p.userId,
    displayName: p.user.displayName || "名無し",
    avatar: p.user.avatar,
    slug: p.item.slug,
    big: p.item.slug === "sponsor-big-forever",
    expiresAt: p.expiresAt,
  }));

  return NextResponse.json(sponsors, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
