import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const stocks = [
  { name: "Hikakin_Finder", description: "ヒカキン発見bot" },
  { name: "maebahesioru2", description: "まえばへしおる" },
  { name: "awks_mania", description: "awks_mania" },
  { name: "msk_mania", description: "msk_mania" },
  { name: "MGC_UNEI", description: "MGC運営" },
];

const markets = [
  { question: "Hikakin_Finderは今週名前を変更するか？", category: "name_change", stockName: "Hikakin_Finder" },
  { question: "maebahesioru2は今週アイコンを変更するか？", category: "icon_change", stockName: "maebahesioru2" },
  { question: "awks_maniaは今週鍵垢になるか？", category: "lock_change", stockName: "awks_mania" },
  { question: "MGC_UNEIは今週bioを変更するか？", category: "profile_change", stockName: "MGC_UNEI" },
  { question: "msk_maniaは今週フォロワー1000人を突破するか？", category: "tweet_momentum", stockName: "msk_mania" },
];

async function main() {
  // Seed stocks
  for (const s of stocks) {
    await prisma.stock.upsert({
      where: { name: s.name },
      update: {},
      create: { name: s.name, description: s.description, currentPrice: 1000n },
    });
  }
  console.log(`Seeded ${stocks.length} stocks`);

  // Seed bet markets
  for (const m of markets) {
    const stock = await prisma.stock.findUnique({ where: { name: m.stockName } });
    const existing = await prisma.betMarket.findFirst({ where: { question: m.question } });
    if (!existing) {
      await prisma.betMarket.create({
        data: {
          stockId: stock?.id,
          question: m.question,
          category: m.category,
          endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }
  console.log(`Seeded ${markets.length} bet markets`);
}

main().then(() => prisma.$disconnect());
