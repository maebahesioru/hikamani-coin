import { prisma } from "@/lib/prisma";
import { fetchFxProfile } from "@/lib/twitter";
import { redis } from "@/lib/redis";
import { ok } from "@/lib/api-utils";
import { NextRequest } from "next/server";

// POST /api/stocks/cache-profiles
// Fetches FXTwitter profiles for stocks that have no cached profile
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const handles: string[] = body.handles || [];

  // If no handles specified, fetch for stocks with active bet markets
  let targets = handles;
  if (targets.length === 0) {
    const markets = await prisma.betMarket.findMany({
      where: { resolved: false, endsAt: { gt: new Date() } },
      include: { stock: true },
    });
    targets = [...new Set(markets.map((m) => m.stock?.name).filter(Boolean) as string[])];
  }

  const results: Record<string, boolean> = {};
  for (const handle of targets.slice(0, 20)) { // max 20 at once
    try {
      const profile = await fetchFxProfile(handle);
      if (profile) {
        await redis.setex(`profile:${handle}`, 86400, JSON.stringify(profile));
        results[handle] = true;
      } else {
        results[handle] = false;
      }
    } catch (e) {
      console.error(`[cache-profiles] ${handle}:`, e);
      results[handle] = false;
    }
    await new Promise((r) => setTimeout(r, 500)); // rate limit
  }

  return ok({ cached: results });
}
