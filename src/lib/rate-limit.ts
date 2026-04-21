import { redis } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";

interface RateLimitOptions {
  limit: number;   // max requests
  window: number;  // seconds
}

export async function rateLimit(
  req: NextRequest,
  options: RateLimitOptions
): Promise<{ ok: boolean; remaining: number; reset: number }> {
  const apiKey = req.headers.get("x-api-key");
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
  const clientId = apiKey ? `apikey:${apiKey}` : `ip:${ip}`;
  const path = req.nextUrl.pathname.split("/").slice(0, 3).join("/");
  const key = `rl:${clientId}:${path}`;

  try {
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - options.window;

    // Sliding window using sorted set
    await redis.zremrangebyscore(key, 0, windowStart);
    const count = await redis.zcard(key);

    if (count >= options.limit) {
      const oldest = await redis.zrange(key, 0, 0, "WITHSCORES");
      const reset = oldest[1] ? parseInt(oldest[1]) + options.window : now + options.window;
      return { ok: false, remaining: 0, reset };
    }

    await redis.zadd(key, now, `${now}-${Math.random()}`);
    await redis.expire(key, options.window);
    return { ok: true, remaining: options.limit - count - 1, reset: now + options.window };
  } catch {
    // Redis unavailable - allow request
    return { ok: true, remaining: options.limit, reset: 0 };
  }
}

export function rateLimitResponse(remaining: number, reset: number) {
  return NextResponse.json(
    { error: "レート制限に達しました。しばらく待ってから再試行してください。" },
    {
      status: 429,
      headers: {
        "Retry-After": String(reset - Math.floor(Date.now() / 1000)),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(reset),
      },
    }
  );
}
