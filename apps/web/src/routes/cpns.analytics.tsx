import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/cpns/analytics")({
  beforeLoad: () => {
    throw redirect({ to: "/analytics", search: {} as any });
  },
});
