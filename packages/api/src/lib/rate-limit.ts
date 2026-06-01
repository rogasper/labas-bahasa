import IORedis from "ioredis";
import { env } from "@labas/env/server";
import { TRPCError } from "@trpc/server";
import { logger } from "@labas/api/logger";

let redis: IORedis | null = null;

export function getRedis(): IORedis {
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
  /** When true, throw a 503 if Redis is unavailable instead of silently skipping. */
  strict?: boolean;
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
    if (config.strict) {
      logger.error("[RATELIMIT] Redis unavailable, rejecting request (strict mode)", { error: (err as Error).message });
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Service temporarily unavailable. Please try again.",
      });
    }
    logger.warn("[RATELIMIT] Redis unavailable, rate limit skipped", { error: (err as Error).message });
  }
}

/**
 * Returns true if the request is allowed, false if rate-limited.
 * Used by non-tRPC contexts (e.g. Hono middleware) where throwing TRPCError is not appropriate.
 * Fails open (returns true) when Redis is unavailable unless `strict` is set.
 */
export async function checkRateLimitAllowed(config: RateLimitConfig): Promise<boolean> {
  const r = getRedis();
  const key = `ratelimit:${config.key}`;
  const now = Date.now();
  try {
    const allowed = await r.eval(SCRIPT, 1, key, config.limit.toString(), config.windowMs.toString(), now.toString());
    return allowed !== 0;
  } catch (err) {
    if (config.strict) {
      logger.error("[RATELIMIT] Redis unavailable (strict mode)", { error: (err as Error).message });
      return false;
    }
    logger.warn("[RATELIMIT] Redis unavailable, rate limit skipped", { error: (err as Error).message });
    return true;
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

const OTP_BUDGET_MAX = 10;
const OTP_BUDGET_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function checkOtpBudget(email: string): Promise<void> {
  const r = getRedis();
  const key = `otp:budget:${email}`;

  try {
    const count = await r.incr(key);
    if (count === 1) {
      await r.pexpire(key, OTP_BUDGET_TTL_MS);
    }
    if (count > OTP_BUDGET_MAX) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Too many verification attempts. Try again later.",
      });
    }
  } catch (err) {
    if (err instanceof TRPCError) throw err;
    logger.warn("[OTP_BUDGET] Redis unavailable, budget check skipped", { error: (err as Error).message });
  }
}
