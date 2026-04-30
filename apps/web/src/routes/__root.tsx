import { Toaster } from "@labas/ui/components/sonner";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { HeadContent, Outlet, createRootRouteWithContext, useRouterState } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import { Sidebar } from "@/components/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { useSidebar } from "@/hooks/use-sidebar";
import type { trpc } from "@/utils/trpc";

import "../index.css";

export interface RouterAppContext {
  trpc: typeof trpc;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  head: () => ({
    meta: [
      { title: "Labas — AI Exam Practice" },
      { name: "description", content: "AI-powered multi-language test practice platform" },
    ],
    links: [
      { rel: "icon", href: "/favicon.ico" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Inter:wght@400;500;600&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap" },
    ],
  }),
});

function RootComponent() {
  const { collapsed } = useSidebar();
  const matches = useRouterState({ select: (s) => s.matches });
  const isFullScreen = matches.some((m) => m.routeId === "/package/$id/take");

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
          <div className="h-screen bg-background text-on-surface flex flex-col overflow-hidden relative">
            <Outlet />
          </div>
        ) : (
          <div className="min-h-screen bg-background relative">
            <Sidebar />
            <main
              className={`min-h-screen transition-all duration-300 relative z-0 ${collapsed ? "md:ml-16" : "md:ml-64"}`}
            >
              <Outlet />
            </main>
          </div>
        )}
        <Toaster richColors />
      </ThemeProvider>
      <TanStackRouterDevtools position="bottom-left" />
      <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
    </>
  );
}
