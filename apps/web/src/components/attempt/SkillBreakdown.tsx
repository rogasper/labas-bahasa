import { useMemo } from "react";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

interface SkillBreakdownProps {
  questions: Array<{
    skillTags: string[];
    isCorrect: boolean | null;
  }>;
  onSkillClick: (skill: string) => void;
  activeSkills: string[];
}

export function SkillBreakdown({ questions, onSkillClick, activeSkills }: SkillBreakdownProps) {
  const skillStats = useMemo(() => {
    const stats = new Map<string, { total: number; correct: number }>();
    for (const q of questions) {
      if (!q.skillTags) continue;
      for (const tag of q.skillTags) {
        const prev = stats.get(tag) ?? { total: 0, correct: 0 };
        prev.total++;
        if (q.isCorrect) prev.correct++;
        stats.set(tag, prev);
      }
    }
    return Array.from(stats.entries())
      .map(([skill, { total, correct }]) => ({
        skill,
        total,
        correct,
        pct: total > 0 ? Math.round((correct / total) * 100) : 0,
      }))
      .sort((a, b) => a.pct - b.pct);
  }, [questions]);

  if (skillStats.length === 0) return null;

  return (
    <div className="space-y-3">
      {skillStats.map(({ skill, total, correct, pct }) => {
        const isActive = activeSkills.includes(skill);
        const barColor = pct >= 80 ? "bg-[var(--matcha-600)]" : pct >= 50 ? "bg-[var(--lemon-500)]" : "bg-[var(--pomegranate-400)]";

        return (
          <button
            key={skill}
            onClick={() => onSkillClick(skill)}
            className={`w-full text-left transition-all rounded-[var(--radius-lg)] p-3 ${
              isActive ? "bg-[var(--matcha-300)]/10 ring-2 ring-[var(--matcha-600)]" : "hover:bg-[var(--oat-light)]"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold text-[var(--clay-black)] flex items-center gap-1.5">
                {skill}
                {isActive && <MaterialIcon name="filter_alt" className="text-xs text-[var(--matcha-600)]" />}
              </span>
              <span className="text-xs font-medium text-[var(--warm-charcoal)]">{correct}/{total}</span>
            </div>
            <div className="w-full h-3 bg-[var(--oat-light)] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between mt-0.5">
              <span className="text-[10px] text-[var(--warm-silver)]">{pct}% benar</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
