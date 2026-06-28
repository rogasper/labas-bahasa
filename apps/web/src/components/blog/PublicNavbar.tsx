import { Link } from "@tanstack/react-router";
import { Button } from "@labas/ui/components/button";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { useState } from "react";
import { CommunityModal } from "@/components/CommunityModal";
import { env } from "@labas/env/web";

export function PublicNavbar() {
  const [communityModalOpen, setCommunityModalOpen] = useState(false);

  return (
    <>
      <CommunityModal isOpen={communityModalOpen} onOpenChange={setCommunityModalOpen} />
      <nav className="w-full px-6 py-4 md:px-12 lg:px-16 flex items-center justify-between max-w-7xl mx-auto z-50 sticky top-0 bg-[var(--warm-cream)] border-b-2 border-[var(--oat-border)]">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="Labas Logo" className="h-10 w-auto object-contain" />
          <span className="font-headline font-semibold text-2xl tracking-[-0.64px] text-[var(--clay-black)] hidden sm:block">Labas</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => setCommunityModalOpen(true)}
            className="text-[var(--warm-charcoal)] hover:text-[var(--matcha-700)] transition-colors p-2 hidden md:flex items-center gap-2"
            aria-label="Komunitas WhatsApp"
          >
            <MaterialIcon name="forum" className="text-xl" />
            <span className="font-semibold text-base">Komunitas</span>
          </button>
          <a href="https://saweria.co/rogasper" target="_blank" rel="noopener noreferrer" className="text-[var(--warm-charcoal)] hover:text-[var(--pomegranate-400)] transition-colors p-2 hidden md:flex items-center gap-2" aria-label="Support via Saweria">
            <MaterialIcon name="favorite" className="text-xl" />
            <span className="font-semibold text-base">Support</span>
          </a>
          {env.VITE_BLOG_ENABLED && (
            <Link to="/blog" className="text-[var(--warm-charcoal)] hover:text-[var(--matcha-700)] transition-colors p-2 hidden md:flex items-center gap-2">
              <MaterialIcon name="article" className="text-xl" />
              <span className="font-semibold text-base">Artikel</span>
            </Link>
          )}
          <a href="https://github.com/rogasper/labas-bahasa" target="_blank" rel="noopener noreferrer" className="text-[var(--warm-charcoal)] hover:text-[var(--clay-black)] transition-colors p-2 hidden sm:flex items-center gap-2" aria-label="GitHub Repository">
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span className="font-semibold text-base">Star us</span>
          </a>
          <div className="w-px h-6 bg-[var(--oat-border)] hidden sm:block mx-2"></div>
          <Link to="/login">
            <Button variant="ghost" className="text-[var(--clay-black)] font-semibold hover:bg-[var(--oat-light)] rounded-[12px] text-lg px-4 sm:px-6 h-12">
              Masuk
            </Button>
          </Link>
          <Link to="/login">
            <Button className="bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--dark-charcoal)] rounded-[24px] h-12 px-6 sm:px-8 font-semibold text-lg clay-hover clay-shadow">
              Mulai Gratis
            </Button>
          </Link>
        </div>
      </nav>
    </>
  );
}
