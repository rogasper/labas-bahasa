import { Button } from "@labas/ui/components/button";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { formatTime } from "@/lib/time";

interface AttemptHeaderProps {
  pkgTitle: string;
  currentSectionTitle: string;
  timeElapsed: number;
  answeredCount: number;
  totalQuestions: number;
  isFinished: boolean;
  onAbandon: () => void;
  onFinish: () => void;
}

export function AttemptHeader({
  pkgTitle,
  currentSectionTitle,
  timeElapsed,
  answeredCount,
  totalQuestions,
  isFinished,
  onAbandon,
  onFinish,
}: AttemptHeaderProps) {
  return (
    <header className="bg-[var(--pure-white)] border-b border-[var(--oat-border)] flex justify-between items-center w-full px-6 py-3 shrink-0 z-50">
      <div className="flex items-center gap-4">
        <button
          onClick={onAbandon}
          aria-label="Keluar dari latihan"
          className="text-[var(--warm-charcoal)] hover:text-[var(--clay-black)] transition-colors flex items-center"
        >
          <MaterialIcon name="close" />
        </button>
        <span className="text-xl font-bold tracking-tight text-[var(--clay-black)] truncate max-w-[200px] md:max-w-sm">
          {pkgTitle}
        </span>
        <span className="bg-[var(--oat-light)] px-3 py-1 rounded-full text-xs font-semibold text-[var(--warm-charcoal)] uppercase tracking-widest hidden md:inline-block">
          {currentSectionTitle}
        </span>
      </div>

      <div className="bg-[var(--pure-white)]/70 backdrop-blur-md rounded-xl hidden sm:flex items-center gap-3 px-6 py-2 shadow-sm border border-[var(--oat-border)]">
        <MaterialIcon name="timer" className="text-[var(--matcha-600)]" />
        <div className="flex flex-col">
          <span className="text-[10px] leading-none uppercase font-bold text-[var(--warm-silver)] tracking-tighter">
            Waktu Berlalu
          </span>
          <span className="text-xl font-bold font-headline tabular-nums text-[var(--clay-black)]">
            {formatTime(timeElapsed)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center gap-2">
          <div className="w-24 h-2 bg-[var(--oat-light)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--matcha-600)] transition-all rounded-full"
              style={{ width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs font-bold text-[var(--clay-black)]">
            {answeredCount}/{totalQuestions} Dijawab
          </span>
        </div>
        <button
          className="bg-[var(--oat-light)] p-2 rounded-xl text-[var(--warm-charcoal)] hover:text-[var(--clay-black)] transition-colors sm:hidden"
          aria-label="Waktu berlalu"
        >
          <MaterialIcon name="timer" />
        </button>
        <Button
          onClick={onFinish}
          disabled={isFinished}
          className="bg-[var(--pomegranate-400)] text-[var(--pure-white)] hover:bg-[var(--pomegranate-600)] px-4 py-2 rounded-xl text-sm font-bold transition-opacity"
        >
          Selesai Test
        </Button>
      </div>
    </header>
  );
}
