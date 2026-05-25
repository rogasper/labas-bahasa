import { Toaster } from "@labas/ui/components/sonner";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { HeadContent, Outlet, createRootRouteWithContext, useRouterState } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import { Sidebar } from "@/components/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { useSidebar } from "@/hooks/use-sidebar";
import { GlobalGenerationProgress } from "@/components/generate/GlobalGenerationProgress";
import { ErrorFallback } from "@/components/ErrorFallback";
import type { RouteShell } from "@/lib/route-shell";
import type { trpc } from "@/utils/trpc";

function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[var(--clay-black)] focus:text-[var(--pure-white)] focus:rounded-[var(--radius-lg)] focus:font-semibold focus:text-sm focus:shadow-xl"
    >
      Lewati ke konten utama
    </a>
  );
}

import "../index.css";

export interface RouterAppContext {
  trpc: typeof trpc;
  queryClient: QueryClient;
}

function resolveShell(matches: { staticData?: unknown }[]): RouteShell {
  for (let i = matches.length - 1; i >= 0; i--) {
    const shell = (matches[i]?.staticData as { shell?: RouteShell } | undefined)?.shell;
    if (shell) return shell;
  }
  return "app";
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  errorComponent: ({ error, reset }) => <ErrorFallback error={error} reset={reset} />,
  head: () => {
    const siteUrl = "https://labas.rogasper.com";
    return {
      meta: [
        { title: "Labas — AI Exam Practice" },
        { name: "description", content: "AI-powered multi-language test practice platform" },
        { property: "og:title", content: "Labas — AI Exam Practice" },
        { property: "og:description", content: "AI-powered multi-language test practice platform" },
        { property: "og:url", content: siteUrl },
        { property: "og:image", content: `${siteUrl}/og_image.png` },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "Labas — AI Exam Practice" },
        { name: "twitter:description", content: "AI-powered multi-language test practice platform" },
        { name: "twitter:image", content: `${siteUrl}/og_image.png` },
        { name: "robots", content: "index, follow" },
      ],
      links: [
        { rel: "icon", href: "/labas_icon.png" },
        { rel: "canonical", href: siteUrl },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" as const },
        { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Inter:wght@400;500;600&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap" },
      ],
      scripts: [
        ...(import.meta.env.PROD
          ? [{ src: "https://umami-analytic.rogasper.com/script.js", defer: true, "data-website-id": "67a18412-12c8-44ef-9cd3-e04238d37e9a" }]
          : []),
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Labas",
            url: siteUrl,
            description: "AI-powered multi-language test practice platform",
            potentialAction: {
              "@type": "SearchAction",
              target: `${siteUrl}/bank?search={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          }),
        },
      ],
    };
  },
});

function RootComponent() {
  const { collapsed } = useSidebar();
  const shell = useRouterState({ select: (s) => resolveShell(s.matches) });

  return (
    <>
      <HeadContent />
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
        storageKey="labas-theme"
      >
        {shell === "fullscreen" ? (
          <div className="h-screen bg-background text-on-surface flex flex-col overflow-y-auto relative">
            <Outlet />
          </div>
        ) : shell === "public" ? (
          <div className="min-h-screen bg-background text-on-surface relative">
            <Outlet />
          </div>
        ) : (
          <div className="min-h-screen bg-background relative">
            <SkipLink />
            <Sidebar />
            <main
              id="main-content"
              className={`min-h-screen transition-all duration-300 relative z-0 ${collapsed ? "md:ml-16" : "md:ml-64"}`}
            >
              <Outlet />
            </main>
          </div>
        )}
        <GlobalGenerationProgress />
        <Toaster richColors />
      </ThemeProvider>
      {import.meta.env.DEV && (
        <>
          <TanStackRouterDevtools position="bottom-left" />
          <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
        </>
      )}
    </>
  );
}
