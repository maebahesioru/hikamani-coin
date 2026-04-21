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

  const { content, imageUrl, linkUrl, type } = await req.json() as {
    content: string;
    imageUrl?: string;
    linkUrl?: string;
    type: "ALL_SITES" | "SINGLE_SITE";
  };

  if (!content) return badRequest("広告テキストを入力してください");

  // Check purchase
  const slug = type === "ALL_SITES" ? "ad-all-24h" : "ad-single-24h";
  const cost = type === "ALL_SITES" ? 2000n : 500n;

  const result = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId: user.id } });
    if (!wallet || wallet.balance < cost) throw new Error("残高不足");

    await tx.wallet.update({ where: { userId: user.id }, data: { balance: { decrement: cost } } });
    await tx.transaction.create({
      data: { type: "PURCHASE", amount: cost, senderId: user.id, memo: `広告掲載: ${type}` },
    });

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return tx.ad.create({
      data: { userId: user.id, type, content, imageUrl, linkUrl, expiresAt },
    });
  });

  return ok({ adId: result.id, expiresAt: result.expiresAt });
}
