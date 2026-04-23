import { prisma } from "@/lib/prisma";
import { fetchFxProfile } from "@/lib/twitter";
import { redis } from "@/lib/redis";
import { ok } from "@/lib/api-utils";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  const isAdmin = (await import("@/lib/api-utils").then(m => m.getAuthUser()))?.id === process.env.ADMIN_USER_ID;
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET && !isAdmin) {
    return new Response("Unauthorized", { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  let targets: string[] = body.handles || [];

  if (targets.length === 0) {
    const markets = await prisma.betMarket.findMany({
      where: { resolved: false, endsAt: { gt: new Date() } },
      include: { stock: true },
    });
    targets = [...new Set(markets.map((m) => m.stock?.name).filter(Boolean) as string[])];
  }

  const entries = await Promise.all(
    targets.map(async (handle) => {
      try {
        const profile = await fetchFxProfile(handle);
        if (profile) {
          await redis.setex(`profile:${handle}`, 86400, JSON.stringify(profile));
          return [handle, true];
        }
      } catch {}
      return [handle, false];
    })
  );

  return ok({ cached: Object.fromEntries(entries) });
}
