import { Link } from "@tanstack/react-router";
import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { env } from "@labas/env/web";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between w-full px-6 py-3 bg-surface-container-low border-b border-outline-variant/50">
      <div className="flex items-center gap-6">
        <Link to="/dashboard" className="text-xl font-bold tracking-tight text-primary font-headline">
          Labas
        </Link>
        <nav className="hidden md:flex items-center gap-3 ml-4">
          <Link
            to="/dashboard"
            className="text-sm font-medium text-[var(--warm-charcoal)] hover:text-[var(--clay-black)] transition-colors px-3 py-1.5 rounded-[var(--radius-md)] hover:bg-outline-variant/20"
            activeProps={{ className: "font-semibold text-[var(--clay-black)] bg-outline-variant/30" }}
          >
            Dashboard
          </Link>
          {env.VITE_BLOG_ENABLED && (
            <Link
              to="/blog"
              className="text-sm font-medium text-[var(--warm-charcoal)] hover:text-[var(--clay-black)] transition-colors px-3 py-1.5 rounded-[var(--radius-md)] hover:bg-outline-variant/20 flex items-center gap-1.5"
              activeProps={{ className: "font-semibold text-[var(--clay-black)] bg-outline-variant/30" }}
            >
              <MaterialIcon name="article" className="text-base" />
              Artikel
            </Link>
          )}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <ModeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
