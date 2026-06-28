import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGIN: z.url(),
    API_KEY_ENCRYPTION_KEY: z.string().min(32),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number().positive().default(587),
    SMTP_USER: z.string().min(1),
    SMTP_PASS: z.string().min(1),
    SMTP_FROM: z.string().min(1),
    PLATFORM_AI_API_KEY: z.string().optional(),
    PLATFORM_AI_BASE_URL: z.string().optional(),
    PLATFORM_AI_MODEL: z.string().optional(),
    FREE_CREDITS_ENABLED: z.coerce.boolean().default(false),
    FREE_CREDITS_MAX_POOL: z.coerce.number().positive().default(1_000_000),
    DEFAULT_SIGNUP_CREDIT_TOKENS: z.coerce.number().positive().default(50_000),
    CLOUDFLARE_TURNSTILE_SECRET_KEY: z.string().optional(),
    TURNSTILE_DISABLED: z.coerce.boolean().default(false),
    BLOG_API_URL: z.string().url().default("https://api.rogasper.com"),
    BLOG_PROJECT_SLUG: z.string().min(1),
    BLOG_API_KEY: z.string().min(1),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
