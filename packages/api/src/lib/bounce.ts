import { db } from "@labas/db";
import { emailBounceLog, user } from "@labas/db";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";
import { getRedis } from "./rate-limit";
import { logger } from "@labas/api/logger";

const BOUNCE_THRESHOLD = 3;
const BOUNCE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export async function recordBounce(email: string, reason?: string): Promise<void> {
  await db.insert(emailBounceLog).values({
    id: crypto.randomUUID(),
    email,
    reason: reason ?? null,
  });

  const r = getRedis();
  const countKey = `bounce:count:${email}`;

  try {
    const count = await r.incr(countKey);
    await r.pexpire(countKey, BOUNCE_COOLDOWN_MS);

    if (count >= BOUNCE_THRESHOLD) {
      logger.warn("[BOUNCE] Auto-suspending users with bouncing email", { email, bounceCount: count });

      const users = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
      for (const u of users) {
        await db.update(user).set({ suspended: true }).where(eq(user.id, u.id));
      }

      await r.setex(`bounce:block:${email}`, BOUNCE_COOLDOWN_MS / 1000, "1");
    }
  } catch (err) {
    logger.error("[BOUNCE] Redis unavailable", { error: (err as Error).message });
  }
}

export async function isEmailBounceBlocked(email: string): Promise<boolean> {
  const r = getRedis();
  try {
    const blocked = await r.get(`bounce:block:${email}`);
    return blocked === "1";
  } catch {
    return false;
  }
}
