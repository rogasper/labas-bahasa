import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@labas/ui/components/button";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { formatTime } from "@/lib/time";
import { trpc } from "@/utils/trpc";
import { QuestionInput } from "./QuestionInput";
import { AccentKeyboard } from "./AccentKeyboard";
import { parseFurigana } from "@/lib/furigana";
import type { Question, Package, PackageSection } from "@/lib/types";
import { AttemptHeader } from "./attempt/AttemptHeader";
import { FloatingNav } from "./attempt/FloatingNav";
import { ResizableSplitPanel } from "./ResizableSplitPanel";
import { FinishDialog } from "./attempt/FinishDialog";
import { AbandonDialog } from "./attempt/AbandonDialog";

interface AttemptTestViewProps {
  attemptId: string;
  pkg: Package & { sections: PackageSection[] };
  currentSectionIdx: number;
  setCurrentSectionIdx: (idx: number) => void;
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, sectionResultId: string | undefined, value: string) => void;
  timeElapsed: number;
  timeLimitSec: number | null;
  answeredCount: number;
  totalQuestions: number;
  onFinish: () => void;
  onAbandon: () => void;
  isFinished: boolean;
  isTimeUp: boolean;
  submittingQId: string | null;
  markedQuestions: Set<string>;
  toggleMarkQuestion: (questionId: string) => void;
  activeQuestionId: string | null;
  setActiveQuestionId: (qId: string | null) => void;
  startQuestionTimer: (questionId: string) => void;
}

interface QuestionCardProps {
  q: Question & { _examType?: string; _isRtl?: boolean; _useFurigana?: boolean };
  globalIdx: number;
  answerValue: string;
  sectionResultId: string | undefined;
  isMarked: boolean;
  isFinished: boolean;
  isSubmitting: boolean;
  onAnswerChange: (questionId: string, sectionResultId: string | undefined, value: string) => void;
  toggleMarkQuestion: (questionId: string) => void;
}

const QuestionCard = memo(function QuestionCard({
  q,
  globalIdx,
  answerValue,
  sectionResultId,
  isMarked,
  isFinished,
  isSubmitting,
  onAnswerChange,
  toggleMarkQuestion,
}: QuestionCardProps) {
  const handleChange = useCallback(
    (val: string) => {
      onAnswerChange(q.id, sectionResultId, val);
    },
    [q.id, sectionResultId, onAnswerChange],
  );

  const handleAccentInsert = useCallback(
    (char: string) => {
      onAnswerChange(q.id, sectionResultId, answerValue + char);
    },
    [q.id, sectionResultId, answerValue, onAnswerChange],
  );

  const showAccentKeyboard = q.format === "fill_blank" || q.format === "sentence_completion";

  return (
    <div
      id={`question-${q.id}`}
      className={`bg-[var(--pure-white)] p-6 md:p-8 rounded-xl shadow-sm border-2 transition-all ${
        isMarked ? "border-[var(--pomegranate-400)]" : "border-transparent"
      }`}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="bg-[var(--clay-black)] text-[var(--pure-white)] w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm">
            {globalIdx}
          </span>
          <h2 className="text-xl font-bold text-[var(--clay-black)] capitalize">
            {(q.format ?? "").replace(/_/g, " ")}
          </h2>
        </div>
        <button
          onClick={() => toggleMarkQuestion(q.id)}
          aria-label={isMarked ? "Hapus tanda" : "Tandai untuk review"}
          className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
            isMarked
              ? "bg-[var(--pomegranate-400)]/20 text-[var(--pomegranate-400)]"
              : "bg-[var(--oat-light)] text-[var(--warm-silver)] hover:text-[var(--pomegranate-400)]"
          }`}
          title={isMarked ? "Hapus tanda" : "Tandai untuk review"}
        >
          <MaterialIcon name={isMarked ? "bookmark" : "bookmark_border"} className="text-lg" />
        </button>
      </div>

      <p className="text-[var(--warm-charcoal)] mb-6 font-medium leading-relaxed" dir={q._isRtl ? "rtl" : undefined}>
        {q._useFurigana ? parseFurigana(q.questionText ?? "") : (q.questionText ?? "")}
      </p>

      <div className="pl-0">
        {isSubmitting && (
          <div className="text-xs text-[var(--matcha-600)] mb-2 flex items-center gap-1">
            <MaterialIcon name="sync" className="text-xs animate-spin" />
            Menyimpan...
          </div>
        )}
        <QuestionInput
          question={q}
          value={answerValue}
          onChange={handleChange}
          disabled={isFinished}
        />
        {showAccentKeyboard && (
          <div className="mt-3">
            <AccentKeyboard
              examType={q._examType}
              onInsert={handleAccentInsert}
              disabled={isFinished}
            />
          </div>
        )}
      </div>
    </div>
  );
});

export function AttemptTestView({
  attemptId,
  pkg,
  currentSectionIdx,
  setCurrentSectionIdx,
  answers,
  onAnswerChange,
  timeElapsed,
  timeLimitSec,
  answeredCount,
  totalQuestions,
  onFinish,
  onAbandon,
  isFinished,
  isTimeUp,
  submittingQId,
  markedQuestions,
  toggleMarkQuestion,
  activeQuestionId,
  setActiveQuestionId,
  startQuestionTimer,
}: AttemptTestViewProps) {
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [showAbandonDialog, setShowAbandonDialog] = useState(false);
  const questionPanelRef = useRef<HTMLDivElement>(null);
  const navSliderRef = useRef<HTMLDivElement>(null);

  const attemptQuery = useQuery(
    trpc.attempt.getById.queryOptions(
      { id: attemptId },
      { enabled: !!attemptId },
    ),
  );
  const attempt = attemptQuery.data;
  const currentSection = pkg.sections[currentSectionIdx];
  const sectionData = attempt?.sections?.[currentSectionIdx];
  const sectionResultId = sectionData?.sectionResultId;
  const examType: string = pkg.examTypeName ?? "";
  const isRtl = examType === "TOAFL";
  const useFurigana = examType === "JLPT" || examType === "TOPIK";
  const isCpns = pkg.examTypeId === "CPNS";

  // If user picks an answer before attempt.getById finishes, persist once sectionResultId exists
  const flushKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!sectionResultId || isFinished || !currentSection?.questions?.length) return;
    const key = `${currentSectionIdx}:${sectionResultId}`;
    if (flushKeyRef.current === key) return;
    flushKeyRef.current = key;
    for (const q of currentSection.questions ?? []) {
      const v = answers[q.id];
      if (v) void onAnswerChange(q.id, sectionResultId, v);
    }
    /* flush once per section when ids align; `answers` read from committing render */
  }, [sectionResultId, currentSectionIdx, isFinished, currentSection?.questions?.length, onAnswerChange]);

  if (!currentSection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--warm-cream)]">
        <p className="text-[var(--warm-charcoal)]">Section tidak ditemukan.</p>
      </div>
    );
  }

  // Build global question index across all sections
  const allQuestions: Array<{ id: string; sectionIdx: number; localIdx: number; passageText?: string; passageId?: string | null }> = [];
  pkg.sections.forEach((sec: PackageSection, sIdx: number) => {
    sec.questions?.forEach((q: Question, qIdx: number) => {
      allQuestions.push({ id: q.id, sectionIdx: sIdx, localIdx: qIdx, passageText: q.passageText ?? undefined, passageId: q.passageId ?? undefined });
    });
  });

  // Init active question on mount: use saved (localStorage) or fallback to first
  const allQuestionIdsRef = useRef(new Set<string>());
  useEffect(() => {
    if (allQuestions.length === 0) return;
    allQuestionIdsRef.current = new Set(allQuestions.map((q) => q.id));
    const isValid = activeQuestionId && allQuestionIdsRef.current.has(activeQuestionId);
    if (!isValid) {
      setActiveQuestionId(allQuestions[0].id);
    }
  }, [activeQuestionId, allQuestions, setActiveQuestionId]);

  const addQuestionMeta = (q: Question) => ({
    ...q,
    _examType: examType,
    _isRtl: isRtl,
    _useFurigana: useFurigana,
  });

  const activeQuestion = currentSection?.questions?.find(
    (q: Question) => q.id === activeQuestionId,
  );
  const activeQuestionWithMeta = activeQuestion ? addQuestionMeta(activeQuestion) : null;
  const passageToShow =
    activeQuestion?.passageText ??
    currentSection?.questions?.[0]?.passageText ??
    "Tidak ada bacaan tambahan untuk section ini.";

  const activeGlobalIdx = activeQuestionId
    ? allQuestions.findIndex((q) => q.id === activeQuestionId) + 1
    : 0;

  const isFirstQuestion = activeGlobalIdx === 1;
  const isLastQuestion = activeGlobalIdx === allQuestions.length;

  // Navigation helpers
  const goToQuestion = useCallback(
    (qId: string | null) => {
      if (!qId) return;
      const target = allQuestions.find((q) => q.id === qId);
      if (!target) return;
      setCurrentSectionIdx(target.sectionIdx);
      setActiveQuestionId(qId);
      // Scroll question panel to top when changing question
      setTimeout(() => {
        questionPanelRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      }, 50);
      // Scroll nav slider to keep active button visible
      setTimeout(() => {
        const btn = navSliderRef.current?.querySelector(`[data-qid="${qId}"]`) as HTMLElement | null;
        btn?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }, 100);
    },
    [allQuestions, setCurrentSectionIdx],
  );

  const goToPrevQuestion = useCallback(() => {
    if (!activeQuestionId) return;
    const currentIdx = allQuestions.findIndex((q) => q.id === activeQuestionId);
    if (currentIdx > 0) {
      goToQuestion(allQuestions[currentIdx - 1].id);
    }
  }, [activeQuestionId, allQuestions, goToQuestion]);

  const goToNextQuestion = useCallback(() => {
    if (!activeQuestionId) return;
    const currentIdx = allQuestions.findIndex((q) => q.id === activeQuestionId);
    if (currentIdx >= 0 && currentIdx < allQuestions.length - 1) {
      goToQuestion(allQuestions[currentIdx + 1].id);
    }
  }, [activeQuestionId, allQuestions, goToQuestion]);

  return (
    <>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--oat-border); border-radius: 10px; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div
        className="h-full flex flex-col bg-[var(--warm-cream)] overflow-hidden"
        style={isCpns ? {
          "--matcha-600": "var(--blueberry-800)",
          "--matcha-500": "var(--blueberry-800)",
          "--matcha-400": "#5b8cba",
          "--matcha-300": "#c2d9f5",
          "--matcha-800": "var(--blueberry-800)",
          "--matcha-700": "var(--blueberry-800)",
          "--matcha-100": "#c2d9f5",
          "--matcha-50": "#d6e6f8",
        } as React.CSSProperties : undefined}
      >
        <AttemptHeader
          pkgTitle={pkg.title ?? ""}
          currentSectionTitle={currentSection.title ?? ""}
          timeElapsed={timeElapsed}
          timeLimitSec={timeLimitSec}
          answeredCount={answeredCount}
          totalQuestions={totalQuestions}
          isFinished={isFinished}
          isTimeUp={isTimeUp}
          onAbandon={() => setShowAbandonDialog(true)}
          onFinish={() => setShowFinishDialog(true)}
        />

        {/* Main Exam Workspace */}
        <main className="flex-1 overflow-hidden">
          <ResizableSplitPanel
            left={
              <section className="h-full bg-[var(--pure-white)] overflow-y-auto custom-scrollbar p-6 md:p-12 border-b lg:border-b-0 lg:border-r border-[var(--oat-border)]">
                <article className="max-w-2xl mx-auto">
                  <header className="mb-8">
                    <h1 className="text-3xl font-extrabold text-[var(--clay-black)] mb-4 leading-tight">
                      {currentSection.title}
                    </h1>
                    <div className="flex gap-4 text-sm text-[var(--warm-silver)] italic">
                      <span>Section {currentSectionIdx + 1} dari {pkg.sections.length}</span>
                    </div>
                  </header>
                  <div className="space-y-6 text-lg leading-relaxed text-[var(--warm-charcoal)] font-body whitespace-pre-wrap" dir={isRtl ? "rtl" : undefined}>
                    {useFurigana ? parseFurigana(passageToShow) : passageToShow}
                  </div>
                </article>
              </section>
            }
            right={
              <section ref={questionPanelRef} className="h-full bg-[var(--warm-cream)] overflow-y-auto custom-scrollbar p-6 md:p-10 relative">
                <div className="max-w-2xl mx-auto pb-32">

              {/* Nav bar with counter + prev/next */}
              <nav className="flex items-center justify-between mb-6" aria-label="Navigasi soal">
                <Button
                  variant="ghost"
                  onClick={goToPrevQuestion}
                  disabled={isFirstQuestion}
                  className="flex items-center gap-2 text-[var(--clay-black)] font-bold px-4 sm:px-6 py-3 rounded-xl hover:bg-[var(--clay-black)]/5 transition-all disabled:opacity-50"
                >
                  <MaterialIcon name="arrow_back" />
                  <span className="hidden sm:inline">Sebelumnya</span>
                </Button>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-[var(--warm-charcoal)] bg-[var(--oat-light)] px-3 py-1.5 rounded-lg tabular-nums">
                    Soal {activeGlobalIdx} / {totalQuestions}
                  </span>
                  {markedQuestions.has(activeQuestionId ?? "") && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-[var(--pomegranate-400)] bg-[var(--pomegranate-400)]/10 px-2 py-1 rounded-full">
                      <MaterialIcon name="bookmark" className="text-xs" />
                      Ditandai
                    </span>
                  )}
                </div>

                <Button
                  onClick={goToNextQuestion}
                  disabled={isLastQuestion}
                  className="flex items-center gap-2 bg-[var(--clay-black)] text-[var(--pure-white)] font-bold px-4 sm:px-8 py-3 rounded-xl shadow-lg hover:bg-[var(--warm-charcoal)] transition-all disabled:opacity-50"
                >
                  <span className="hidden sm:inline">Selanjutnya</span>
                  <MaterialIcon name="arrow_forward" />
                </Button>
              </nav>

              {/* Active question only */}
              {activeQuestionWithMeta ? (
                <QuestionCard
                  key={activeQuestionWithMeta.id}
                  q={activeQuestionWithMeta}
                  globalIdx={activeGlobalIdx}
                  answerValue={answers[activeQuestionWithMeta.id] ?? ""}
                  sectionResultId={sectionResultId}
                  isMarked={markedQuestions.has(activeQuestionWithMeta.id)}
                  isFinished={isFinished}
                  isSubmitting={submittingQId === activeQuestionWithMeta.id}
                  onAnswerChange={onAnswerChange}
                  toggleMarkQuestion={toggleMarkQuestion}
                />
              ) : (
                <div className="text-center py-20">
                  <p className="text-[var(--warm-charcoal)]">Tidak ada soal aktif.</p>
                </div>
              )}

            </div>
          </section>
        }
      />
        </main>

        <FloatingNav
          questions={allQuestions}
          activeQuestionId={activeQuestionId}
          answers={answers}
          markedQuestions={markedQuestions}
          onGoToQuestion={goToQuestion}
          onScrollToTop={() => questionPanelRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
          navSliderRef={navSliderRef}
        />
      </div>

      <FinishDialog
        open={showFinishDialog}
        onClose={() => setShowFinishDialog(false)}
        onConfirm={() => {
          setShowFinishDialog(false);
          onFinish();
        }}
        answeredCount={answeredCount}
        totalQuestions={totalQuestions}
      />

      <AbandonDialog
        open={showAbandonDialog}
        onClose={() => setShowAbandonDialog(false)}
        onConfirm={() => {
          setShowAbandonDialog(false);
          onAbandon();
        }}
      />
    </>
  );
}
