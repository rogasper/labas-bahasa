import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/cpns/analytics")({
  beforeLoad: () => {
    throw redirect({ to: "/analytics", search: { examTypeId: "CPNS" } as any });
  },
});
