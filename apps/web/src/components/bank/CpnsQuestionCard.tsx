import { Card, CardContent } from "@labas/ui/components/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { CPNS_SECTION_ICONS, CPNS_SECTION_COLORS } from "@/lib/cpns-constants";

interface CpnsQuestionCardProps {
  question: any;
  isSelected: boolean;
  onToggle: () => void;
  onClick: () => void;
}

export function CpnsQuestionCard({ question: q, isSelected, onToggle, onClick }: CpnsQuestionCardProps) {
  return (
    <Card className={`bg-[var(--pure-white)] border-2 rounded-[var(--radius-lg)] transition-colors ${
      isSelected ? "border-[var(--blueberry-800)]" : "border-[var(--oat-border)] hover:border-[var(--matcha-400)]"
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            aria-label={isSelected ? "Hapus dari paket" : "Pilih soal"}
            className={`mt-0.5 shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${
              isSelected
                ? "bg-[var(--blueberry-800)] border-[var(--blueberry-800)] text-[var(--pure-white)]"
                : "border-[var(--oat-border)] hover:border-[var(--matcha-500)]"
            }`}
          >
            {isSelected && <MaterialIcon name="check" className="text-xs" />}
          </button>
          <button onClick={onClick} className="flex-1 text-left">
            <div className="flex items-start gap-3">
              <div className={`h-8 w-8 rounded-[var(--radius-md)] flex items-center justify-center shrink-0 ${CPNS_SECTION_COLORS[q.sectionTypeId]?.bgOnly ?? "bg-[var(--oat-light)]"}`}>
                <MaterialIcon name={(CPNS_SECTION_ICONS[q.sectionTypeId] ?? "quiz") as any} className="text-xs" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-full bg-[var(--blueberry-800)]/10 text-[var(--blueberry-800)] text-[10px] font-semibold">{q.sectionTypeId}</span>
                  <span className="text-[10px] text-[var(--warm-silver)]">{q.format}</span>
                  <span className="text-[10px] text-[var(--warm-silver)] flex items-center gap-0.5">
                    <MaterialIcon name="signal_cellular_alt" className="text-[10px]" />
                    {q.difficulty}/5
                  </span>
                </div>
                <p className="text-sm text-[var(--clay-black)] line-clamp-2">{q.questionText}</p>
              </div>
            </div>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
