import { protectedProcedure, publicProcedure, router } from "../index";
import { adminRouter } from "./admin";
import { aiRouter } from "./ai";
import { attemptRouter } from "./attempt";
import { audioRouter } from "./audio";
import { comboRouter } from "./combo";
import { feedbackRouter } from "./feedback";
import { questionRouter } from "./question";
import { packageRouter } from "./package";
import { profileRouter } from "./profile";
import { ratingRouter } from "./rating";
import { settingsRouter } from "./settings";
import { leaderboardRouter } from "./leaderboard";
import { statsRouter } from "./stats";
import { verificationRouter } from "./verification";

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
  admin: adminRouter,
  ai: aiRouter,
  attempt: attemptRouter,
  audio: audioRouter,
  combo: comboRouter,
  feedback: feedbackRouter,
  question: questionRouter,
  package: packageRouter,
  profile: profileRouter,
  rating: ratingRouter,
  settings: settingsRouter,
  stats: statsRouter,
  leaderboard: leaderboardRouter,
  verification: verificationRouter,
});

export type AppRouter = typeof appRouter;
