import { describe, it, expect, beforeAll, afterAll, mock } from "bun:test";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import * as schema from "../../../db/src/schema";
import { getTestPGlite, closeTestPGlite } from "./test-setup";

// ── Mocks (must be declared before dynamic imports) ──────────────────────────

mock.module("@labas/env/server", () => ({
  env: {
    DATABASE_URL: "postgres://localhost:5432/test",
    BETTER_AUTH_SECRET: "a".repeat(32),
    BETTER_AUTH_URL: "http://localhost:3000",
    CORS_ORIGIN: "http://localhost:5173",
    API_KEY_ENCRYPTION_KEY: "z".repeat(32),
    REDIS_URL: "redis://localhost:6379",
    SMTP_HOST: "localhost",
    SMTP_USER: "test",
    SMTP_PASS: "test",
    SMTP_FROM: "test@test.com",
    FREE_CREDITS_ENABLED: false,
    DEFAULT_SIGNUP_CREDIT_TOKENS: 50_000,
    // CLOUDFLARE_TURNSTILE_SECRET_KEY intentionally omitted — Turnstile disabled
  },
}));

const mockCheckRateLimit = mock(async () => {});
mock.module("../lib/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
  checkRateLimitAllowed: mock(async () => true),
  checkOtpBudget: mock(async () => {}),
  getRedis: mock(),
}));

const mockIsEmailBounceBlocked = mock(async () => false);
mock.module("../lib/bounce", () => ({
  isEmailBounceBlocked: mockIsEmailBounceBlocked,
  recordBounce: mock(async () => {}),
}));

const mockSendOtpEmail = mock(async (_opts: unknown) => {});
mock.module("../lib/email", () => ({
  sendOtpEmail: mockSendOtpEmail,
}));

mock.module("../lib/turnstile", () => ({
  validateTurnstileToken: mock(async () => {}),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

const TEST_IP = "203.0.113.42";
const EMAIL_UNVERIFIED = "unverified@example.com";
const EMAIL_VERIFIED = "verified@example.com";
const EMAIL_NONEXISTENT = "ghost@example.com";

describe("verification router", () => {
  let db: ReturnType<typeof drizzle>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let verificationRouter: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let caller: any;

  beforeAll(async () => {
    const pg = await getTestPGlite();
    db = drizzle(pg, { schema });

    mock.module("@labas/db", () => ({
      __esModule: true,
      ...schema,
      db,
    }));

    const mod = await import("../routers/verification");
    verificationRouter = mod.verificationRouter;
    caller = verificationRouter.createCaller({ session: null, auth: null, ip: TEST_IP });

    await db.insert(schema.user).values([
      { id: "v-user-1", name: "Unverified User", email: EMAIL_UNVERIFIED, emailVerified: false },
      { id: "v-user-2", name: "Verified User", email: EMAIL_VERIFIED, emailVerified: true },
    ]);

    // Seed account row so resetPassword can update the password hash
    await db.insert(schema.account).values({
      id: "v-account-1",
      accountId: "v-user-1",
      providerId: "credential",
      userId: "v-user-1",
      password: "hashed_old_password",
    });
  });

  afterAll(async () => {
    await closeTestPGlite();
  });

  // ── sendVerificationOtp ───────────────────────────────────────────────────

  describe("sendVerificationOtp", () => {
    it("sends email and returns generic success for unverified user", async () => {
      mockSendOtpEmail.mockClear();
      const result = await caller.sendVerificationOtp({ email: EMAIL_UNVERIFIED });
      expect(result.success).toBe(true);
      expect(mockSendOtpEmail).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const callArg = (mockSendOtpEmail.mock.calls[0] as any[])[0] as { to: string; type: string; otp: string };
      expect(callArg.to).toBe(EMAIL_UNVERIFIED);
      expect(callArg.type).toBe("email-verification");
      expect(callArg.otp).toMatch(/^\d{6}$/);
    });

    it("silently returns generic response for non-existent email (no enumeration)", async () => {
      mockSendOtpEmail.mockClear();
      const result = await caller.sendVerificationOtp({ email: EMAIL_NONEXISTENT });
      expect(result.success).toBe(true);
      expect(mockSendOtpEmail).not.toHaveBeenCalled();
    });

    it("silently returns generic response for already-verified email", async () => {
      mockSendOtpEmail.mockClear();
      const result = await caller.sendVerificationOtp({ email: EMAIL_VERIFIED });
      expect(result.success).toBe(true);
      expect(mockSendOtpEmail).not.toHaveBeenCalled();
    });

    it("checks per-email and per-IP rate limits with correct keys", async () => {
      mockCheckRateLimit.mockClear();
      await caller.sendVerificationOtp({ email: EMAIL_UNVERIFIED });
      const keys = mockCheckRateLimit.mock.calls.map((c: unknown[]) => (c[0] as { key: string }).key);
      expect(keys).toContain(`otp-send:email:${EMAIL_UNVERIFIED}`);
      expect(keys).toContain(`otp-send:ip:${TEST_IP}:verify`);
    });

    it("passes strict:true to checkRateLimit", async () => {
      mockCheckRateLimit.mockClear();
      await caller.sendVerificationOtp({ email: EMAIL_UNVERIFIED });
      const allStrict = mockCheckRateLimit.mock.calls.every(
        (c: unknown[]) => (c[0] as { strict?: boolean }).strict === true,
      );
      expect(allStrict).toBe(true);
    });
  });

  // ── verifyEmailOtp ────────────────────────────────────────────────────────

  describe("verifyEmailOtp", () => {
    it("verifies email and returns success with correct OTP", async () => {
      // Seed a fresh OTP directly into the verification table
      const otp = "123456";
      await db.delete(schema.verification).where(
        eq(schema.verification.identifier, `email-verification:${EMAIL_UNVERIFIED}`),
      );
      await db.insert(schema.verification).values({
        id: "v-otp-1",
        identifier: `email-verification:${EMAIL_UNVERIFIED}`,
        value: otp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      const result = await caller.verifyEmailOtp({ email: EMAIL_UNVERIFIED, otp });
      expect(result.success).toBe(true);

      // emailVerified should now be true in the DB
      const [updated] = await db
        .select({ emailVerified: schema.user.emailVerified })
        .from(schema.user)
        .where(eq(schema.user.email, EMAIL_UNVERIFIED));
      expect(updated?.emailVerified).toBe(true);

      // OTP record should be deleted after use
      const remaining = await db
        .select()
        .from(schema.verification)
        .where(eq(schema.verification.id, "v-otp-1"));
      expect(remaining).toHaveLength(0);
    });

    it("throws BAD_REQUEST for wrong OTP", async () => {
      await expect(
        caller.verifyEmailOtp({ email: EMAIL_UNVERIFIED, otp: "000000" }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("throws BAD_REQUEST for expired OTP", async () => {
      await db.delete(schema.verification).where(
        eq(schema.verification.identifier, `email-verification:${EMAIL_VERIFIED}`),
      );
      await db.insert(schema.verification).values({
        id: "v-otp-expired",
        identifier: `email-verification:${EMAIL_VERIFIED}`,
        value: "654321",
        expiresAt: new Date(Date.now() - 1000), // already expired
      });

      await expect(
        caller.verifyEmailOtp({ email: EMAIL_VERIFIED, otp: "654321" }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
  });

  // ── sendPasswordResetOtp ──────────────────────────────────────────────────

  describe("sendPasswordResetOtp", () => {
    it("sends reset email for registered user", async () => {
      mockSendOtpEmail.mockClear();
      const result = await caller.sendPasswordResetOtp({ email: EMAIL_UNVERIFIED });
      expect(result.success).toBe(true);
      expect(mockSendOtpEmail).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const callArg = (mockSendOtpEmail.mock.calls[0] as any[])[0] as { to: string; type: string };
      expect(callArg.to).toBe(EMAIL_UNVERIFIED);
      expect(callArg.type).toBe("forget-password");
    });

    it("silently returns generic response for non-existent email", async () => {
      mockSendOtpEmail.mockClear();
      const result = await caller.sendPasswordResetOtp({ email: EMAIL_NONEXISTENT });
      expect(result.success).toBe(true);
      expect(mockSendOtpEmail).not.toHaveBeenCalled();
    });

    it("checks per-email and per-IP rate limits for reset", async () => {
      mockCheckRateLimit.mockClear();
      await caller.sendPasswordResetOtp({ email: EMAIL_UNVERIFIED });
      const keys = mockCheckRateLimit.mock.calls.map((c: unknown[]) => (c[0] as { key: string }).key);
      expect(keys).toContain(`otp-send:email:${EMAIL_UNVERIFIED}`);
      expect(keys).toContain(`otp-send:ip:${TEST_IP}:reset`);
    });
  });

  // ── resetPassword ─────────────────────────────────────────────────────────

  describe("resetPassword", () => {
    it("resets password with valid OTP", async () => {
      const otp = "789012";
      await db.delete(schema.verification).where(
        eq(schema.verification.identifier, `forget-password:${EMAIL_UNVERIFIED}`),
      );
      await db.insert(schema.verification).values({
        id: "v-reset-1",
        identifier: `forget-password:${EMAIL_UNVERIFIED}`,
        value: otp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      const result = await caller.resetPassword({
        email: EMAIL_UNVERIFIED,
        otp,
        newPassword: "NewPass123",
      });
      expect(result.success).toBe(true);

      // OTP record should be deleted
      const remaining = await db
        .select()
        .from(schema.verification)
        .where(eq(schema.verification.id, "v-reset-1"));
      expect(remaining).toHaveLength(0);
    });

    it("throws BAD_REQUEST for invalid OTP", async () => {
      await expect(
        caller.resetPassword({ email: EMAIL_UNVERIFIED, otp: "000000", newPassword: "NewPass123" }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
  });

  // ── rate limit propagation ─────────────────────────────────────────────────

  describe("rate limit enforcement", () => {
    it("throws TOO_MANY_REQUESTS when checkRateLimit throws", async () => {
      const { TRPCError } = await import("@trpc/server");
      mockCheckRateLimit.mockImplementation(async () => {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many requests. Please try again later." });
      });

      await expect(
        caller.sendVerificationOtp({ email: EMAIL_UNVERIFIED }),
      ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });

      // Restore no-op
      mockCheckRateLimit.mockImplementation(async () => {});
    });
  });
});
