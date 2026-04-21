import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/api-utils";
import { readFileSync } from "fs";
import { join } from "path";

const MARKET_TEMPLATES = [
  { question: (h: string) => `${h}は今週名前を変更するか？`, category: "name_change" },
  { question: (h: string) => `${h}は今週アイコンを変更するか？`, category: "icon_change" },
  { question: (h: string) => `${h}は今週bioを変更するか？`, category: "profile_change" },
  { question: (h: string) => `${h}は今週鍵垢になるか？`, category: "lock_change" },
  { question: (h: string) => `${h}は今週ツイート数が100を超えるか？`, category: "tweet_momentum" },
  { question: (h: string) => `${h}は今週フォロワーが増加するか？`, category: "tweet_momentum" },
  { question: (h: string) => `${h}は今週凍結されるか？`, category: "name_change" },
];

export async function POST() {
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
