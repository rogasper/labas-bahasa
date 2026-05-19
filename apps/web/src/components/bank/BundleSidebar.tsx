import { Button } from "@labas/ui/components/button";
import { Input } from "@labas/ui/components/input";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { formatLabel } from "@/lib/format";

interface BundleItem {
  id: string;
  questionText?: string;
  title?: string;
  examTypeName?: string | null;
  format?: string;
  sectionTypeName?: string | null;
}

interface BundleSidebarProps {
  mode: "soal" | "section";
  bundleQuestions: BundleItem[];
  bundleSections: BundleItem[];
  bundleTitle: string;
  bundleDescription: string;
  bundleIsPublic: boolean;
  isCreating: boolean;
  autoBundleExamType: string | null;
  lockedExamType?: string | null;
  onSetTitle: (v: string) => void;
  onSetDescription: (v: string) => void;
  onSetIsPublic: (v: boolean) => void;
  onRemoveFromBundle: (id: string, type: "question" | "section") => void;
  onCreateFromQuestions: () => void;
  onCreateFromSections: () => void;
  onOpenAutoBundle: () => void;
}

export function BundleSidebar({
  mode,
  bundleQuestions,
  bundleSections,
  bundleTitle,
  bundleDescription,
  bundleIsPublic,
  isCreating,
  autoBundleExamType,
  lockedExamType,
  onSetTitle,
  onSetDescription,
  onSetIsPublic,
  onRemoveFromBundle,
  onCreateFromQuestions,
  onCreateFromSections,
  onOpenAutoBundle,
}: BundleSidebarProps) {
  const activeBundle = mode === "soal" ? bundleQuestions : bundleSections;
  const bundleCount = activeBundle.length;

  return (
    <div data-tour="bank-sidebar" className="lg:col-span-4">
      <div className="sticky top-32 bg-[var(--pure-white)] rounded-[var(--radius-xl)] border-2 border-[var(--oat-border)] clay-shadow overflow-hidden flex flex-col max-h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="p-5 bg-[var(--clay-black)] text-[var(--pure-white)]">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold font-headline">Paket Saat Ini</h3>
            <span className="text-xs font-medium bg-[var(--matcha-600)]/30 px-2 py-1 rounded">DRAFT</span>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm text-[var(--warm-silver)]">
              {bundleCount} {mode === "soal" ? "soal" : "section"} dipilih
            </p>
            {lockedExamType && (
              <span className="text-[10px] font-medium bg-[var(--matcha-600)]/40 text-[var(--matcha-300)] px-2 py-0.5 rounded-full flex items-center gap-1">
                <MaterialIcon name="lock" className="text-[10px]" />
                {lockedExamType}
              </span>
            )}
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[120px]">
          {bundleCount === 0 ? (
            <div className="text-center py-8 text-sm text-[var(--warm-silver)]">
              <MaterialIcon name="inventory_2" className="text-3xl mx-auto mb-2" />
              Belum ada yang dipilih
            </div>
          ) : (
            activeBundle.map((item, idx: number) => {
              const isQ = mode === "soal";
              return (
                <div
                  key={isQ ? item.id : `${item.id}-${idx}`}
                  className="p-3 bg-[var(--oat-light)] rounded-[var(--radius-lg)] flex items-center gap-3 group"
                >
                  <div className="h-8 w-8 bg-[var(--pure-white)] rounded-lg flex items-center justify-center text-[var(--matcha-600)] shrink-0">
                    <MaterialIcon name={isQ ? "quiz" : "folder_open"} className="text-sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-[var(--clay-black)] truncate">
                      {isQ ? item.questionText : item.title}
                    </h4>
                    <p className="text-xs text-[var(--warm-charcoal)]">
                      {isQ
                        ? `${item.examTypeName} \u00B7 ${formatLabel(item.format ?? "")}`
                        : `${item.examTypeName} \u00B7 ${item.sectionTypeName}`}
                    </p>
                  </div>
                  <button
                    onClick={() => onRemoveFromBundle(item.id, isQ ? "question" : "section")}
                    aria-label={`Hapus ${isQ ? "soal" : "section"} dari bundle`}
                    className="text-[var(--warm-silver)] hover:text-[var(--pomegranate-400)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-pointer"
                  >
                    <MaterialIcon name="delete" className="text-sm" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Auto Bundle (only in soal mode) */}
        {mode === "soal" && (
          <div className="p-4 border-t border-[var(--oat-border)] bg-[var(--oat-light)]">
            <div className="bg-[var(--pure-white)] rounded-[var(--radius-lg)] p-4 border-2 border-dashed border-[var(--oat-border)] flex items-center gap-3">
              <div className="bg-[var(--matcha-300)]/20 p-2 rounded-full shrink-0">
                <MaterialIcon name="auto_awesome" className="text-lg text-[var(--matcha-600)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[var(--clay-black)]">Auto Bundle</p>
                <p className="text-xs text-[var(--warm-charcoal)]">AI pilihkan soal otomatis</p>
              </div>
              <Button
                size="sm"
                onClick={onOpenAutoBundle}
                disabled={!autoBundleExamType}
                className="bg-[var(--matcha-600)] text-[var(--pure-white)] hover:bg-[var(--matcha-800)] rounded-[var(--radius-lg)] text-xs px-3 py-1.5 h-auto shrink-0 cursor-pointer"
              >
                <MaterialIcon name="auto_fix_high" className="mr-1 text-xs" />
                Buat
              </Button>
            </div>
          </div>
        )}

        {/* Form & Actions */}
        <div className="p-5 border-t border-[var(--oat-border)] bg-[var(--oat-light)]">
          <div className="space-y-4 mb-5">
            <div>
              <label className="block text-xs font-bold text-[var(--warm-charcoal)] mb-1.5 uppercase">
                Judul Paket
              </label>
              <Input
                value={bundleTitle}
                onChange={(e) => onSetTitle(e.target.value)}
                placeholder="Judul paket..."
                className="w-full bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-lg)] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--warm-charcoal)] mb-1.5 uppercase">
                Deskripsi
              </label>
              <Input
                value={bundleDescription}
                onChange={(e) => onSetDescription(e.target.value)}
                placeholder="Deskripsi singkat..."
                className="w-full bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-lg)] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--warm-charcoal)] mb-1.5 uppercase">
                Visibilitas
              </label>
              <div className="flex gap-2">
                <VisButton active={bundleIsPublic} onClick={() => onSetIsPublic(true)}>
                  Publik
                </VisButton>
                <VisButton active={!bundleIsPublic} onClick={() => onSetIsPublic(false)}>
                  Privat
                </VisButton>
              </div>
            </div>
          </div>
          <Button
            onClick={mode === "soal" ? onCreateFromQuestions : onCreateFromSections}
            disabled={!bundleTitle || bundleCount === 0 || isCreating}
            className="w-full py-3 rounded-[var(--radius-lg)] bg-[var(--clay-black)] text-[var(--pure-white)] font-bold text-sm clay-shadow clay-hover hover:bg-[var(--warm-charcoal)] h-auto cursor-pointer"
          >
            <MaterialIcon name={mode === "soal" ? "folder" : "construction"} />
            <span className="ml-2">
              {isCreating
                ? "Membuat..."
                : mode === "soal"
                  ? "Buat Paket"
                  : "Buat Combo Paket"}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}

function VisButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 text-xs font-bold py-2 rounded-[var(--radius-lg)] transition-colors cursor-pointer ${
        active
          ? "bg-[var(--matcha-600)] text-[var(--pure-white)]"
          : "bg-[var(--pure-white)] text-[var(--warm-charcoal)] border-2 border-[var(--oat-border)]"
      }`}
    >
      {children}
    </button>
  );
}
