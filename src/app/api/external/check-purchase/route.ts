import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

async function validateApiKey(req: NextRequest) {
  const key = req.headers.get("x-api-key");
  if (!key) return null;
  return prisma.apiKey.findUnique({ where: { key, active: true } });
}

// GET /api/external/check-purchase?discordId=xxx&slug=yyy
export async function GET(req: NextRequest) {
  const apiKey = await validateApiKey(req);
  if (!apiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const discordId = req.nextUrl.searchParams.get("discordId");
  const slug = req.nextUrl.searchParams.get("slug");

  if (!discordId || !slug) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  const user = await prisma.user.findFirst({
    where: { linkedAccounts: { some: { provider: "DISCORD", providerId: discordId } } },
  });
  if (!user) return NextResponse.json({ active: false });

  const item = await prisma.shopItem.findUnique({ where: { slug } });
  if (!item) return NextResponse.json({ active: false });

  const purchase = await prisma.purchase.findFirst({
    where: {
      userId: user.id,
      itemId: item.id,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

  return NextResponse.json({ active: !!purchase });
}
