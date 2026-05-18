import type { RefObject } from "react";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

interface FloatingNavProps {
  questions: Array<{ id: string }>;
  activeQuestionId: string | null;
  answers: Record<string, string>;
  markedQuestions: Set<string>;
  onGoToQuestion: (qId: string) => void;
  onScrollToTop: () => void;
  navSliderRef?: RefObject<HTMLDivElement | null>;
}

export function FloatingNav({
  questions,
  activeQuestionId,
  answers,
  markedQuestions,
  onGoToQuestion,
  onScrollToTop,
  navSliderRef,
}: FloatingNavProps) {
  const isAnswered = (qId: string) => !!answers[qId];
  const isMarked = (qId: string) => markedQuestions.has(qId);

  return (
    <nav
      className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-[var(--clay-black)]/95 backdrop-blur-md rounded-full shadow-2xl border border-white/10 z-40 max-w-[90vw]"
      aria-label="Navigasi soal"
    >
      <button
        onClick={() => {
          navSliderRef?.current?.scrollBy({ left: -200, behavior: "smooth" });
        }}
        className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all"
        aria-label="Geser navigasi ke kiri"
      >
        <MaterialIcon name="chevron_left" className="text-sm" />
      </button>

      <div
        ref={navSliderRef}
        className="flex items-center gap-1 overflow-x-auto hide-scrollbar max-w-[60vw] sm:max-w-[50vw] md:max-w-[40vw] lg:max-w-[30vw]"
        role="tablist"
        aria-label="Daftar soal"
      >
        {questions.map((q, gIdx) => {
          const answered = isAnswered(q.id);
          const marked = isMarked(q.id);
          const isActive = q.id === activeQuestionId;

          return (
            <button
              key={q.id}
              data-qid={q.id}
              onClick={() => onGoToQuestion(q.id)}
              role="tab"
              aria-selected={isActive}
              aria-label={`Soal ${gIdx + 1}${marked ? " (ditandai)" : ""}${answered ? " (sudah dijawab)" : ""}`}
              className={`relative w-7 h-7 sm:w-8 sm:h-8 shrink-0 flex items-center justify-center rounded-full font-bold text-[10px] sm:text-xs transition-all ${
                answered
                  ? "bg-[var(--matcha-600)] text-[var(--pure-white)]"
                  : isActive
                    ? "bg-white/30 text-white"
                    : "bg-white/10 text-white/60 hover:bg-white/20"
              }`}
            >
              {gIdx + 1}
              {marked && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[var(--pomegranate-400)] rounded-full border border-[var(--clay-black)]" />
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => {
          navSliderRef?.current?.scrollBy({ left: 200, behavior: "smooth" });
        }}
        className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all"
        aria-label="Geser navigasi ke kanan"
      >
        <MaterialIcon name="chevron_right" className="text-sm" />
      </button>

      <div className="w-px h-6 bg-white/10 shrink-0" />

      <button
        onClick={onScrollToTop}
        className="flex items-center gap-1 px-3 py-2 shrink-0 rounded-full text-white/80 font-semibold text-xs hover:text-white transition-all"
        aria-label="Kembali ke atas"
      >
        <MaterialIcon name="arrow_upward" className="text-sm" />
        <span className="hidden sm:inline">Atas</span>
      </button>
    </nav>
  );
}
