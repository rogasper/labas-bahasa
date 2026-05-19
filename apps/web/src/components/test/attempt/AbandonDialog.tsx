import { Button } from "@labas/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@labas/ui/components/dialog";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

interface AbandonDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function AbandonDialog({ open, onClose, onConfirm }: AbandonDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--pomegranate-400)]/20 flex items-center justify-center">
              <MaterialIcon name="warning" className="text-[var(--pomegranate-400)]" />
            </div>
            <DialogTitle className="text-xl font-headline font-bold text-[var(--clay-black)]">
              Keluar dari Latihan?
            </DialogTitle>
          </div>
        </DialogHeader>
        <DialogDescription className="text-sm text-[var(--warm-charcoal)]">
          Apakah Anda yakin ingin meninggalkan sesi latihan ini? Progress pengerjaan Anda mungkin tidak tersimpan dan akan ditandai sebagai gagal atau dibatalkan.
        </DialogDescription>
        <div className="flex gap-3 mt-2">
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
      </DialogContent>
    </Dialog>
  );
}
