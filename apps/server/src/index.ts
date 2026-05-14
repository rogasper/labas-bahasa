import { trpcServer } from "@hono/trpc-server";
import { createContext } from "@labas/api/context";
import { appRouter } from "@labas/api/routers/index";
import { auth } from "@labas/auth";
import { env } from "@labas/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

// Side-effect: start background job worker
import "@labas/api/queue";

const app = new Hono();

app.use(logger());
app.use(
  "/*",
  async (c, next) => {
    await next();
    c.res.headers.set("X-Content-Type-Options", "nosniff");
    c.res.headers.set("X-Frame-Options", "DENY");
    c.res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    c.res.headers.set("X-XSS-Protection", "0");
    c.res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  },
);
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

app.get("/", (c) => {
  return c.text("OK");
});

export default app;
