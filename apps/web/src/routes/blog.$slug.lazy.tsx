import { createLazyFileRoute } from "@tanstack/react-router";
import { BlogDetailPage } from "@/components/routes/BlogDetailPage";

export const Route = createLazyFileRoute("/blog/$slug")({
  component: BlogDetailPage,
});
