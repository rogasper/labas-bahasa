import { useMemo } from "react";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

type FilterStatus = "all" | "wrong" | "correct" | "marked";

interface ReviewFilterBarProps {
  filterStatus: FilterStatus;
  setFilterStatus: (v: FilterStatus) => void;
  filterSkills: string[];
  setFilterSkills: (v: string[]) => void;
  questions: Array<{ skillTags: string[]; isCorrect: boolean | null }>;
  markedCount: number;
  allExpanded: boolean;
  onToggleAllExpanded: () => void;
}

export function ReviewFilterBar({
  filterStatus,
  setFilterStatus,
  filterSkills,
  setFilterSkills,
  questions,
  markedCount,
  allExpanded,
  onToggleAllExpanded,
}: ReviewFilterBarProps) {
  const counts = useMemo(() => {
    const total = questions.length;
    const wrong = questions.filter((q) => q.isCorrect === false).length;
    const correct = questions.filter((q) => q.isCorrect === true).length;
    return { total, wrong, correct, marked: markedCount };
  }, [questions, markedCount]);

  const allSkillTags = useMemo(() => {
    const tags = new Set<string>();
    for (const q of questions) {
      if (q.skillTags) q.skillTags.forEach((t) => tags.add(t));
    }
    return Array.from(tags);
  }, [questions]);

  const statusFilters: { id: FilterStatus; label: string; count: number; icon: string }[] = [
    { id: "all", label: "Semua", count: counts.total, icon: "list" },
    { id: "wrong", label: "Salah", count: counts.wrong, icon: "cancel" },
    { id: "correct", label: "Benar", count: counts.correct, icon: "check_circle" },
    { id: "marked", label: "Parsial", count: counts.marked, icon: "pending" },
  ];

  const toggleSkill = (skill: string) => {
    setFilterSkills(
      filterSkills.includes(skill)
        ? filterSkills.filter((s) => s !== skill)
        : [...filterSkills, skill],
    );
  };

  return (
    <div className="sticky top-0 z-10 bg-[var(--warm-cream)] pb-4 pt-2 space-y-3">
      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map(({ id, label, count, icon }) => (
          <button
            key={id}
            onClick={() => setFilterStatus(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              filterStatus === id
                ? "bg-[var(--clay-black)] text-[var(--pure-white)]"
                : "bg-[var(--pure-white)] text-[var(--warm-charcoal)] border-2 border-[var(--oat-border)] hover:bg-[var(--oat-light)]"
            }`}
          >
            <MaterialIcon name={icon} className="text-xs" />
            {label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              filterStatus === id ? "bg-white/20" : "bg-[var(--oat-light)]"
            }`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Skill tag filters */}
      {allSkillTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allSkillTags.map((tag) => {
            const isActive = filterSkills.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleSkill(tag)}
                className={`rounded-full text-[10px] font-medium transition-all ${
                  isActive
                    ? "bg-[var(--matcha-300)] text-[var(--matcha-800)] px-3 py-1.5"
                    : "bg-[var(--oat-light)] text-[var(--warm-charcoal)] hover:bg-[var(--matcha-300)] px-2.5 py-1"
                }`}
              >
                <span className="inline-flex items-center gap-1">
                  {tag}
                  {isActive && <MaterialIcon name="close" className="text-[10px]" />}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Expand/Collapse All */}
      <div className="flex justify-end">
        <button
          onClick={onToggleAllExpanded}
          className="flex items-center gap-1 text-xs font-medium text-[var(--matcha-600)] hover:text-[var(--matcha-800)] transition-colors"
        >
          <MaterialIcon name={allExpanded ? "unfold_less" : "unfold_more"} className="text-xs" />
          {allExpanded ? "Tutup Semua" : "Buka Semua"}
        </button>
      </div>
    </div>
  );
}
