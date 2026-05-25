import { trpcServer } from "@hono/trpc-server";
import { createContext } from "@labas/api/context";
import { appRouter } from "@labas/api/routers/index";
import { auth } from "@labas/auth";
import { env } from "@labas/env/server";
import { logger, withRequestId } from "@labas/api/logger";
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

app.get("/sitemap.xml", (c) => {
  const baseUrl = "https://labas.rogasper.com";
  const urls = [
    { loc: `${baseUrl}/landing`, changefreq: "weekly", priority: "0.8" },
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
