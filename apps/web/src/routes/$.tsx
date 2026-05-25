import { createFileRoute } from "@tanstack/react-router";
import { routeShell } from "@/lib/route-shell";
import { NotFoundPage } from "@/components/NotFoundPage";

export const Route = createFileRoute("/$")({
  staticData: routeShell.public,
  component: NotFoundPage,
});
