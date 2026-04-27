import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@labas/ui/components/button";
import { Card, CardContent } from "@labas/ui/components/card";
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
  onAnswerChange: (questionId: string, sectionResultId: string, value: string) => void;
  timeElapsed: number;
  answeredCount: number;
  totalQuestions: number;
  onFinish: () => void;
  isFinished: boolean;
  submittingQId: string | null;
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
  isFinished,
  submittingQId,
}: AttemptTestViewProps) {
  const attemptQuery = useQuery(trpc.attempt.getById.queryOptions({ id: attemptId }));
  const attempt = attemptQuery.data;
  const currentSection = pkg.sections[currentSectionIdx];
  const sectionData = attempt?.sections?.[currentSectionIdx];
  const sectionResultId = sectionData?.sectionResultId;

  return (
    <div className="min-h-screen bg-[var(--warm-cream)]">
      {/* Top Bar */}
      <div className="sticky top-0 z-50 bg-[var(--pure-white)] border-b-2 border-[var(--oat-border)] px-4 md:px-8 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/package/$id" params={{ id: pkg.id }} className="text-[var(--warm-charcoal)] hover:text-[var(--clay-black)]">
              <MaterialIcon name="close" />
            </Link>
            <h1 className="font-headline font-bold text-[var(--clay-black)] text-sm md:text-base truncate max-w-[200px] md:max-w-sm">
              {pkg.title}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 bg-[var(--oat-light)] px-3 py-1.5 rounded-full text-sm font-mono text-[var(--clay-black)]">
              <MaterialIcon name="timer" className="text-sm" />
              {formatTime(timeElapsed)}
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-sm text-[var(--warm-charcoal)]">
              <MaterialIcon name="check_circle" className="text-sm text-[var(--matcha-600)]" />
              {answeredCount}/{totalQuestions}
            </div>
            <Button
              onClick={onFinish}
              disabled={isFinished}
              className="bg-[var(--pomegranate-500)] text-[var(--pure-white)] hover:bg-[var(--pomegranate-700)] clay-hover rounded-[var(--radius-lg)] text-sm px-4 py-2"
            >
              Selesai
            </Button>
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {pkg.sections.map((sec: any, idx: number) => (
            <button
              key={sec.id}
              onClick={() => setCurrentSectionIdx(idx)}
              className={`px-4 py-2 rounded-[var(--radius-lg)] text-sm font-semibold whitespace-nowrap border-2 transition-colors ${
                idx === currentSectionIdx
                  ? "bg-[var(--clay-black)] text-[var(--pure-white)] border-[var(--clay-black)]"
                  : "bg-[var(--pure-white)] text-[var(--warm-charcoal)] border-[var(--oat-border)] hover:border-[var(--matcha-400)]"
              }`}
            >
              {sec.title}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Passage */}
          <div className="lg:col-span-1">
            <Card className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)] sticky top-24">
              <CardContent className="p-5">
                <h2 className="font-headline font-bold text-[var(--clay-black)] mb-3 flex items-center gap-2">
                  <MaterialIcon name="menu_book" className="text-[var(--matcha-600)]" />
                  Bacaan
                </h2>
                <div className="prose prose-sm max-w-none text-[var(--clay-black)] whitespace-pre-wrap text-sm leading-relaxed max-h-[60vh] overflow-y-auto pr-2">
                  {currentSection.questions[0]?.passageText ?? "Tidak ada bacaan untuk section ini."}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Questions */}
          <div className="lg:col-span-2 space-y-4">
            {currentSection.questions.map((q: any, idx: number) => {
              const answerValue = answers[q.id] ?? "";
              return (
                <Card
                  key={q.id}
                  className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <span className="w-8 h-8 rounded-full bg-[var(--clay-black)] text-[var(--pure-white)] text-xs flex items-center justify-center font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-[var(--clay-black)] font-medium leading-relaxed">
                          {q.questionText}
                        </p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 rounded bg-[var(--oat-light)] text-[var(--warm-charcoal)]">
                            {q.format.replace(/_/g, " ")}
                          </span>
                          {q.difficulty && (
                            <span className="text-xs px-2 py-0.5 rounded bg-[var(--oat-light)] text-[var(--warm-charcoal)]">
                              Lv.{q.difficulty}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pl-11">
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
                          if (sectionResultId) {
                            onAnswerChange(q.id, sectionResultId, val);
                          }
                        }}
                        disabled={isFinished || !sectionResultId}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Section Navigation */}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentSectionIdx(Math.max(0, currentSectionIdx - 1))}
                disabled={currentSectionIdx === 0}
                className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] clay-hover"
              >
                <MaterialIcon name="arrow_back" />
                <span className="ml-2">Sebelumnya</span>
              </Button>
              {currentSectionIdx < pkg.sections.length - 1 ? (
                <Button
                  onClick={() => setCurrentSectionIdx(currentSectionIdx + 1)}
                  className="bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] clay-hover rounded-[var(--radius-lg)]"
                >
                  <span className="mr-2">Selanjutnya</span>
                  <MaterialIcon name="arrow_forward" />
                </Button>
              ) : (
                <Button
                  onClick={onFinish}
                  disabled={isFinished}
                  className="bg-[var(--pomegranate-500)] text-[var(--pure-white)] hover:bg-[var(--pomegranate-700)] clay-hover rounded-[var(--radius-lg)]"
                >
                  <MaterialIcon name="check_circle" />
                  <span className="ml-2">Selesaikan</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
