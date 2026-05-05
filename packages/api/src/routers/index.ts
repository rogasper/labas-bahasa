import { protectedProcedure, publicProcedure, router } from "../index";
import { aiRouter } from "./ai";
import { attemptRouter } from "./attempt";
import { comboRouter } from "./combo";
import { feedbackRouter } from "./feedback";
import { questionRouter } from "./question";
import { packageRouter } from "./package";
import { profileRouter } from "./profile";
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
  feedback: feedbackRouter,
  question: questionRouter,
  package: packageRouter,
  profile: profileRouter,
  rating: ratingRouter,
  settings: settingsRouter,
  stats: statsRouter,
});

export type AppRouter = typeof appRouter;
