import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, badRequest, ok } from "@/lib/api-utils";
import { NextRequest } from "next/server";

// POST: スポンサー情報を更新（購入後に呼ぶ）
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { displayName, avatarUrl, linkUrl } = await req.json() as {
    displayName?: string;
    avatarUrl?: string;
    linkUrl?: string;
  };

  // Check active sponsor purchase
  const purchase = await prisma.purchase.findFirst({
    where: {
      userId: user.id,
      item: { slug: { in: ["sponsor-30d", "sponsor-forever", "sponsor-big-forever"] } },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });
  if (!purchase) return badRequest("有効なスポンサープランが見つかりません");

  // Update user profile for sponsor display
  await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(displayName ? { displayName } : {}),
      ...(avatarUrl ? { avatar: avatarUrl } : {}),
    },
  });

  return ok({ message: "スポンサー情報を更新しました" });
}
