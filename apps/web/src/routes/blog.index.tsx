import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/blog/")({
  validateSearch: z.object({
    page: z.coerce.number().min(1).default(1).optional(),
    search: z.string().optional(),
  }),
});
