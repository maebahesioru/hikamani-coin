import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, badRequest, ok } from "@/lib/api-utils";
import { NextRequest } from "next/server";

// GET: 自分の広告一覧
export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const ads = await prisma.ad.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return ok(ads);
}

// POST: 広告を投稿（ショップ購入後に呼ぶ）
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { content, imageUrl, linkUrl, type, targetSite, days: daysRaw, startsAt: startsAtRaw } = await req.json() as {
    content: string; imageUrl?: string; linkUrl?: string;
    type: string; targetSite?: string; days?: number; startsAt?: string;
  };

  if (!content) return badRequest("広告テキストを入力してください");
  const days = Math.max(1, Math.min(30, daysRaw || 1));
  const startsAt = startsAtRaw ? new Date(startsAtRaw) : new Date();

  const PRICES: Record<string, bigint> = {
    ALL_SITES: 2000n, SINGLE_SITE: 500n,
    POPUP: 3000n, POPUP_SINGLE: 800n,
    FIXED_BANNER: 1500n, FIXED_BANNER_SINGLE: 400n,
    FULLSCREEN: 5000n, FULLSCREEN_SINGLE: 1500n,
  };
  const cost = (PRICES[type] ?? 2000n) * BigInt(days);

  const result = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId: user.id } });
    if (!wallet || wallet.balance < cost) throw new Error("残高不足");

    await tx.wallet.update({ where: { userId: user.id }, data: { balance: { decrement: cost } } });
    await tx.transaction.create({
      data: { type: "PURCHASE", amount: cost, senderId: user.id, memo: `広告掲載: ${type}` },
    });

    const expiresAt = new Date(startsAt.getTime() + days * 24 * 60 * 60 * 1000);
    return tx.ad.create({
      data: { userId: user.id, type: type as never, content, imageUrl, linkUrl, targetSite, startsAt, expiresAt },
    });
  });

  return ok({ adId: result.id, expiresAt: result.expiresAt });
}
