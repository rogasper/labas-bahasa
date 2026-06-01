import { trpcServer } from "@hono/trpc-server";
import { createContext } from "@labas/api/context";
import { appRouter } from "@labas/api/routers/index";
import { checkRateLimitAllowed } from "@labas/api/lib/rate-limit";
import { recordBounce } from "@labas/api/lib/bounce";
import { auth } from "@labas/auth";
import { env } from "@labas/env/server";
import { withRequestId } from "@labas/api/logger";
import { Hono } from "hono";
import { cors } from "hono/cors";

import "@labas/api/queue";

const app = new Hono();

app.use("/*", async (c, next) => {
  const reqId = c.req.header("x-request-id") ?? crypto.randomUUID();
  const reqLogger = withRequestId(reqId);
  const start = Date.now();

  c.res.headers.set("x-request-id", reqId);
  reqLogger.info(`${c.req.method} ${c.req.path}`);

  await next();

  const duration = Date.now() - start;
  reqLogger.info(`${c.req.method} ${c.req.path} ${c.res.status}`, { durationMs: duration });
});

app.use("/*", async (c, next) => {
  await next();
  c.res.headers.set("X-Content-Type-Options", "nosniff");
  c.res.headers.set("X-Frame-Options", "DENY");
  c.res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  c.res.headers.set("X-XSS-Protection", "0");
  c.res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
});

app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// Rate limit sign-up attempts per IP to mitigate mass account creation
app.use("/api/auth/sign-up/email", async (c, next) => {
  if (c.req.method !== "POST") return next();
  const cfIp = c.req.header("cf-connecting-ip");
  const forwarded = c.req.header("x-forwarded-for");
  const realIp = c.req.header("x-real-ip");
  const firstForwardedIp = forwarded ? forwarded.split(",")[0]?.trim() : undefined;
  const ip = cfIp ?? firstForwardedIp ?? realIp ?? "unknown";
  const allowed = await checkRateLimitAllowed({ key: `signup:ip:${ip}`, limit: 5, windowMs: 3_600_000 });
  if (!allowed) {
    return c.json({ error: "Too many sign-up attempts. Please try again later." }, 429);
  }
  return next();
});

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, context) => {
      return createContext({ context });
    },
  }),
);

// Webhook endpoint for email bounce notifications from ESPs (SendGrid, Mailgun, SES)
app.post("/api/webhooks/email-bounce", async (c) => {
  const body = await c.req.json<{ Email?: string; email?: string; Reason?: string; reason?: string }>();
  const email = body.Email ?? body.email;
  const reason = body.Reason ?? body.reason;

  if (!email) {
    return c.json({ error: "Missing email field" }, 400);
  }

  await recordBounce(email, reason);
  return c.json({ success: true }, 200);
});

app.get("/sitemap.xml", (c) => {
  const baseUrl = "https://labas.rogasper.com";
  const urls = [
    { loc: `${baseUrl}/`, changefreq: "weekly", priority: "1.0" },
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${url.loc}</loc>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;
  return c.text(sitemap, 200, { "Content-Type": "application/xml" });
});

app.get("/", (c) => {
  return c.text("OK");
});

export default app;
