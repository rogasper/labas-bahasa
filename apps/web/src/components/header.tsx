import { Link } from "@tanstack/react-router";
import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between w-full px-6 py-3 bg-surface-container-low border-b border-outline-variant/50">
      <div className="flex items-center gap-6">
        <span className="text-xl font-bold tracking-tight text-primary font-headline md:hidden">Labas</span>
      </div>
      <div className="flex items-center gap-4">
        <ModeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
