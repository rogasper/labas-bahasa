import { Button } from "@labas/ui/components/button";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { formatLabel } from "@/lib/format";
import type { Question } from "@/lib/types";

interface QuestionCardProps {
  q: Question;
  isFeatured?: boolean;
  isInBundle: boolean;
  disabled?: boolean;
  selected?: boolean;
  bulkSelect?: boolean;
  onToggle: () => void;
  onOpenDetail: () => void;
  isOwner: boolean;
  onTogglePublic: () => void;
  onDelete: () => void;
}

export function QuestionCard({
  q,
  isFeatured = false,
  isInBundle,
  disabled = false,
  selected = false,
  bulkSelect = false,
  onToggle,
  onOpenDetail,
  isOwner,
  onTogglePublic,
  onDelete,
}: QuestionCardProps) {
  const isPrivate = isOwner && !q.isPublic;

  return (
    <div
      onClick={() => { if (!disabled) onOpenDetail(); }}
      className={`border-2 rounded-[var(--radius-xl)] h-full flex flex-col transition-all ${
        disabled
          ? "bg-[var(--oat-light)] border-[var(--oat-border)] opacity-40 cursor-not-allowed"
          : selected
            ? "bg-[var(--matcha-100)] border-[var(--matcha-600)] clay-hover cursor-pointer ring-2 ring-[var(--matcha-400)]"
            : isInBundle
              ? "bg-[var(--matcha-100)] border-[var(--clay-black)] clay-shadow clay-hover cursor-pointer"
              : isPrivate
                ? "bg-[var(--pure-white)] border-[var(--oat-border)] border-l-[var(--warm-charcoal)] border-l-4 clay-shadow clay-hover cursor-pointer"
                : "bg-[var(--pure-white)] border-[var(--oat-border)] clay-shadow clay-hover cursor-pointer"
      }`}
    >
      <div className="p-5 flex flex-col h-full">
        <div className="flex items-start justify-between mb-3">
          <div className="flex gap-2 flex-wrap">
            {bulkSelect && (
              <span className={`px-2 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1 ${
                selected
                  ? "bg-[var(--matcha-600)] text-[var(--pure-white)]"
                  : "bg-[var(--oat-light)] text-[var(--warm-charcoal)]"
              }`}>
                <MaterialIcon name={selected ? "check_circle" : "radio_button_unchecked"} className="text-xs" />
                {selected ? "Terpilih" : "Pilih"}
              </span>
            )}
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[var(--matcha-300)] text-[var(--matcha-800)] text-xs font-semibold leading-none whitespace-nowrap">
              {q.examTypeName}
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[var(--slushie-500)]/20 text-[var(--slushie-800)] text-xs font-semibold leading-none whitespace-nowrap">
              {q.sectionTypeName}
            </span>
            {disabled && (
              <span className="px-2 py-1 rounded-full bg-[var(--warm-silver)]/30 text-[var(--warm-charcoal)] text-[10px] font-semibold flex items-center gap-1">
                <MaterialIcon name="lock" className="text-[10px]" />
                Terkunci
              </span>
            )}
          </div>
          {q.avgRating && (
            <div className="flex items-center gap-1 text-[var(--lemon-700)]">
              <MaterialIcon name="star" className="text-sm" />
              <span className="text-xs font-bold">{q.avgRating}</span>
            </div>
          )}
        </div>

        <h3
          className={`font-headline font-bold text-[var(--clay-black)] mb-2 ${
            isFeatured ? "text-xl line-clamp-3" : "text-base line-clamp-2"
          }`}
        >
          {q.questionText}
        </h3>

        <p
          className={`text-sm text-[var(--warm-charcoal)] flex-1 ${
            isFeatured ? "line-clamp-4 mb-4" : "line-clamp-2 mb-4"
          }`}
        >
          {q.passageText}
        </p>

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-[var(--oat-border)]">
          <div className="flex gap-2">
            <span className="px-2 py-0.5 rounded bg-[var(--oat-light)] text-[var(--warm-charcoal)] text-xs font-medium">
              {formatLabel(q.format ?? "")}
            </span>
            <span className="px-2 py-0.5 rounded bg-[var(--oat-light)] text-[var(--warm-charcoal)] text-xs font-medium">
              Lv.{q.difficulty}
            </span>
            <span className="px-2 py-0.5 rounded bg-[var(--oat-light)] text-[var(--warm-charcoal)] text-xs font-medium">
              {q.usageCount}x digunakan
            </span>
          </div>
        </div>

        {/* Actions row */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--oat-border)]">
          {isOwner && !bulkSelect && (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={onTogglePublic}
                title={q.isPublic ? "Klik untuk jadikan privat" : "Klik untuk jadikan publik"}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors cursor-pointer flex items-center gap-1 ${
                  q.isPublic
                    ? "bg-[var(--matcha-300)] text-[var(--matcha-800)]"
                    : "bg-[var(--slushie-500)]/15 text-[var(--slushie-800)]"
                }`}
              >
                {!q.isPublic && <MaterialIcon name="lock" className="text-xs" />}
                {q.isPublic ? "Publik" : "Privat"}
              </button>
              <button
                onClick={onDelete}
                aria-label="Hapus soal"
                className="text-[var(--pomegranate-400)] hover:bg-[var(--pomegranate-400)]/10 px-2 py-1 rounded-full transition-colors cursor-pointer"
              >
                <MaterialIcon name="delete" className="text-sm" />
              </button>
            </div>
          )}
          {!bulkSelect && (
          <Button
            size="sm"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) onToggle();
            }}
            className={`ml-auto rounded-[var(--radius-lg)] text-xs ${
              disabled
                ? "bg-[var(--oat-light)] text-[var(--warm-silver)] cursor-not-allowed"
                : isInBundle
                  ? "bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] cursor-pointer"
                  : "bg-[var(--matcha-300)] text-[var(--matcha-800)] hover:bg-[var(--matcha-400)] cursor-pointer"
            }`}
          >
            {disabled ? "Tidak Tersedia" : isInBundle ? "Hapus dari Paket" : "Tambah ke Paket"}
          </Button>
          )}
        </div>
      </div>
    </div>
  );
}
