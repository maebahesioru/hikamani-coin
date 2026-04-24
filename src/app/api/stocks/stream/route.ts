import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get("ids");
  const ids = idsParam ? idsParam.split(",").filter(Boolean) : null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        try { controller.enqueue(`data: ${JSON.stringify(data)}\n\n`); } catch {}
      };

      const fetchStocks = () => prisma.stock.findMany({
        where: ids ? { id: { in: ids } } : undefined,
        select: { id: true, name: true, currentPrice: true },
        orderBy: { currentPrice: "desc" },
        take: ids ? undefined : 50,
      });

      const stocks = await fetchStocks();
      send({ type: "init", stocks: stocks.map(s => ({ ...s, currentPrice: s.currentPrice.toString() })) });

      let prev = new Map(stocks.map(s => [s.id, s.currentPrice]));
      const interval = setInterval(async () => {
        try {
          const updated = await fetchStocks();
          const changes = updated.filter(s => prev.get(s.id) !== s.currentPrice);
          if (changes.length > 0) {
            send({ type: "update", stocks: changes.map(s => ({ ...s, currentPrice: s.currentPrice.toString() })) });
            changes.forEach(s => prev.set(s.id, s.currentPrice));
          }
        } catch {
          clearInterval(interval);
          controller.close();
        }
      }, 5000);

      return () => clearInterval(interval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
