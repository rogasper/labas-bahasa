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

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  errorComponent: ({ error, reset }) => <ErrorFallback error={error} reset={reset} />,
  head: () => ({
    meta: [
      { title: "Labas — AI Exam Practice" },
      { name: "description", content: "AI-powered multi-language test practice platform" },
    ],
      links: [
      { rel: "icon", href: "/favicon.ico" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Inter:wght@400;500;600&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap" },
    ],
  }),
});

function RootComponent() {
  const { collapsed } = useSidebar();
  const matches = useRouterState({ select: (s) => s.matches });
  const isFullScreen = matches.some(
    (m) =>
      m.routeId === "/package/$id/take" ||
      m.routeId === "/package/$id/attempt/$attemptId" ||
      m.routeId === "/login" ||
      m.routeId === "/setup-avatar" ||
      m.routeId === "/verify-email" ||
      m.routeId === "/forgot-password" ||
      m.routeId.startsWith("/admin"),
  );
  const isLanding = matches.some((m) => m.routeId === "/landing");

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
        {isFullScreen ? (
          <div className="h-screen bg-background text-on-surface flex flex-col overflow-y-auto relative">
            <Outlet />
          </div>
        ) : isLanding ? (
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
