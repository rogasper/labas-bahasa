import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_SERVER_URL: z.url(),
    VITE_SITE_URL: z.url().default("http://localhost:5173"),
  },
  runtimeEnv: (import.meta as any).env,
  emptyStringAsUndefined: true,
});
