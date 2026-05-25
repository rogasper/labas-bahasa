import { createFileRoute, redirect } from "@tanstack/react-router";
import { routeShell } from "@/lib/route-shell";

export const Route = createFileRoute("/landing")({
  staticData: routeShell.public,
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
});
