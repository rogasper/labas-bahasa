import { TRPCError } from "@trpc/server";
import { env } from "@labas/env/server";
import { logger } from "@labas/api/logger";

export async function validateTurnstileToken(token: string | undefined): Promise<void> {
  if (env.TURNSTILE_DISABLED) return;

  const secretKey = env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
  const isDev = env.NODE_ENV !== "production";

  if (isDev && !secretKey) return;

  if (!secretKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "CAPTCHA is not configured. Set CLOUDFLARE_TURNSTILE_SECRET_KEY.",
    });
  }

  if (!token) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "CAPTCHA verification is required." });
  }

  let res: Response;
  try {
    res = await fetch("https://challenges.cloudflare.com/turnstile/v1/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: secretKey, response: token }),
    });
  } catch (err) {
    logger.error("[TURNSTILE] Network request to Cloudflare failed", { error: (err as Error).message });
    if (isDev) return;
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "CAPTCHA verification service temporarily unavailable.",
    });
  }

  const text = await res.text();

  let data: { success: boolean; "error-codes"?: string[] };
  try {
    data = JSON.parse(text);
  } catch {
    logger.error("[TURNSTILE] Cloudflare returned invalid JSON", {
      status: res.status,
      body: text.slice(0, 500),
    });
    if (isDev) return;
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "CAPTCHA verification failed. Please try again.",
    });
  }

  if (!data.success) {
    logger.warn("[TURNSTILE] Token verification failed", { errorCodes: data["error-codes"] });
    throw new TRPCError({ code: "BAD_REQUEST", message: "CAPTCHA verification failed. Please try again." });
  }
}
