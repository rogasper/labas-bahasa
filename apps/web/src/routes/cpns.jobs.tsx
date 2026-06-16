import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/cpns/jobs")({
  beforeLoad: () => {
    throw redirect({ to: "/jobs", search: {} as any });
  },
});
