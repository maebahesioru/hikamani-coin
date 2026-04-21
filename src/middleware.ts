import { NextRequest, NextResponse } from "next/server";

// Rate limits per minute
const LIMITS: Record<string, number> = {
  "/api/external": 60,
  "/api/checkout": 10,
  "/api/wallet/transfer": 10,
  "/api/stocks": 30,
  "/api/bets": 30,
  "/api/bonus": 5,
  "/api/shop": 20,
  "/api/sponsors": 60,
  "/ad.js": 120,
};

function getLimit(pathname: string): number {
  for (const [prefix, limit] of Object.entries(LIMITS)) {
    if (pathname.startsWith(prefix)) return limit;
  }
  return 100; // default
}

function getClientId(req: NextRequest): string {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey) return `apikey:${apiKey}`;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
  return `ip:${ip}`;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only rate limit API routes
  if (!pathname.startsWith("/api/") && pathname !== "/ad.js") {
    return NextResponse.next();
  }

  const limit = getLimit(pathname);
  const clientId = getClientId(req);
  const key = `ratelimit:${clientId}:${pathname.split("/").slice(0, 3).join("/")}`;

  // Use edge-compatible in-memory fallback (Redis not available in middleware)
  // Simple sliding window using response headers
  const now = Math.floor(Date.now() / 60000); // minute bucket
  const countKey = `${key}:${now}`;

  // Use Cloudflare KV or just pass through with headers for now
  // Real rate limiting is done at the API level via Redis
  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", String(limit));
  response.headers.set("X-RateLimit-Window", "60s");
  return response;
}

export const config = {
  matcher: ["/api/:path*", "/ad.js"],
};
