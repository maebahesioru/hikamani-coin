import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, ok } from "@/lib/api-utils";

const shopItems = [
  { slug: "ad-hide-30d", name: "各サイト広告30日非表示", description: "広告を30日間非表示", price: 1500n, category: "広告", recurring: true },
  { slug: "ad-hide-forever", name: "各サイト広告永久非表示", description: "広告を永久に非表示", price: 15000n, category: "広告" },
  { slug: "discord-namecolor", name: "Discord名前色変更", description: "名前の色を変更", price: 1000n, category: "Discord", recurring: true },
  { slug: "discord-vip", name: "Discord VIPロール", description: "VIPロールを付与", price: 5000n, category: "Discord", recurring: true },
  { slug: "sponsor-30d", name: "ポータルスポンサー掲載30日", description: "ポータルサイトに30日間掲載", price: 3000n, category: "スポンサー" },
  { slug: "sponsor-forever", name: "ポータルスポンサー永久掲載", description: "ポータルサイトに永久掲載", price: 50000n, category: "スポンサー" },
  { slug: "sponsor-big-forever", name: "ポータル大型スポンサー永久掲載", description: "大型バナーで永久掲載", price: 150000n, category: "スポンサー" },
  { slug: "naming-rights", name: "新サイト・新機能の命名権", description: "命名権を獲得", price: 30000n, category: "特別" },
  { slug: "twitter-repost", name: "Twitterリポスト・宣伝権", description: "1回分", price: 2000n, category: "特別" },
  { slug: "face-voice", name: "顔写真orボイスメッセージ", description: "1個", price: 10000n, category: "特別" },
  { slug: "twitter-followback", name: "Twitter絶対フォロバ権", description: "フォロバ確約", price: 1500n, category: "特別" },
  { slug: "stock-short-unlock", name: "空売りポジションアンロック", description: "空売りが可能になる", price: 10000n, category: "ヒカマーズ株" },
  { slug: "stock-fee-discount", name: "株手数料0.5%割引", description: "手数料が半額になる", price: 1500n, category: "ヒカマーズ株", recurring: true },
];

export async function POST() {
  const user = await getAuthUser();
  if (!user || user.id !== process.env.ADMIN_USER_ID) return unauthorized();

  for (const item of shopItems) {
    await prisma.shopItem.upsert({
      where: { slug: item.slug },
      update: { name: item.name, description: item.description, price: item.price, category: item.category, recurring: item.recurring ?? false, active: true },
      create: { ...item, recurring: item.recurring ?? false, active: true },
    });
  }
  await prisma.shopItem.updateMany({
    where: { slug: { in: ["ad-all-24h", "ad-single-24h"] } },
    data: { active: false },
  });
  return ok({ seeded: shopItems.length });
}
