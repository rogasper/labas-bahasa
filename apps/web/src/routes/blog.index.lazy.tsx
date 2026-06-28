import { createLazyFileRoute } from "@tanstack/react-router";
import { BlogListPage } from "@/components/routes/BlogListPage";

export const Route = createLazyFileRoute("/blog/")({
  component: BlogListPage,
});
