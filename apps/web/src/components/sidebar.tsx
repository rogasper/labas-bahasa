import { useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { useSidebar } from "@/hooks/use-sidebar";
import { triggerGlobalTour } from "@/components/TourGuide";

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    items: [{ to: "/dashboard", label: "Dashboard", icon: "dashboard" }],
  },
  {
    label: "Generate",
    items: [
      { to: "/generate", label: "AI Lab", icon: "auto_awesome" },
      { to: "/jobs", label: "Jobs", icon: "schedule" },
    ],
  },
  {
    label: "Bank",
    items: [{ to: "/bank", label: "Buat Paket", icon: "database" }],
  },
  {
    label: "Latihan",
    items: [
      { to: "/packages", label: "Paket Soal", icon: "folder" },
      { to: "/history", label: "Riwayat", icon: "history" },
    ],
  },
  {
    label: "Track",
    items: [
      { to: "/analytics", label: "Analytics", icon: "analytics" },
      { to: "/leaderboard", label: "Klasemen", icon: "leaderboard" },
    ],
  },
];

const bottomItems: NavItem[] = [
  { to: "/me", label: "Profil", icon: "person" },
  { to: "/settings", label: "Settings", icon: "settings" },
];

const mobileNavItems: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/generate", label: "AI Lab", icon: "auto_awesome" },
  { to: "/jobs", label: "Jobs", icon: "schedule" },
  { to: "/bank", label: "Buat", icon: "database" },
  { to: "/packages", label: "Latihan", icon: "folder" },
];

function NavIcon({ name }: { name: string }) {
  return <span className="material-symbols-outlined text-xl w-6 text-center">{name}</span>;
}

function NavLink({ item, isActive, collapsed }: { item: NavItem; isActive: boolean; collapsed: boolean }) {
  const tourAttr = item.to !== "/dashboard" ? { "data-tour": `nav-${item.to.replace("/", "")}` } : {};
  return (
    <Link
      to={item.to}
      {...tourAttr}
      aria-current={isActive ? "page" : undefined}
      className={`flex items-center gap-3 rounded-[var(--radius-lg)] transition-all group clay-hover cursor-pointer ${
        isActive
          ? "bg-[var(--matcha-300)] text-[var(--matcha-800)] font-semibold clay-shadow"
          : "text-[var(--warm-charcoal)] hover:bg-[var(--oat-light)] hover:text-[var(--clay-black)]"
      } ${collapsed ? "justify-center py-3 px-2" : "py-3 px-3"}`}
      title={collapsed ? item.label : undefined}
    >
      <NavIcon name={item.icon} />
      {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
    </Link>
  );
}

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { collapsed, toggle } = useSidebar();
  const { data: session } = authClient.useSession();
  const isLoggedIn = !!session;

  const { data: adminData } = useQuery(
    trpc.admin.isAdmin.queryOptions(undefined, { enabled: isLoggedIn }),
  );
  const isAdmin = !!adminData?.isAdmin;

  async function handleSignOut() {
    await authClient.signOut();
    navigate({ to: "/" });
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full flex flex-col z-40 bg-[var(--warm-cream)] border-r border-[var(--oat-border)] hidden md:flex transition-all duration-300 overflow-y-auto ${
          collapsed ? "w-16 items-center px-2 py-4" : "w-64 py-4 px-3"
        }`}
      >
        <div className={`mb-8 ${collapsed ? "px-0 text-center" : "px-3"}`}>
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

        <nav className="flex-1 space-y-4 w-full">
          {navGroups.map((group) => (
            <div key={group.label ?? "ungrouped"} className="space-y-1">
              {!collapsed && group.label && (
                <p className="px-3 text-[10px] font-bold text-[var(--warm-charcoal)]/50 uppercase tracking-wider">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
                const isActive =
                  location.pathname === item.to ||
                  (location.pathname.startsWith(`${item.to}/`) && item.to !== "/");
                return (
                  <NavLink
                    key={item.to}
                    item={item}
                    isActive={isActive}
                    collapsed={collapsed}
                  />
                );
              })}
            </div>
          ))}

          {isAdmin && (
            <div className="space-y-1 pt-2 border-t border-[var(--matcha-400)]/30">
              {!collapsed && (
                <p className="px-3 text-[10px] font-bold text-[var(--matcha-600)] uppercase tracking-wider">
                  Admin
                </p>
              )}
              {[{ to: "/admin", label: "Admin Panel", icon: "admin_panel_settings" }].map((item) => {
                const isActive =
                  location.pathname === item.to ||
                  (location.pathname.startsWith(`${item.to}/`) && item.to !== "/");
                return (
                  <NavLink key={item.to} item={item} isActive={isActive} collapsed={collapsed} />
                );
              })}
            </div>
          )}
        </nav>

        <div className="mt-auto space-y-1 pt-4 border-t border-[var(--oat-border)] w-full">
          {bottomItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                item={item}
                isActive={isActive}
                collapsed={collapsed}
              />
            );
          })}

          {/* Help Tour Button */}
          <button
            onClick={triggerGlobalTour}
            aria-label="Panduan"
            className={`flex items-center gap-3 rounded-[var(--radius-lg)] transition-all clay-hover cursor-pointer text-[var(--warm-charcoal)] hover:bg-[var(--oat-light)] hover:text-[var(--clay-black)] w-full ${
              collapsed ? "justify-center py-3 px-2" : "py-3 px-3 text-left"
            }`}
            title={collapsed ? "Panduan" : undefined}
          >
            <NavIcon name="help" />
            {!collapsed && <span className="text-sm font-medium">Panduan</span>}
          </button>

          {isLoggedIn ? (
            <button
              onClick={handleSignOut}
              aria-label="Keluar"
              className={`flex items-center gap-3 rounded-[var(--radius-lg)] transition-all clay-hover cursor-pointer text-[var(--warm-charcoal)] hover:bg-[var(--oat-light)] hover:text-[var(--clay-black)] w-full ${
                collapsed ? "justify-center py-3 px-2" : "py-3 px-3 text-left"
              }`}
              title={collapsed ? "Keluar" : undefined}
            >
              <NavIcon name="logout" />
              {!collapsed && <span className="text-sm font-medium">Keluar</span>}
            </button>
          ) : (
            <Link
              to="/login"
              className={`flex items-center gap-3 rounded-[var(--radius-lg)] transition-all clay-hover cursor-pointer text-[var(--warm-charcoal)] hover:bg-[var(--oat-light)] hover:text-[var(--clay-black)] ${
                collapsed ? "justify-center py-3 px-2" : "py-3 px-3"
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
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={!collapsed}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        style={{ left: collapsed ? "48px" : "240px" }}
        className="hidden md:flex fixed top-6 z-40 items-center justify-center w-10 h-10 rounded-full bg-[var(--pure-white)] border-2 border-[var(--oat-border)] shadow-md hover:bg-[var(--oat-light)] transition-all duration-300 text-[var(--warm-charcoal)] clay-hover cursor-pointer"
      >
        <span className="relative inline-flex size-6 shrink-0 items-center justify-center">
          <span
            className={`material-symbols-outlined pointer-events-none absolute inset-0 flex items-center justify-center text-[20px] leading-none transition-all duration-300 ease-out select-none ${
              collapsed
                ? "opacity-100 scale-100 rotate-0"
                : "opacity-0 scale-75 -rotate-90"
            }`}
            aria-hidden
          >
            right_panel_open
          </span>
          <span
            className={`material-symbols-outlined pointer-events-none absolute inset-0 flex items-center justify-center text-[20px] leading-none transition-all duration-300 ease-out select-none ${
              collapsed
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
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 pb-6 pt-3 bg-[var(--warm-cream)]/90 backdrop-blur-xl border-t border-[var(--oat-border)] rounded-t-[var(--radius-xl)]">
        {mobileNavItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center justify-center px-3 py-1.5 transition-all rounded-[var(--radius-lg)] cursor-pointer ${
                isActive
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
