import { redis } from "@/lib/redis";
import { HKM_PER_JPY } from "@/lib/constants";

const CACHE_KEY = "ltc_jpy_rate";
const CACHE_TTL = 60; // 60 seconds

export async function getLtcJpyRate(): Promise<number> {
  const cached = await redis.get(CACHE_KEY);
  if (cached) return parseFloat(cached);

  const res = await fetch(
    process.env.LTC_RATE_API || "https://api.coingecko.com/api/v3/simple/price?ids=litecoin&vs_currencies=jpy",
    { next: { revalidate: 60 } }
  );
  const data = await res.json();
  const rate = data.litecoin.jpy as number;
  await redis.setex(CACHE_KEY, CACHE_TTL, rate.toString());
  return rate;
}

export function ltcToHkm(ltcAmount: number, jpyRate: number): bigint {
  const jpy = ltcAmount * jpyRate;
  return BigInt(Math.floor(jpy)) * HKM_PER_JPY;
}
