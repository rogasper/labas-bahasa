import { Link, useLocation } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { useSidebar } from "@/hooks/use-sidebar";

const navItems = [
  { to: "/", label: "Dashboard", icon: "dashboard" },
  { to: "/generate", label: "AI Lab", icon: "auto_awesome" },
  { to: "/jobs", label: "Jobs", icon: "schedule" },
  { to: "/bank", label: "Buat Paket", icon: "database" },
  { to: "/packages", label: "Paket", icon: "folder" },
  { to: "/history", label: "Riwayat", icon: "history" },
  { to: "/analytics", label: "Analytics", icon: "analytics" },
];

const bottomItems = [
  { to: "/me", label: "Profil", icon: "person" },
  { to: "/settings", label: "Settings", icon: "settings" },
];

function NavIcon({ name }: { name: string }) {
  return <span className="material-symbols-outlined text-xl w-6 text-center">{name}</span>;
}

export function Sidebar() {
  const location = useLocation();
  const { collapsed, toggle } = useSidebar();
  const { data: session } = authClient.useSession();
  const isLoggedIn = !!session;

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full flex flex-col z-40 bg-[var(--warm-cream)] border-r border-[var(--oat-border)] hidden md:flex transition-all duration-300 ${collapsed ? "w-16 items-center px-2 py-4" : "w-64 p-4"
          }`}
      >
        <div className={`mb-8 ${collapsed ? "px-0 text-center" : "px-4"}`}>
          <img
            src="/logo.png"
            alt="Labas"
            width={64}
            height={64}
            className="mt-2 size-16 object-contain select-none"
            decoding="async"
          />
          {!collapsed && (
            <p className="text-xs text-[var(--warm-charcoal)] uppercase tracking-widest font-semibold mt-1">
              Exam Prep Portal
            </p>
          )}
        </div>

        <nav className="flex-1 space-y-1 w-full">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to || (location.pathname.startsWith(`${item.to}/`) && item.to !== "/builder");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-[var(--radius-lg)] transition-all group clay-hover ${isActive
                  ? "bg-[var(--matcha-300)] text-[var(--matcha-800)] font-semibold clay-shadow"
                  : "text-[var(--warm-charcoal)] hover:bg-[var(--oat-light)] hover:text-[var(--clay-black)]"
                  } ${collapsed ? "justify-center py-3 px-2" : "py-3 px-4"}`}
                title={collapsed ? item.label : undefined}
              >
                <NavIcon name={item.icon} />
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-1 pt-4 border-t border-[var(--oat-border)] w-full">
          {bottomItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-[var(--radius-lg)] transition-all clay-hover ${isActive
                  ? "bg-[var(--matcha-300)] text-[var(--matcha-800)] font-semibold clay-shadow"
                  : "text-[var(--warm-charcoal)] hover:bg-[var(--oat-light)] hover:text-[var(--clay-black)]"
                  } ${collapsed ? "justify-center py-3 px-2" : "py-3 px-4"}`}
                title={collapsed ? item.label : undefined}
              >
                <NavIcon name={item.icon} />
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            );
          })}
          {isLoggedIn ? (
            <button
              onClick={() => authClient.signOut()}
              className={`flex items-center gap-3 rounded-[var(--radius-lg)] transition-all clay-hover text-[var(--warm-charcoal)] hover:bg-[var(--oat-light)] hover:text-[var(--clay-black)] w-full ${collapsed ? "justify-center py-3 px-2" : "py-3 px-4 text-left"
                }`}
              title={collapsed ? "Keluar" : undefined}
            >
              <NavIcon name="logout" />
              {!collapsed && <span className="text-sm font-medium">Keluar</span>}
            </button>
          ) : (
            <Link
              to="/login"
              className={`flex items-center gap-3 rounded-[var(--radius-lg)] transition-all clay-hover text-[var(--warm-charcoal)] hover:bg-[var(--oat-light)] hover:text-[var(--clay-black)] ${collapsed ? "justify-center py-3 px-2" : "py-3 px-4"
                }`}
              title={collapsed ? "Masuk" : undefined}
            >
              <NavIcon name="login" />
              {!collapsed && <span className="text-sm font-medium">Masuk</span>}
            </Link>
          )}
        </div>
      </aside>

      {/* Floating toggle button (right edge of sidebar) */}
      <button
        onClick={toggle}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        style={{ left: collapsed ? "48px" : "240px" }}
        className="hidden md:flex fixed top-6 z-40 items-center justify-center w-10 h-10 rounded-full bg-[var(--pure-white)] border-2 border-[var(--oat-border)] shadow-md hover:bg-[var(--oat-light)] transition-all duration-300 text-[var(--warm-charcoal)] clay-hover"
      >
        <span className="relative inline-flex size-6 shrink-0 items-center justify-center">
          <span
            className={`material-symbols-outlined pointer-events-none absolute inset-0 flex items-center justify-center text-[20px] leading-none transition-all duration-300 ease-out select-none ${collapsed
              ? "opacity-100 scale-100 rotate-0"
              : "opacity-0 scale-75 -rotate-90"
              }`}
            aria-hidden
          >
            right_panel_open
          </span>
          <span
            className={`material-symbols-outlined pointer-events-none absolute inset-0 flex items-center justify-center text-[20px] leading-none transition-all duration-300 ease-out select-none ${collapsed
              ? "opacity-0 scale-75 rotate-90"
              : "opacity-100 scale-100 rotate-0"
              }`}
            aria-hidden
          >
            right_panel_close
          </span>
        </span>
      </button>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-3 bg-[var(--warm-cream)]/90 backdrop-blur-xl border-t border-[var(--oat-border)] rounded-t-[var(--radius-xl)]">
        {navItems.slice(0, 4).map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center px-4 py-1.5 transition-all rounded-[var(--radius-lg)] ${isActive
                ? "bg-[var(--matcha-300)] text-[var(--matcha-800)]"
                : "text-[var(--warm-charcoal)]"
                }`}
            >
              <NavIcon name={item.icon} />
              <span className="text-[10px] font-medium uppercase tracking-wider mt-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
