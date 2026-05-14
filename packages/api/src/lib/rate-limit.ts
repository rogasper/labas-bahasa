import IORedis from "ioredis";
import { env } from "@labas/env/server";
import { TRPCError } from "@trpc/server";

let redis: IORedis | null = null;

function getRedis(): IORedis {
  if (!redis) {
    redis = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: 3, enableOfflineQueue: false });
  }
  return redis;
}

const SCRIPT = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

-- Remove expired entries
redis.call("ZREMRANGEBYSCORE", key, 0, now - window_ms)

-- Count current entries
local count = redis.call("ZCARD", key)

if count >= limit then
  return 0
end

-- Add current request
redis.call("ZADD", key, now, now .. "-" .. math.random())
redis.call("PEXPIRE", key, window_ms)

return 1
`;

export interface RateLimitConfig {
  key: string;
  limit: number;
  windowMs: number;
}

export async function checkRateLimit(config: RateLimitConfig): Promise<void> {
  const r = getRedis();
  const key = `ratelimit:${config.key}`;
  const now = Date.now();

  try {
    const allowed = await r.eval(SCRIPT, 1, key, config.limit.toString(), config.windowMs.toString(), now.toString());
    if (allowed === 0) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Too many requests. Please try again later.",
      });
    }
  } catch (err) {
    if (err instanceof TRPCError) throw err;
    // If Redis is down, fail open (log warning, don't block traffic)
    // eslint-disable-next-line no-console
    console.warn("[RATELIMIT] Redis unavailable, rate limit skipped:", (err as Error).message);
  }
}

export async function checkDailyBudget(key: string, limit: number): Promise<boolean> {
  const r = getRedis();
  const now = new Date();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const ttlMs = endOfDay.getTime() - now.getTime();

  try {
    const current = await r.incrby(`budget:daily:${key}`, 0);
    if (current > limit) return false;

    await r.incr(`budget:daily:${key}`);
    await r.pexpire(`budget:daily:${key}`, ttlMs);
    return true;
  } catch {
    // Fail open
    return true;
  }
}
