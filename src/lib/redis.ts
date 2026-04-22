import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis: Redis | null };

function createRedis() {
  const client = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: 3,
  });
  client.on("error", () => {}); // suppress unhandled error
  return client;
}

export const redis = globalForRedis.redis ?? createRedis();

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;
