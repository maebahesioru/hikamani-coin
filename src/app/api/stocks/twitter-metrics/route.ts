import { prisma } from "@/lib/prisma";
import { getUserMomentum, getTwitterProfile } from "@/lib/twitter";
import { ok } from "@/lib/api-utils";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const stockId = req.nextUrl.searchParams.get("stockId");
  const screenName = req.nextUrl.searchParams.get("screenName");

  if (screenName) {
    const [metrics, profile] = await Promise.all([
      getUserMomentum(screenName),
      getTwitterProfile(screenName),
    ]);
    return ok({ metrics, profile });
  }

  if (stockId) {
    const stock = await prisma.stock.findUnique({ where: { id: stockId } });
    if (!stock) return ok({ error: "not found" });
    const metrics = await getUserMomentum(stock.name);
    return ok({ stockId, name: stock.name, metrics });
  }

  // All stocks
  const stocks = await prisma.stock.findMany();
  const results = await Promise.all(
    stocks.map(async (s) => {
      const metrics = await getUserMomentum(s.name);
      return { stockId: s.id, name: s.name, metrics };
    })
  );
  return ok(results);
}
