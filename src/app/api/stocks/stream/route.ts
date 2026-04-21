import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
      };

      // Send initial prices
      const stocks = await prisma.stock.findMany({
        select: { id: true, name: true, currentPrice: true },
        orderBy: { currentPrice: "desc" },
        take: 50,
      });
      send({ type: "init", stocks: stocks.map(s => ({ ...s, currentPrice: s.currentPrice.toString() })) });

      // Poll every 5 seconds for price changes
      let prev = new Map(stocks.map(s => [s.id, s.currentPrice]));
      const interval = setInterval(async () => {
        try {
          const updated = await prisma.stock.findMany({
            select: { id: true, name: true, currentPrice: true },
            orderBy: { currentPrice: "desc" },
            take: 50,
          });
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

      // Cleanup on disconnect
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
