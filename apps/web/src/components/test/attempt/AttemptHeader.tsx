import { Button } from "@labas/ui/components/button";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { formatTime } from "@/lib/time";

interface AttemptHeaderProps {
  pkgTitle: string;
  currentSectionTitle: string;
  timeElapsed: number;
  timeLimitSec: number | null;
  answeredCount: number;
  totalQuestions: number;
  isFinished: boolean;
  isTimeUp: boolean;
  onAbandon: () => void;
  onFinish: () => void;
}

export function AttemptHeader({
  pkgTitle,
  currentSectionTitle,
  timeElapsed,
  timeLimitSec,
  answeredCount,
  totalQuestions,
  isFinished,
  isTimeUp,
  onAbandon,
  onFinish,
}: AttemptHeaderProps) {
  const remaining = timeLimitSec !== null ? timeLimitSec - timeElapsed : null;
  const displaySec = remaining !== null ? Math.max(0, remaining) : timeElapsed;
  const isWarning = remaining !== null && remaining <= 300;
  const isCritical = remaining !== null && remaining <= 60;

  return (
    <header className="bg-[var(--pure-white)] border-b border-[var(--oat-border)] flex justify-between items-center w-full px-3 sm:px-6 py-2.5 sm:py-3 shrink-0 z-50 gap-2">
      {/* Left: Close + Title + Section badge */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
        <button
          onClick={onAbandon}
          aria-label="Keluar dari latihan"
          className="text-[var(--warm-charcoal)] hover:text-[var(--clay-black)] transition-colors flex items-center shrink-0"
        >
          <MaterialIcon name="close" />
        </button>
        <span className="text-base sm:text-xl font-bold tracking-tight text-[var(--clay-black)] truncate max-w-[120px] sm:max-w-[200px] md:max-w-sm">
          {pkgTitle}
        </span>
        <span className="bg-[var(--oat-light)] px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold text-[var(--warm-charcoal)] uppercase tracking-widest hidden md:inline-block">
          {currentSectionTitle}
        </span>
      </div>

      {/* Center: Timer — always visible, compact on mobile */}
      <div
        className={`flex items-center gap-1.5 sm:gap-2 shrink-0 bg-[var(--pure-white)]/70 backdrop-blur-md rounded-xl px-2.5 sm:px-4 py-1 sm:py-2 shadow-sm border transition-all ${
          isCritical
            ? "border-[var(--clay-red)] animate-pulse"
            : isWarning
              ? "border-[var(--pomegranate-400)]"
              : "border-[var(--oat-border)]"
        }`}
      >
        <MaterialIcon
          name="timer"
          className={`text-sm sm:text-base ${isCritical ? "text-[var(--clay-red)]" : isWarning ? "text-[var(--pomegranate-400)]" : "text-[var(--matcha-600)]"}`}
        />
        <span
          className={`text-sm sm:text-base sm:text-xl font-bold font-headline tabular-nums ${
            isCritical ? "text-[var(--clay-red)]" : isWarning ? "text-[var(--pomegranate-400)]" : "text-[var(--clay-black)]"
          }`}
        >
          {timeLimitSec !== null ? formatTime(displaySec) : formatTime(timeElapsed)}
        </span>
        <span className="hidden sm:inline text-[10px] leading-none uppercase font-bold text-[var(--warm-silver)] tracking-tighter ml-1">
          {timeLimitSec !== null ? "Sisa" : "Waktu"}
        </span>
      </div>

      {/* Progress bar — hidden on mobile/tablet */}
      <div className="hidden md:flex items-center gap-2 shrink-0">
        <div className="w-16 lg:w-24 h-2 bg-[var(--oat-light)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--matcha-600)] transition-all rounded-full"
            style={{ width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%` }}
          />
        </div>
        <span className="text-xs font-bold text-[var(--clay-black)] whitespace-nowrap">
          {answeredCount}/{totalQuestions}
        </span>
      </div>

      {/* Selesai button */}
      <Button
        onClick={onFinish}
        disabled={isFinished || isTimeUp}
        size="sm"
        className="bg-[var(--matcha-600)] text-[var(--pure-white)] hover:bg-[var(--matcha-800)] px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-opacity shrink-0"
      >
        <span className="hidden sm:inline">{isTimeUp ? "Waktu Habis" : "Selesai Test"}</span>
        <span className="sm:hidden">{isTimeUp ? "Habis" : "Selesai"}</span>
      </Button>
    </header>
  );
}
