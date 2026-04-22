import { redis } from "@/lib/redis";
import { NextResponse } from "next/server";

// GET /api/sites - ad.jsを導入している全サイト一覧
export async function GET() {
  try {
    const sites = await redis.smembers("ad_sites");
    return NextResponse.json(sites.sort());
  } catch {
    return NextResponse.json([]);
  }
}
