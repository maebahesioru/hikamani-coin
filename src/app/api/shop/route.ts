import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, badRequest, ok } from "@/lib/api-utils";
import { NextRequest } from "next/server";

// GET: ショップアイテム一覧
export async function GET() {
  const items = await prisma.shopItem.findMany({ where: { active: true }, orderBy: { category: "asc" } });
  return ok(items.map((i) => ({ ...i, price: i.price.toString() })));
}

// POST: 購入
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { itemSlug } = (await req.json()) as { itemSlug: string };
  const item = await prisma.shopItem.findUnique({ where: { slug: itemSlug } });
  if (!item || !item.active) return badRequest("アイテムが見つかりません");

  const result = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId: user.id } });
    if (!wallet || wallet.balance < item.price) throw new Error("残高不足");

    await tx.wallet.update({ where: { userId: user.id }, data: { balance: { decrement: item.price } } });

    // Fee to admin
    const adminId = process.env.ADMIN_USER_ID;
    if (adminId) {
      await tx.wallet.upsert({
        where: { userId: adminId },
        update: { balance: { increment: item.price } },
        create: { userId: adminId, balance: item.price },
      });
    }

    const expiresAt = item.recurring ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;

    await tx.transaction.create({
      data: { type: "PURCHASE", amount: item.price, senderId: user.id, memo: item.name },
    });

    return tx.purchase.create({
      data: { userId: user.id, itemId: item.id, amount: item.price, expiresAt },
    });
  });

  // TwiGacha連携: ガチャアイテムの場合はTwiGachaのAPIを叩く
  let twigachaCards = null;
  if (itemSlug === "twigacha-5pack" || itemSlug === "twigacha-ssr") {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { linkedAccounts: { where: { provider: "DISCORD" } } },
    });
    const discordId = dbUser?.linkedAccounts[0]?.providerId;
    if (discordId && process.env.TWIGACHA_URL) {
      try {
        const res = await fetch(`${process.env.TWIGACHA_URL}/api/gacha/hkm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ discordId, type: itemSlug === "twigacha-ssr" ? "ssr" : "normal" }),
        });
        if (res.ok) twigachaCards = await res.json();
      } catch { /* TwiGacha unavailable */ }
    }
  }

  // 特別アイテム購入時にDiscord Webhook通知
  const SPECIAL_SLUGS = ["naming-rights", "twitter-repost", "face-voice", "twitter-followback"];
  if (SPECIAL_SLUGS.includes(itemSlug)) {
    const webhookUrl = process.env.DISCORD_ADMIN_WEBHOOK;
    if (webhookUrl) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { linkedAccounts: true },
      });
      const discordId = dbUser?.linkedAccounts.find(a => a.provider === "DISCORD")?.providerId;
      const twitterId = dbUser?.linkedAccounts.find(a => a.provider === "TWITTER")?.providerId;
      const googleId = dbUser?.linkedAccounts.find(a => a.provider === "GOOGLE")?.providerId;
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [{
            title: `🛒 特別アイテム購入`,
            color: 0xF59E0B,
            fields: [
              { name: "アイテム", value: item.name, inline: true },
              { name: "価格", value: `${item.price.toString()} HKM`, inline: true },
              { name: "ユーザー", value: dbUser?.displayName || dbUser?.username || user.id, inline: true },
              { name: "ユーザーID", value: user.id, inline: true },
              ...(dbUser?.email ? [{ name: "メール", value: dbUser.email, inline: true }] : []),
              ...(discordId ? [{ name: "Discord", value: `<@${discordId}>`, inline: true }] : []),
              ...(twitterId ? [{ name: "Twitter ID", value: twitterId, inline: true }] : []),
              ...(googleId ? [{ name: "Google ID", value: googleId, inline: true }] : []),
              { name: "連携済み", value: dbUser?.linkedAccounts.map(a => a.provider).join(", ") || "なし", inline: true },
              { name: "購入ID", value: result.id, inline: false },
            ],
          }],
        }),
      }).catch(() => {});
    }
  }

  return ok({ purchaseId: result.id, twigachaCards });
}
