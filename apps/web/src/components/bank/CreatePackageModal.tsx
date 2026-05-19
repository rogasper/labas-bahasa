import { useState } from "react";
import { Input } from "@labas/ui/components/input";
import { Button } from "@labas/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@labas/ui/components/dialog";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

export function CreatePackageModal({
  selectedCount,
  onClose,
  onCreate,
  isPending,
  examTypeName,
  lowCount,
}: {
  selectedCount: number;
  onClose: () => void;
  onCreate: (data: { title: string; description: string; isPublic: boolean }) => void;
  isPending: boolean;
  examTypeName: string;
  lowCount: boolean;
}) {
  const [title, setTitle] = useState(`${examTypeName} Bundle — ${selectedCount} Soal`);
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline font-bold text-[var(--clay-black)]">
            Buat Paket Soal
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          <span className="px-3 py-1 rounded-full bg-[var(--matcha-300)] text-[var(--matcha-800)] text-sm font-semibold">
            {examTypeName}
          </span>
          <span className="text-sm text-[var(--warm-charcoal)]">
            {selectedCount} soal
          </span>
        </div>

        {lowCount && (
          <div className="mb-4 p-3 rounded-[var(--radius-md)] bg-[var(--lemon-400)]/20 border-2 border-[var(--lemon-500)]/30 text-sm text-[var(--lemon-800)] flex items-start gap-2">
            <MaterialIcon name="info" className="text-sm mt-0.5 shrink-0" />
            <span>
              Soal yang tersedia sedikit ({selectedCount} soal). Paket tetap bisa dibuat, tapi disarankan untuk menambah soal.
            </span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[var(--clay-black)] block mb-1">
              Judul Paket
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. IELTS Reading Bundle"
              className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--clay-black)] block mb-1">
              Deskripsi
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi singkat..."
              className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)]"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--oat-border)]"
            />
            <span className="text-sm text-[var(--warm-charcoal)]">
              Publikasikan ke Bank Soal
            </span>
          </label>
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] clay-hover"
          >
            Batal
          </Button>
          <Button
            onClick={() => onCreate({ title, description, isPublic })}
            disabled={!title || isPending}
            className="flex-1 bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] clay-hover rounded-[var(--radius-lg)]"
          >
            {isPending ? "Membuat..." : "Buat Paket"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
