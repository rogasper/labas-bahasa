import { createFileRoute } from "@tanstack/react-router";
import { routeShell } from "@/lib/route-shell";
import { buildSocialMeta, SITE_URL } from "@/lib/site-seo";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/blog/$slug")({
  staticData: routeShell.public,
  beforeLoad: async ({ params, context }) => {
    try {
      await context.queryClient.fetchQuery(
        trpc.blog.postBySlug.queryOptions({ slug: params.slug }),
      );
    } catch {
      // Post not found — let component handle UI
    }
  },
  head: () => ({
    meta: [
      { title: "Blog — Labas" },
      ...buildSocialMeta({
        title: "Blog — Labas",
        description: "Baca artikel seputar tips dan trik ujian bahasa.",
        url: `${SITE_URL}/blog`,
      }),
    ],
  }),
});
