import { protectedProcedure, publicProcedure, router } from "../index";
import { aiRouter } from "./ai";
import { attemptRouter } from "./attempt";
import { comboRouter } from "./combo";
import { questionRouter } from "./question";
import { packageRouter } from "./package";
import { ratingRouter } from "./rating";
import { settingsRouter } from "./settings";
import { statsRouter } from "./stats";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),
  ai: aiRouter,
  attempt: attemptRouter,
  combo: comboRouter,
  question: questionRouter,
  package: packageRouter,
  rating: ratingRouter,
  settings: settingsRouter,
  stats: statsRouter,
});

export type AppRouter = typeof appRouter;
