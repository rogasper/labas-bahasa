import { Button } from "@labas/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@labas/ui/components/dialog";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

interface FinishDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  answeredCount: number;
  totalQuestions: number;
}

export function FinishDialog({ open, onClose, onConfirm, answeredCount, totalQuestions }: FinishDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--pomegranate-400)]/20 flex items-center justify-center">
              <MaterialIcon name="help" className="text-[var(--pomegranate-400)]" />
            </div>
            <DialogTitle className="text-xl font-headline font-bold text-[var(--clay-black)]">
              Selesaikan Latihan?
            </DialogTitle>
          </div>
        </DialogHeader>
        <DialogDescription
          className="space-y-3 *:text-sm"
          render={<div />}
        >
          <p className="text-[var(--warm-charcoal)]">
            Kamu sudah menjawab <strong className="text-[var(--clay-black)]">{answeredCount} dari {totalQuestions}</strong> soal.
          </p>
          {answeredCount < totalQuestions && (
            <div className="p-3 rounded-[var(--radius-md)] bg-[var(--lemon-400)]/20 border-2 border-[var(--lemon-500)]/30 text-[var(--lemon-800)] flex items-start gap-2">
              <MaterialIcon name="warning" className="text-sm mt-0.5 shrink-0" />
              <span>Masih ada {totalQuestions - answeredCount} soal yang belum dijawab.</span>
            </div>
          )}
          <p className="text-[var(--warm-charcoal)]">
            Setelah selesai, jawaban tidak bisa diubah dan hasil akan langsung terlihat.
          </p>
        </DialogDescription>
        <div className="flex gap-3 mt-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)]"
          >
            Lanjutkan
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] rounded-[var(--radius-lg)]"
          >
            Selesaikan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
