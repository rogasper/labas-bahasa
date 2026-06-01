import { z } from "zod";
import { publicProcedure, router } from "../index";
import { recordBounce } from "../lib/bounce";

const bounceWebhookSchema = z.object({
  email: z.string().email(),
  reason: z.string().optional(),
});

export const webhookRouter = router({
  emailBounce: publicProcedure
    .input(bounceWebhookSchema)
    .mutation(async ({ input }) => {
      await recordBounce(input.email, input.reason);
      return { success: true };
    }),
});
