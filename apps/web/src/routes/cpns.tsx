import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { routeShell } from "@/lib/route-shell";

export const Route = createFileRoute("/cpns")({
  staticData: routeShell.app,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({ to: "/login", throw: true });
    }
    return { session };
  },
  component: CpnsLayout,
});

function CpnsLayout() {
  return (
    <div className="min-h-screen pt-8 pb-32 px-6 md:px-12 lg:px-16 max-w-6xl mx-auto bg-[var(--warm-cream)]">
      <div
        style={{
          "--matcha-600": "var(--blueberry-800)",
          "--matcha-500": "var(--blueberry-800)",
          "--matcha-400": "#5b8cba",
          "--matcha-300": "#c2d9f5",
          "--matcha-800": "var(--blueberry-800)",
        } as React.CSSProperties}
      >
        <Outlet />
      </div>
    </div>
  );
}
