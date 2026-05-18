import { Button } from "@labas/ui/components/button";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

interface AbandonDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function AbandonDialog({ open, onClose, onConfirm }: AbandonDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="abandon-dialog-title"
    >
      <div className="bg-[var(--warm-cream)] w-full max-w-md rounded-[var(--radius-xl)] border-2 border-[var(--oat-border)] shadow-xl p-6 md:p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[var(--pomegranate-400)]/20 flex items-center justify-center">
            <MaterialIcon name="warning" className="text-[var(--pomegranate-400)]" />
          </div>
          <h2 id="abandon-dialog-title" className="text-xl font-headline font-bold text-[var(--clay-black)]">
            Keluar dari Latihan?
          </h2>
        </div>

        <div className="space-y-3 mb-6">
          <p className="text-sm text-[var(--warm-charcoal)]">
            Apakah Anda yakin ingin meninggalkan sesi latihan ini? Progress pengerjaan Anda mungkin tidak tersimpan dan akan ditandai sebagai gagal atau dibatalkan.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)]"
          >
            Batal
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 bg-[var(--pomegranate-400)] text-[var(--pure-white)] hover:bg-[var(--pomegranate-600)] rounded-[var(--radius-lg)]"
          >
            Keluar
          </Button>
        </div>
      </div>
    </div>
  );
}
