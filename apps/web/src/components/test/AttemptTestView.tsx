import { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@labas/ui/components/button";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { formatTime } from "@/lib/time";
import { trpc } from "@/utils/trpc";
import { QuestionInput } from "./QuestionInput";

interface AttemptTestViewProps {
  attemptId: string;
  pkg: any;
  currentSectionIdx: number;
  setCurrentSectionIdx: (idx: number) => void;
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, sectionResultId: string | undefined, value: string) => void;
  timeElapsed: number;
  answeredCount: number;
  totalQuestions: number;
  onFinish: () => void;
  onAbandon: () => void;
  isFinished: boolean;
  submittingQId: string | null;
  markedQuestions: Set<string>;
  toggleMarkQuestion: (questionId: string) => void;
  startQuestionTimer: (questionId: string) => void;
}

export function AttemptTestView({
  attemptId,
  pkg,
  currentSectionIdx,
  setCurrentSectionIdx,
  answers,
  onAnswerChange,
  timeElapsed,
  answeredCount,
  totalQuestions,
  onFinish,
  onAbandon,
  isFinished,
  submittingQId,
  markedQuestions,
  toggleMarkQuestion,
  startQuestionTimer,
}: AttemptTestViewProps) {
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [showAbandonDialog, setShowAbandonDialog] = useState(false);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const questionPanelRef = useRef<HTMLDivElement>(null);
  const navSliderRef = useRef<HTMLDivElement>(null);

  console.log("[AttemptTestView] render, attemptId:", attemptId, "sections:", pkg.sections?.length);

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

  // If user picks an answer before attempt.getById finishes, persist once sectionResultId exists
  const flushKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!sectionResultId || isFinished || !currentSection?.questions?.length) return;
    const key = `${currentSectionIdx}:${sectionResultId}`;
    if (flushKeyRef.current === key) return;
    flushKeyRef.current = key;
    for (const q of currentSection.questions as any[]) {
      const v = answers[q.id];
      if (v) void onAnswerChange(q.id, sectionResultId, v);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- flush once per section when ids align; `answers` read from committing render
  }, [sectionResultId, currentSectionIdx, isFinished, currentSection?.questions?.length, onAnswerChange]);

  // Auto-scroll nav slider to first question of current section
  useEffect(() => {
    const firstQuestion = allQuestions.find((q) => q.sectionIdx === currentSectionIdx);
    if (!firstQuestion || !navSliderRef.current) return;
    const btn = navSliderRef.current.querySelector(`[data-qid="${firstQuestion.id}"]`) as HTMLElement | null;
    btn?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSectionIdx]);

  if (!currentSection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--warm-cream)]">
        <p className="text-[var(--warm-charcoal)]">Section tidak ditemukan.</p>
      </div>
    );
  }

  // Build global question index across all sections
  const allQuestions: Array<{ id: string; sectionIdx: number; localIdx: number; passageText?: string }> = [];
  pkg.sections.forEach((sec: any, sIdx: number) => {
    sec.questions.forEach((q: any, qIdx: number) => {
      allQuestions.push({ id: q.id, sectionIdx: sIdx, localIdx: qIdx, passageText: q.passageText });
    });
  });

  const isAnswered = (qId: string) => !!answers[qId];
  const isMarked = (qId: string) => markedQuestions.has(qId);

  // Default to first question when section changes
  useEffect(() => {
    if (currentSection?.questions?.length) {
      setActiveQuestionId(currentSection.questions[0]?.id ?? null);
    }
  }, [currentSectionIdx, currentSection?.questions]);

  const activeQuestion = currentSection?.questions?.find(
    (q: any) => q.id === activeQuestionId,
  );
  const passageToShow =
    activeQuestion?.passageText ??
    currentSection?.questions?.[0]?.passageText ??
    "Tidak ada bacaan tambahan untuk section ini.";

  return (
    <>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--oat-border); border-radius: 10px; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      
      <div className="h-full flex flex-col bg-[var(--warm-cream)] overflow-hidden">
        {/* TopAppBar Shell */}
        <header className="bg-[var(--pure-white)] border-b border-[var(--oat-border)] flex justify-between items-center w-full px-6 py-3 shrink-0 z-50">
          <div className="flex items-center gap-4">
            <button onClick={() => setShowAbandonDialog(true)} className="text-[var(--warm-charcoal)] hover:text-[var(--clay-black)] transition-colors flex items-center">
              <MaterialIcon name="close" />
            </button>
            <span className="text-xl font-bold tracking-tight text-[var(--clay-black)] truncate max-w-[200px] md:max-w-sm">{pkg.title}</span>
            <span className="bg-[var(--oat-light)] px-3 py-1 rounded-full text-xs font-semibold text-[var(--warm-charcoal)] uppercase tracking-widest hidden md:inline-block">
              {currentSection.title}
            </span>
          </div>

          {/* Timer Box */}
          <div className="bg-[var(--pure-white)]/70 backdrop-blur-md rounded-xl hidden sm:flex items-center gap-3 px-6 py-2 shadow-sm border border-[var(--oat-border)]">
            <MaterialIcon name="timer" className="text-[var(--matcha-600)]" />
            <div className="flex flex-col">
              <span className="text-[10px] leading-none uppercase font-bold text-[var(--warm-silver)] tracking-tighter">Waktu Berlalu</span>
              <span className="text-xl font-bold font-headline tabular-nums text-[var(--clay-black)]">{formatTime(timeElapsed)}</span>
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
              <span className="text-xs font-bold text-[var(--clay-black)]">{answeredCount}/{totalQuestions} Dijawab</span>
            </div>
            <button className="bg-[var(--oat-light)] p-2 rounded-xl text-[var(--warm-charcoal)] hover:text-[var(--clay-black)] transition-colors sm:hidden">
               <MaterialIcon name="timer" />
            </button>
            <Button
              onClick={() => setShowFinishDialog(true)}
              disabled={isFinished}
              className="bg-[var(--pomegranate-500)] text-[var(--pure-white)] hover:bg-[var(--pomegranate-600)] px-4 py-2 rounded-xl text-sm font-bold transition-opacity"
            >
              Selesai Test
            </Button>
          </div>
        </header>

        {/* Main Exam Workspace */}
        <main className="flex-1 flex overflow-hidden flex-col lg:flex-row">
          {/* Left Column: Reading Passage */}
          <section className="w-full lg:w-1/2 bg-[var(--pure-white)] overflow-y-auto custom-scrollbar p-6 md:p-12 border-b lg:border-b-0 lg:border-r border-[var(--oat-border)] h-1/2 lg:h-full">
            <article className="max-w-2xl mx-auto">
              <header className="mb-8">
                <h1 className="text-3xl font-extrabold text-[var(--clay-black)] mb-4 leading-tight">
                  {currentSection.title}
                </h1>
                <div className="flex gap-4 text-sm text-[var(--warm-silver)] italic">
                  <span>Section {currentSectionIdx + 1} dari {pkg.sections.length}</span>
                </div>
              </header>
              <div className="space-y-6 text-lg leading-relaxed text-[var(--warm-charcoal)] font-body whitespace-pre-wrap">
                {passageToShow}
              </div>
            </article>
          </section>

          {/* Right Column: Question Panel */}
          <section ref={questionPanelRef} className="w-full lg:w-1/2 bg-[var(--warm-cream)] overflow-y-auto custom-scrollbar p-6 md:p-10 relative h-1/2 lg:h-full">
            <div className="max-w-2xl mx-auto space-y-8 pb-32">
              {currentSection.questions.map((q: any) => {
                const answerValue = answers[q.id] ?? "";
                const globalIdx = allQuestions.findIndex((aq) => aq.id === q.id) + 1;

                return (
                  <div
                    key={q.id}
                    id={`question-${q.id}`}
                    className={`bg-[var(--pure-white)] p-6 md:p-8 rounded-xl shadow-sm border-2 transition-all ${
                      isMarked(q.id) ? "border-[var(--pomegranate-400)]" : "border-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <span className="bg-[var(--clay-black)] text-[var(--pure-white)] w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm">
                          {globalIdx}
                        </span>
                        <h2 className="text-xl font-bold text-[var(--clay-black)] capitalize">
                          {q.format.replace(/_/g, " ")}
                        </h2>
                      </div>
                      <button
                        onClick={() => toggleMarkQuestion(q.id)}
                        className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
                          isMarked(q.id)
                            ? "bg-[var(--pomegranate-400)]/20 text-[var(--pomegranate-400)]"
                            : "bg-[var(--oat-light)] text-[var(--warm-silver)] hover:text-[var(--pomegranate-400)]"
                        }`}
                        title={isMarked(q.id) ? "Hapus tanda" : "Tandai untuk review"}
                      >
                        <MaterialIcon name={isMarked(q.id) ? "bookmark" : "bookmark_border"} className="text-lg" />
                      </button>
                    </div>

                    <p className="text-[var(--warm-charcoal)] mb-6 font-medium leading-relaxed">
                      {q.questionText}
                    </p>

                    <div className="pl-0">
                      {submittingQId === q.id && (
                        <div className="text-xs text-[var(--matcha-600)] mb-2 flex items-center gap-1">
                          <MaterialIcon name="sync" className="text-xs animate-spin" />
                          Menyimpan...
                        </div>
                      )}
                      <QuestionInput
                        question={q}
                        value={answerValue}
                        onChange={(val) => {
                          onAnswerChange(q.id, sectionResultId, val);
                        }}
                        disabled={isFinished}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Bottom Navigation */}
              <nav className="flex justify-between items-center pt-8 pb-12">
                <Button
                  variant="ghost"
                  onClick={() => setCurrentSectionIdx(Math.max(0, currentSectionIdx - 1))}
                  disabled={currentSectionIdx === 0}
                  className="flex items-center gap-2 text-[var(--clay-black)] font-bold px-6 py-3 rounded-xl hover:bg-[var(--clay-black)]/5 transition-all disabled:opacity-50"
                >
                  <MaterialIcon name="arrow_back" />
                  Sebelumnya
                </Button>
                
                <div className="flex gap-2">
                  {pkg.sections.map((_: any, idx: number) => (
                    <div 
                      key={idx} 
                      className={`w-2 h-2 rounded-full ${idx === currentSectionIdx ? "bg-[var(--matcha-600)]" : "bg-[var(--oat-border)]"}`}
                    />
                  ))}
                </div>

                {currentSectionIdx < pkg.sections.length - 1 ? (
                  <Button
                    onClick={() => setCurrentSectionIdx(currentSectionIdx + 1)}
                    className="flex items-center gap-2 bg-[var(--clay-black)] text-[var(--pure-white)] font-bold px-8 py-3 rounded-xl shadow-lg hover:bg-[var(--warm-charcoal)] transition-all"
                  >
                    Selanjutnya
                    <MaterialIcon name="arrow_forward" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => setShowFinishDialog(true)}
                    disabled={isFinished}
                    className="flex items-center gap-2 bg-[var(--matcha-600)] text-[var(--pure-white)] font-bold px-8 py-3 rounded-xl shadow-lg hover:bg-[var(--matcha-700)] transition-all"
                  >
                    Selesai
                    <MaterialIcon name="check_circle" />
                  </Button>
                )}
              </nav>
            </div>
          </section>
        </main>

        {/* Floating Question Navigation Slider */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-[var(--clay-black)]/95 backdrop-blur-md rounded-full shadow-2xl border border-white/10 z-40 max-w-[90vw]">
          {/* Scroll Left */}
          <button
            onClick={() => {
              navSliderRef.current?.scrollBy({ left: -200, behavior: "smooth" });
            }}
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all"
          >
            <MaterialIcon name="chevron_left" className="text-sm" />
          </button>

          {/* Scrollable Strip */}
          <div
            ref={navSliderRef}
            className="flex items-center gap-1 overflow-x-auto hide-scrollbar max-w-[60vw] sm:max-w-[50vw] md:max-w-[40vw] lg:max-w-[30vw]"
          >
            {allQuestions.map((q, gIdx) => {
              const answered = isAnswered(q.id);
              const marked = isMarked(q.id);
              const isActive = q.sectionIdx === currentSectionIdx;

              return (
                <button
                  key={q.id}
                  data-qid={q.id}
                  onClick={() => {
                    setCurrentSectionIdx(q.sectionIdx);
                    setActiveQuestionId(q.id);
                    setTimeout(() => {
                      const el = document.getElementById(`question-${q.id}`);
                      el?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }, 100);
                  }}
                  className={`relative w-7 h-7 sm:w-8 sm:h-8 shrink-0 flex items-center justify-center rounded-full font-bold text-[10px] sm:text-xs transition-all ${
                    answered
                      ? "bg-[var(--matcha-600)] text-[var(--pure-white)]"
                      : isActive
                        ? "bg-white/30 text-white"
                        : "bg-white/10 text-white/60 hover:bg-white/20"
                  }`}
                  title={`Soal ${gIdx + 1}${marked ? " (ditandai)" : ""}`}
                >
                  {gIdx + 1}
                  {marked && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[var(--pomegranate-400)] rounded-full border border-[var(--clay-black)]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Scroll Right */}
          <button
            onClick={() => {
              navSliderRef.current?.scrollBy({ left: 200, behavior: "smooth" });
            }}
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all"
          >
            <MaterialIcon name="chevron_right" className="text-sm" />
          </button>

          <div className="w-px h-6 bg-white/10 shrink-0"></div>

          {/* Top Button */}
          <button
            onClick={() => {
              questionPanelRef.current?.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center gap-1 px-3 py-2 shrink-0 rounded-full text-white/80 font-semibold text-xs hover:text-white transition-all"
          >
            <MaterialIcon name="arrow_upward" className="text-sm" />
            <span className="hidden sm:inline">Atas</span>
          </button>
        </div>
      </div>

      {/* Finish Confirmation Dialog */}
      {showFinishDialog && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowFinishDialog(false);
          }}
        >
          <div className="bg-[var(--warm-cream)] w-full max-w-md rounded-[var(--radius-xl)] border-2 border-[var(--oat-border)] shadow-xl p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[var(--pomegranate-400)]/20 flex items-center justify-center">
                <MaterialIcon name="help" className="text-[var(--pomegranate-500)]" />
              </div>
              <h2 className="text-xl font-headline font-bold text-[var(--clay-black)]">
                Selesaikan Latihan?
              </h2>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-sm text-[var(--warm-charcoal)]">
                Kamu sudah menjawab <strong className="text-[var(--clay-black)]">{answeredCount} dari {totalQuestions}</strong> soal.
              </p>
              {answeredCount < totalQuestions && (
                <div className="p-3 rounded-[var(--radius-md)] bg-[var(--lemon-400)]/20 border-2 border-[var(--lemon-500)]/30 text-sm text-[var(--lemon-800)] flex items-start gap-2">
                  <MaterialIcon name="warning" className="text-sm mt-0.5 shrink-0" />
                  <span>Masih ada {totalQuestions - answeredCount} soal yang belum dijawab.</span>
                </div>
              )}
              <p className="text-sm text-[var(--warm-charcoal)]">
                Setelah selesai, jawaban tidak bisa diubah dan hasil akan langsung terlihat.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowFinishDialog(false)}
                className="flex-1 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)]"
              >
                Lanjutkan
              </Button>
              <Button
                onClick={() => {
                  setShowFinishDialog(false);
                  onFinish();
                }}
                className="flex-1 bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] rounded-[var(--radius-lg)]"
              >
                Selesaikan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Abandon Confirmation Dialog */}
      {showAbandonDialog && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAbandonDialog(false);
          }}
        >
          <div className="bg-[var(--warm-cream)] w-full max-w-md rounded-[var(--radius-xl)] border-2 border-[var(--oat-border)] shadow-xl p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[var(--pomegranate-400)]/20 flex items-center justify-center">
                <MaterialIcon name="warning" className="text-[var(--pomegranate-500)]" />
              </div>
              <h2 className="text-xl font-headline font-bold text-[var(--clay-black)]">
                Keluar dari Latihan?
              </h2>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-sm text-[var(--warm-charcoal)]">
                Apakah Anda yakin ingin meninggalkan sesi latihan ini? Progress pengerjaan Anda mungkin tidak tersimpan dan akan ditandai sebagai gagal atau dibatalkan.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowAbandonDialog(false)}
                className="flex-1 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)]"
              >
                Batal
              </Button>
              <Button
                onClick={() => {
                  setShowAbandonDialog(false);
                  onAbandon();
                }}
                className="flex-1 bg-[var(--pomegranate-500)] text-[var(--pure-white)] hover:bg-[var(--pomegranate-600)] rounded-[var(--radius-lg)]"
              >
                Keluar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
