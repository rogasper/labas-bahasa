import { db } from "@labas/db";
import { verification, user, account } from "@labas/db/schema/auth";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { eq, and, gt, sql } from "drizzle-orm";
import { z } from "zod";

import { sendOtpEmail } from "../lib/email";
import { autoRefillIfEligible } from "../lib/credit";
import { publicProcedure, router } from "../index";
import { checkRateLimit, checkOtpBudget } from "../lib/rate-limit";
import { validateTurnstileToken } from "../lib/turnstile";
import { isEmailBounceBlocked } from "../lib/bounce";
import { isDisposableEmail, hasValidMxRecord, getEmailDomain } from "../lib/email-validator";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MS = 5 * 60 * 1000;

function generateOtp(): string {
  return crypto.randomInt(10 ** (OTP_LENGTH - 1), 10 ** OTP_LENGTH - 1).toString();
}

function genericOtpResponse() {
  return { success: true, message: "If the email is registered, an OTP has been sent." };
}

async function rejectInvalidEmail(email: string): Promise<boolean> {
  const domain = getEmailDomain(email);
  if (!domain || isDisposableEmail(email) || !(await hasValidMxRecord(domain))) {
    return true;
  }
  return false;
}

export const verificationRouter = router({
  sendVerificationOtp: publicProcedure
    .input(z.object({ email: z.string().email(), turnstileToken: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const ip = ctx.ip ?? "unknown";
      // Non-strict so Redis failures don't block legitimate users
      await checkRateLimit({ key: `otp-send:email:${input.email}`, limit: 3, windowMs: 300_000 });
      await checkRateLimit({ key: `otp-send:ip:${ip}:verify`, limit: 8, windowMs: 900_000 });
      await validateTurnstileToken(input.turnstileToken);

      if (await rejectInvalidEmail(input.email)) {
        return genericOtpResponse();
      }

      const [existingUser] = await db
        .select({ id: user.id, emailVerified: user.emailVerified, suspended: user.suspended })
        .from(user)
        .where(eq(user.email, input.email))
        .limit(1);

      if (!existingUser || existingUser.emailVerified || existingUser.suspended) {
        return genericOtpResponse();
      }

      if (await isEmailBounceBlocked(input.email)) {
        return genericOtpResponse();
      }

      await checkOtpBudget(input.email);

      const otp = generateOtp();
      const identifier = `email-verification:${input.email}`;

      await db.delete(verification).where(eq(verification.identifier, identifier));

      await db.insert(verification).values({
        id: crypto.randomUUID(),
        identifier,
        value: otp,
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
      });

      await sendOtpEmail({ to: input.email, otp, type: "email-verification" });

      return genericOtpResponse();
    }),

  verifyEmailOtp: publicProcedure
    .input(z.object({ email: z.string().email(), otp: z.string().length(6) }))
    .mutation(async ({ input, ctx }) => {
      const ip = ctx.ip ?? "unknown";
      await checkRateLimit({ key: `otp-verify:email:${input.email}`, limit: 10, windowMs: 300_000, strict: true });
      await checkRateLimit({ key: `otp-verify:ip:${ip}`, limit: 30, windowMs: 300_000, strict: true });

      const identifier = `email-verification:${input.email}`;
      const [record] = await db
        .select()
        .from(verification)
        .where(
          and(
            eq(verification.identifier, identifier),
            eq(verification.value, input.otp),
            gt(verification.expiresAt, sql`now()`),
          ),
        )
        .limit(1);

      if (!record) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired OTP" });
      }

      await db
        .update(user)
        .set({ emailVerified: true })
        .where(eq(user.email, input.email));

      await db.delete(verification).where(eq(verification.id, record.id));

      const [verifiedUser] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, input.email))
        .limit(1);

      if (verifiedUser) {
        await autoRefillIfEligible(verifiedUser.id);
      }

      return { success: true };
    }),

  sendPasswordResetOtp: publicProcedure
    .input(z.object({ email: z.string().email(), turnstileToken: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const ip = ctx.ip ?? "unknown";
      // Non-strict so Redis failures don't block legitimate users
      await checkRateLimit({ key: `otp-send:email:${input.email}`, limit: 3, windowMs: 300_000 });
      await checkRateLimit({ key: `otp-send:ip:${ip}:reset`, limit: 8, windowMs: 900_000 });
      await validateTurnstileToken(input.turnstileToken);

      if (await rejectInvalidEmail(input.email)) {
        return genericOtpResponse();
      }

      const [existingUser] = await db
        .select({ id: user.id, suspended: user.suspended })
        .from(user)
        .where(eq(user.email, input.email))
        .limit(1);

      if (!existingUser || existingUser.suspended) {
        return genericOtpResponse();
      }

      if (await isEmailBounceBlocked(input.email)) {
        return genericOtpResponse();
      }

      await checkOtpBudget(input.email);

      const otp = generateOtp();
      const identifier = `forget-password:${input.email}`;

      await db.delete(verification).where(eq(verification.identifier, identifier));

      await db.insert(verification).values({
        id: crypto.randomUUID(),
        identifier,
        value: otp,
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
      });

      await sendOtpEmail({ to: input.email, otp, type: "forget-password" });

      return genericOtpResponse();
    }),

  resetPassword: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        otp: z.string().length(6),
        newPassword: z.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, "Password must be at least 8 characters with uppercase, lowercase, and number"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const ip = ctx.ip ?? "unknown";
      await checkRateLimit({ key: `otp-reset:email:${input.email}`, limit: 5, windowMs: 300_000, strict: true });
      await checkRateLimit({ key: `otp-reset:ip:${ip}`, limit: 15, windowMs: 300_000, strict: true });

      const identifier = `forget-password:${input.email}`;
      const [record] = await db
        .select()
        .from(verification)
        .where(
          and(
            eq(verification.identifier, identifier),
            eq(verification.value, input.otp),
            gt(verification.expiresAt, sql`now()`),
          ),
        )
        .limit(1);

      if (!record) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired OTP" });
      }

      const passwordHash = await bcrypt.hash(input.newPassword, 10);

      const [userRecord] = await db
        .select({ id: user.id, name: user.name })
        .from(user)
        .where(eq(user.email, input.email))
        .limit(1);

      if (!userRecord) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      await db
        .update(account)
        .set({ password: passwordHash })
        .where(
          and(eq(account.providerId, "credential"), eq(account.userId, userRecord.id)),
        );

      await db.delete(verification).where(eq(verification.id, record.id));

      return { success: true };
    }),
});
