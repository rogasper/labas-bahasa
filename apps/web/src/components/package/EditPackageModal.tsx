import { useState } from "react";
import { Input } from "@labas/ui/components/input";
import { Button } from "@labas/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@labas/ui/components/dialog";

export function EditPackageModal({
  initialTitle,
  initialDescription,
  initialIsPublic,
  onClose,
  onSave,
  isPending,
}: {
  initialTitle: string;
  initialDescription: string | null;
  initialIsPublic: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    description: string;
    isPublic: boolean;
  }) => void;
  isPending: boolean;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [isPublic, setIsPublic] = useState(initialIsPublic);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline font-bold text-[var(--clay-black)]">
            Edit Paket
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[var(--clay-black)] block mb-1">
              Judul Paket
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Judul paket..."
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
            onClick={() => onSave({ title, description, isPublic })}
            disabled={!title || isPending}
            className="flex-1 bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] clay-hover rounded-[var(--radius-lg)]"
          >
            {isPending ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
