import { createFileRoute, Outlet, Link, redirect, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }
    return { session };
  },
});

const adminNavItems = [
  { to: "/admin", label: "Dashboard", icon: "dashboard" },
  { to: "/admin/users", label: "Users", icon: "group" },
  { to: "/admin/featured", label: "Featured", icon: "star" },
  { to: "/admin/credits", label: "Credits", icon: "token" },
  { to: "/admin/jobs", label: "Jobs", icon: "schedule" },
  { to: "/admin/moderation", label: "Moderation", icon: "shield" },
];

function AdminLayout() {
  const location = useLocation();

  const { data: isAdminData, isLoading } = useQuery(
    trpc.admin.isAdmin.queryOptions(),
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--warm-cream)]">
        <span className="material-symbols-outlined animate-spin text-3xl text-[var(--clay-black)]">progress_activity</span>
      </div>
    );
  }

  if (!isAdminData?.isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--warm-cream)] gap-4">
        <MaterialIcon name="gpp_bad" className="text-6xl text-[var(--clay-red)]" />
        <h1 className="text-2xl font-headline font-bold text-[var(--clay-black)]">Access Denied</h1>
        <p className="text-[var(--warm-charcoal)]">Only admins can access this page.</p>
        <Link to="/" className="text-[var(--matcha-700)] underline">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--warm-cream)]">
      <div className="flex">
        <aside className="w-56 shrink-0 min-h-screen border-r border-[var(--oat-border)] bg-[var(--pure-white)] px-4 py-6 flex flex-col">
          <div className="mb-6 px-2">
            <Link to="/" className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--clay-black)]">arrow_back</span>
              <span className="text-sm text-[var(--warm-charcoal)]">Back to App</span>
            </Link>
          </div>
          <div className="px-2 mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--warm-charcoal)]">Admin Panel</div>
          <nav className="flex flex-col gap-1">
            {adminNavItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 rounded-[var(--radius-lg)] py-2.5 px-3 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-[var(--matcha-300)] text-[var(--matcha-800)] font-semibold"
                      : "text-[var(--warm-charcoal)] hover:bg-[var(--oat-light)] hover:text-[var(--clay-black)]"
                  }`}
                >
                  <MaterialIcon name={item.icon} className="text-lg" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
