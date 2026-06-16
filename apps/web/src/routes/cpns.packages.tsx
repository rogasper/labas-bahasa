import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/cpns/packages")({
  validateSearch: z.object({
    search: z.string().optional(),
    page: z.coerce.number().optional(),
  }).parse,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({ to: "/login", throw: true });
    }
    return { session };
  },
});
