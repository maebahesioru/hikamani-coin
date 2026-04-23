import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, ok } from "@/lib/api-utils";
import { readFileSync } from "fs";
import { join } from "path";

const MARKET_TEMPLATES = [
  // プロフィール変化系
  { question: (h: string) => `${h}は今週名前を変更するか？`, category: "name_change" },
  { question: (h: string) => `${h}は今週アイコンを変更するか？`, category: "icon_change" },
  { question: (h: string) => `${h}は今週ヘッダー画像を変更するか？`, category: "profile_change" },
  { question: (h: string) => `${h}は今週bioを変更するか？`, category: "profile_change" },
  { question: (h: string) => `${h}は今週プロフィールURLを変更するか？`, category: "profile_change" },
  { question: (h: string) => `${h}は今週場所情報を変更するか？`, category: "profile_change" },
  { question: (h: string) => `${h}は今週ユーザーID(@)を変更するか？`, category: "name_change" },
  // アカウント状態系
  { question: (h: string) => `${h}は今週鍵垢になるか？`, category: "lock_change" },
  { question: (h: string) => `${h}は今週凍結されるか？`, category: "name_change" },
  { question: (h: string) => `${h}は今週認証バッジを取得するか？`, category: "profile_change" },
  { question: (h: string) => `${h}は今週認証バッジを失うか？`, category: "profile_change" },
  // フォロワー系
  { question: (h: string) => `${h}は今週フォロワーが増加するか？`, category: "tweet_momentum" },
  { question: (h: string) => `${h}は今週フォロワーが100人以上増えるか？`, category: "tweet_momentum" },
  { question: (h: string) => `${h}は今週フォロワーが減少するか？`, category: "tweet_momentum" },
  { question: (h: string) => `${h}は今週フォロー数が増加するか？`, category: "tweet_momentum" },
  // ツイート活動系
  { question: (h: string) => `${h}は今週ツイート数が50を超えるか？`, category: "tweet_momentum" },
  { question: (h: string) => `${h}は今週ツイート数が100を超えるか？`, category: "tweet_momentum" },
  { question: (h: string) => `${h}は今週いいね数が増加するか？`, category: "tweet_momentum" },
  { question: (h: string) => `${h}は今週画像付きツイートをするか？`, category: "tweet_momentum" },
  { question: (h: string) => `${h}は今週動画ツイートをするか？`, category: "tweet_momentum" },
  { question: (h: string) => `${h}は今週深夜(0-5時)にツイートするか？`, category: "tweet_momentum" },
  { question: (h: string) => `${h}は今週センシティブなツイートをするか？`, category: "tweet_momentum" },
  { question: (h: string) => `${h}は今週ハッシュタグ付きツイートをするか？`, category: "tweet_momentum" },
  { question: (h: string) => `${h}は今週他のヒカマーにメンションするか？`, category: "tweet_momentum" },
  // 特別イベント系
  { question: (h: string) => `${h}は今週スペース(音声配信)を開くか？`, category: "tweet_momentum" },
  { question: (h: string) => `${h}は今週引用RTが10件以上されるか？`, category: "tweet_momentum" },
  { question: (h: string) => `${h}は今週バズツイート(いいね100以上)をするか？`, category: "tweet_momentum" },
];

export async function POST() {
  const user = await getAuthUser();
  if (!user || user.id !== process.env.ADMIN_USER_ID) return unauthorized();
  const txt = readFileSync(join(process.cwd(), "public", "handle.txt"), "utf-8");
  const handles = txt.split("\n").map(l => l.trim()).filter(Boolean);

  const endsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  let created = 0;

  // Process in batches of 50
  for (let i = 0; i < handles.length; i += 50) {
    const batch = handles.slice(i, i + 50);
    await Promise.all(batch.map(async (handle) => {
      const stock = await prisma.stock.findUnique({ where: { name: handle } });
      if (!stock) return;

      for (const tmpl of MARKET_TEMPLATES) {
        const question = tmpl.question(handle);
        const existing = await prisma.betMarket.findFirst({
          where: { question, resolved: false, endsAt: { gt: new Date() } },
        });
        if (!existing) {
          await prisma.betMarket.create({
            data: { stockId: stock.id, question, category: tmpl.category, endsAt },
          });
          created++;
        }
      }
    }));
  }

  return ok({ created, handles: handles.length });
}
