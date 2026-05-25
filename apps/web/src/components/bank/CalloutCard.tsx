import { Button } from "@labas/ui/components/button";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

interface CalloutCardProps {
  privateCount: number;
  label?: string;
  onPublishAll: () => void;
  onDismiss: () => void;
}

export function CalloutCard({ privateCount, label = "soal", onPublishAll, onDismiss }: CalloutCardProps) {
  if (privateCount <= 0) return null;

  return (
    <div className="md:col-span-2 mb-4">
      <div className="flex items-start gap-3 p-4 rounded-[var(--radius-xl)] bg-[var(--slushie-500)]/10 border-l-4 border-[var(--slushie-500)] border-2 border-[var(--slushie-500)]/20">
        <div className="shrink-0 mt-0.5">
          <div className="w-8 h-8 rounded-full bg-[var(--slushie-500)]/20 flex items-center justify-center">
            <MaterialIcon name="info" className="text-sm text-[var(--slushie-800)]" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--clay-black)]">
            Kamu punya <span className="text-[var(--slushie-800)]">{privateCount} {label} privat</span>
          </p>
          <p className="text-xs text-[var(--warm-charcoal)] mt-1 leading-relaxed">
            Soal privat hanya bisa kamu lihat. Jadikan publik agar soal bisa muncul di daftar paket soal dan diakses pengguna lain.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              onClick={onPublishAll}
              className="rounded-[var(--radius-lg)] bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] text-xs cursor-pointer"
            >
              <MaterialIcon name="public" className="text-xs mr-1" />
              Jadikan Semua Publik
            </Button>
            <button
              onClick={onDismiss}
              className="text-xs text-[var(--warm-charcoal)] hover:text-[var(--clay-black)] transition-colors cursor-pointer font-medium"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
