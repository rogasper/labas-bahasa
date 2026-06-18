import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/cpns/leaderboard")({
  beforeLoad: () => {
    throw redirect({ to: "/leaderboard", search: { examTypeId: "CPNS" } as any });
  },
});
