import { prisma } from "@/lib/prisma";
import { getUserMomentum } from "@/lib/twitter";
import { ok } from "@/lib/api-utils";
import { redis } from "@/lib/redis";

export async function POST() {
  const stocks = await prisma.stock.findMany();
  const results = [];

  for (const stock of stocks) {
    const metrics = await getUserMomentum(stock.name);

    // Get previous momentum from Redis
    const prevKey = `stock:momentum:${stock.id}`;
    let prevMomentum = 0;
    try {
      const cached = await redis.get(prevKey);
      if (cached) prevMomentum = parseFloat(cached);
    } catch { /* redis unavailable */ }

    // Calculate price change based on momentum delta
    const momentumDelta = prevMomentum > 0
      ? (metrics.momentum - prevMomentum) / prevMomentum
      : 0;

    // Price changes: -10% to +15% based on momentum, with some randomness
    const randomFactor = (Math.random() - 0.45) * 0.02; // slight upward bias
    const changeRate = Math.max(-0.10, Math.min(0.15, momentumDelta * 0.5 + randomFactor));
    const oldPrice = Number(stock.currentPrice);
    const newPrice = BigInt(Math.max(100, Math.round(oldPrice * (1 + changeRate))));

    await prisma.$transaction([
      prisma.stock.update({ where: { id: stock.id }, data: { currentPrice: newPrice } }),
      prisma.stockPrice.create({ data: { stockId: stock.id, price: newPrice } }),
    ]);

    // Cache current momentum
    try { await redis.setex(prevKey, 3600, metrics.momentum.toString()); } catch { /* ok */ }

    results.push({
      name: stock.name,
      oldPrice: oldPrice.toString(),
      newPrice: newPrice.toString(),
      changeRate: `${(changeRate * 100).toFixed(2)}%`,
      momentum: metrics.momentum,
    });
  }

  return ok(results);
}
