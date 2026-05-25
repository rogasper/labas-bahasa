import { Button } from "@labas/ui/components/button";

export function ErrorFallback({ error, reset }: { error: Error; reset?: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--warm-cream)] px-4">
      <div className="max-w-md w-full bg-[var(--pure-white)] rounded-[var(--radius-xl)] border-2 border-[var(--oat-border)] shadow-xl p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--pomegranate-400)]/20 flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-3xl text-[var(--pomegranate-400)]">error</span>
        </div>
        <h1 className="text-xl font-headline font-bold text-[var(--clay-black)] mb-2">
          Terjadi Kesalahan
        </h1>
        <p className="text-sm text-[var(--warm-charcoal)] mb-6">
          Maaf, ada masalah saat memuat halaman. Coba refresh atau kembali ke dashboard.
        </p>
        {error.message && (
          <pre className="text-xs text-left bg-[var(--oat-light)] rounded-[var(--radius-md)] p-3 mb-6 overflow-auto text-[var(--clay-black)]">
            {error.message}
          </pre>
        )}
        <div className="flex gap-3 justify-center">
          {reset && (
            <Button onClick={reset} variant="outline" className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)]">
              Coba Lagi
            </Button>
          )}
          <Button
            onClick={() => { window.location.href = "/dashboard"; }}
            className="bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] rounded-[var(--radius-lg)]"
          >
            Ke Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
