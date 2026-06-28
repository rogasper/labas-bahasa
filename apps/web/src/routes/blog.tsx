import { createFileRoute, Outlet } from "@tanstack/react-router";
import { routeShell } from "@/lib/route-shell";
import { buildSocialMeta, SITE_URL } from "@/lib/site-seo";
import { env } from "@labas/env/web";
import { PublicNavbar } from "@/components/blog/PublicNavbar";

export const Route = createFileRoute("/blog")({
  staticData: routeShell.public,
  head: () => ({
    meta: [
      { title: "Blog — Labas" },
      ...buildSocialMeta({
        title: "Blog — Labas",
        description: "Artikel dan tips seputar persiapan ujian bahasa, IELTS, TOEFL, JLPT, TOPIK, dan lainnya.",
        url: `${SITE_URL}/blog`,
      }),
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/blog` }],
  }),
  component: BlogLayout,
});

function BlogLayout() {
  if (!env.VITE_BLOG_ENABLED) {
    return (
      <div className="min-h-screen bg-[var(--warm-cream)] flex items-center justify-center">
        <p className="text-[var(--warm-charcoal)] text-lg">Blog tidak tersedia.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--warm-cream)] flex flex-col">
      <PublicNavbar />
      <main className="flex-1 w-full">
        <Outlet />
      </main>
      <footer className="w-full bg-[var(--pure-white)] py-8 border-t-2 border-[var(--oat-border)] text-center">
        <p className="text-sm text-[var(--warm-charcoal)]">
          &copy; {new Date().getFullYear()} Labas
        </p>
      </footer>
    </div>
  );
}
