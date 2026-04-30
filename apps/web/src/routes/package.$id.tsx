import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/package/$id")({
  component: () => <Outlet />,
});
