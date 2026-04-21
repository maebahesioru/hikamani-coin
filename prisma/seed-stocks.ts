import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFileSync } from "fs";
import { join } from "path";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Seed all handles from handle.txt
  const txt = readFileSync(join(process.cwd(), "public", "handle.txt"), "utf-8");
  const handles = txt.split("\n").map((l) => l.trim()).filter(Boolean);
  let n = 0;
  for (let i = 0; i < handles.length; i += 50) {
    const batch = handles.slice(i, i + 50);
    await Promise.all(batch.map((name) =>
      prisma.stock.upsert({ where: { name }, update: {}, create: { name, currentPrice: 1000n } })
    ));
    n += batch.length;
  }
  console.log(`Seeded ${n} stocks from handle.txt`);
}

main().then(() => prisma.$disconnect());
