import { useState } from "react";
import { Input } from "@labas/ui/components/input";
import { Button } from "@labas/ui/components/button";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

export function AutoBundleModal({
  availableCount,
  examTypeName,
  sectionTypeName,
  onClose,
  onCreate,
  isPending,
}: {
  availableCount: number;
  examTypeName: string;
  sectionTypeName: string;
  onClose: () => void;
  onCreate: (data: {
    title: string;
    description: string;
    isPublic: boolean;
    count: number;
    sortOrder: "random" | "difficulty";
  }) => void;
  isPending: boolean;
}) {
  const dateStr = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  const [count, setCount] = useState(Math.min(availableCount, 10));
  const [title, setTitle] = useState(`${examTypeName} ${sectionTypeName} Bundle — ${dateStr}`);
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [sortOrder, setSortOrder] = useState<"random" | "difficulty">("random");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[var(--warm-cream)] w-full max-w-lg rounded-[var(--radius-xl)] border-2 border-[var(--oat-border)] clay-shadow p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-headline font-bold text-[var(--clay-black)]">
            Auto Bundle
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[var(--oat-light)] hover:bg-[var(--oat-border)] flex items-center justify-center transition-colors"
          >
            <MaterialIcon name="close" className="text-[var(--clay-black)]" />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className="px-3 py-1 rounded-full bg-[var(--matcha-300)] text-[var(--matcha-800)] text-sm font-semibold">
            {examTypeName}
          </span>
          {sectionTypeName && (
            <span className="px-3 py-1 rounded-full bg-[var(--slushie-500)]/20 text-[var(--slushie-800)] text-sm font-semibold">
              {sectionTypeName}
            </span>
          )}
          <span className="text-sm text-[var(--warm-charcoal)]">
            {availableCount} soal tersedia
          </span>
        </div>

        {availableCount < 5 && (
          <div className="mb-4 p-3 rounded-[var(--radius-md)] bg-[var(--lemon-400)]/20 border-2 border-[var(--lemon-500)]/30 text-sm text-[var(--lemon-800)] flex items-start gap-2">
            <MaterialIcon name="info" className="text-sm mt-0.5 shrink-0" />
            <span>
              Soal yang tersedia sedikit ({availableCount} soal). Paket tetap bisa dibuat, tapi disarankan untuk menambah soal.
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

          <div>
            <label className="text-sm font-medium text-[var(--clay-black)] block mb-1">
              Jumlah Soal: {count}
            </label>
            <input
              type="range"
              min={1}
              max={availableCount}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full h-2 bg-[var(--warm-silver)] rounded-full appearance-none cursor-pointer accent-[var(--clay-black)]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--clay-black)] block mb-1">
              Urutan Soal
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setSortOrder("random")}
                className={`flex-1 py-2 px-3 rounded-[var(--radius-md)] text-sm font-semibold transition-all ${
                  sortOrder === "random"
                    ? "bg-[var(--clay-black)] text-[var(--pure-white)] clay-shadow"
                    : "bg-[var(--pure-white)] text-[var(--warm-charcoal)] border-2 border-[var(--oat-border)] hover:bg-[var(--oat-light)]"
                }`}
              >
                <MaterialIcon name="shuffle" className="text-sm mr-1" />
                Acak
              </button>
              <button
                onClick={() => setSortOrder("difficulty")}
                className={`flex-1 py-2 px-3 rounded-[var(--radius-md)] text-sm font-semibold transition-all ${
                  sortOrder === "difficulty"
                    ? "bg-[var(--clay-black)] text-[var(--pure-white)] clay-shadow"
                    : "bg-[var(--pure-white)] text-[var(--warm-charcoal)] border-2 border-[var(--oat-border)] hover:bg-[var(--oat-light)]"
                }`}
              >
                <MaterialIcon name="trending_up" className="text-sm mr-1" />
                Difficulty
              </button>
            </div>
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
            onClick={() =>
              onCreate({
                title,
                description,
                isPublic,
                count,
                sortOrder,
              })
            }
            disabled={!title || isPending || count < 1}
            className="flex-1 bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] clay-hover rounded-[var(--radius-lg)]"
          >
            {isPending ? "Membuat..." : "Buat Paket"}
          </Button>
        </div>
      </div>
    </div>
  );
}
