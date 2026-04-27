import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { Button } from "@labas/ui/components/button";
import { Card, CardContent } from "@labas/ui/components/card";
import { Input } from "@labas/ui/components/input";
import { Label } from "@labas/ui/components/label";

export const Route = createFileRoute("/package/$id/take")({
  component: TakeTestComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({ to: "/login", throw: true });
    }
    return { session };
  },
});

function MaterialIcon({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function QuestionInput({
  question,
  value,
  onChange,
  disabled,
}: {
  question: any;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}) {
  const format = question.format;
  const options = question.options as Array<{ key: string; text: string }> | undefined;

  const radioClass =
    "flex items-center gap-3 p-3 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] cursor-pointer hover:border-[var(--matcha-400)] transition-colors";
  const radioSelected = "border-[var(--matcha-600)] bg-[var(--matcha-100)]";
  const radioDisabled = "opacity-60 cursor-not-allowed";

  if (
    format === "multiple_choice" ||
    format === "synonym" ||
    format === "grammar_in_context" ||
    format === "sentence_completion" ||
    format === "reference" ||
    format === "kanji_reading" ||
    format === "particle_choice" ||
    format === "article_case" ||
    format === "matching_headings" ||
    format === "matching_information" ||
    format === "summary_completion" ||
    format === "cloze"
  ) {
    if (!options || options.length === 0) {
      return (
        <div className="text-sm text-[var(--warm-silver)] italic">
          Tidak ada opsi tersedia untuk soal ini.
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {options.map((opt) => (
          <label
            key={opt.key}
            className={`${radioClass} ${value === opt.key ? radioSelected : ""} ${disabled ? radioDisabled : ""}`}
          >
            <input
              type="radio"
              name={question.id}
              value={opt.key}
              checked={value === opt.key}
              onChange={() => onChange(opt.key)}
              disabled={disabled}
              className="hidden"
            />
            <span className="w-8 h-8 rounded-full bg-[var(--oat-light)] text-[var(--clay-black)] text-sm font-bold flex items-center justify-center shrink-0">
              {opt.key}
            </span>
            <span className="text-sm text-[var(--clay-black)]">{opt.text}</span>
          </label>
        ))}
      </div>
    );
  }

  if (format === "true_false_not_given") {
    const choices = [
      { key: "TRUE", label: "True" },
      { key: "FALSE", label: "False" },
      { key: "NOT_GIVEN", label: "Not Given" },
    ];
    return (
      <div className="space-y-2">
        {choices.map((c) => (
          <label
            key={c.key}
            className={`${radioClass} ${value === c.key ? radioSelected : ""} ${disabled ? radioDisabled : ""}`}
          >
            <input
              type="radio"
              name={question.id}
              value={c.key}
              checked={value === c.key}
              onChange={() => onChange(c.key)}
              disabled={disabled}
              className="hidden"
            />
            <span className="text-sm font-semibold text-[var(--clay-black)]">{c.label}</span>
          </label>
        ))}
      </div>
    );
  }

  if (format === "author_view") {
    const choices = [
      { key: "YES", label: "Yes" },
      { key: "NO", label: "No" },
      { key: "NOT_GIVEN", label: "Not Given" },
    ];
    return (
      <div className="space-y-2">
        {choices.map((c) => (
          <label
            key={c.key}
            className={`${radioClass} ${value === c.key ? radioSelected : ""} ${disabled ? radioDisabled : ""}`}
          >
            <input
              type="radio"
              name={question.id}
              value={c.key}
              checked={value === c.key}
              onChange={() => onChange(c.key)}
              disabled={disabled}
              className="hidden"
            />
            <span className="text-sm font-semibold text-[var(--clay-black)]">{c.label}</span>
          </label>
        ))}
      </div>
    );
  }

  if (format === "fill_blank") {
    return (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Ketik jawaban Anda..."
        className="bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-lg)]"
      />
    );
  }

  // Fallback for any unrecognized format
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder="Ketik jawaban Anda..."
      className="bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-lg)]"
    />
  );
}

function TakeTestComponent() {
  const { id: packageId } = Route.useParams();
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();

  const packageQuery = useQuery(trpc.package.getById.queryOptions({ id: packageId }));
  const pkg = packageQuery.data;

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [submittingQId, setSubmittingQId] = useState<string | null>(null);

  const startMutation = useMutation(trpc.attempt.start.mutationOptions());
  const submitMutation = useMutation(trpc.attempt.submitAnswer.mutationOptions());
  const finishMutation = useMutation(trpc.attempt.finish.mutationOptions());

  // Timer
  useEffect(() => {
    if (!isStarted || isFinished) return;
    const interval = setInterval(() => {
      setTimeElapsed((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isStarted, isFinished]);

  const handleStart = useCallback(async () => {
    if (!pkg) return;
    const res = await startMutation.mutateAsync({ packageId });
    setAttemptId(res.attemptId);
    setIsStarted(true);
  }, [pkg, packageId, startMutation]);

  const handleAnswerChange = useCallback(
    async (questionId: string, sectionResultId: string, value: string) => {
      if (!attemptId || isFinished) return;
      setAnswers((prev) => ({ ...prev, [questionId]: value }));
      setSubmittingQId(questionId);
      try {
        await submitMutation.mutateAsync({
          attemptId,
          sectionResultId,
          questionId,
          userAnswer: value,
        });
      } finally {
        setSubmittingQId(null);
      }
    },
    [attemptId, isFinished, submitMutation],
  );

  const handleFinish = useCallback(async () => {
    if (!attemptId) return;
    setIsFinished(true);
    const res = await finishMutation.mutateAsync({ attemptId });
    navigate({ to: "/attempt/$id", params: { id: attemptId } });
  }, [attemptId, finishMutation, navigate]);

  if (packageQuery.isLoading) {
    return (
      <div className="min-h-screen pt-8 pb-32 px-6 md:px-12 lg:px-16 max-w-4xl mx-auto bg-[var(--warm-cream)]">
        <div className="h-8 w-48 bg-[var(--oat-light)] animate-pulse rounded mb-4" />
        <div className="h-64 bg-[var(--oat-light)] animate-pulse rounded-[var(--radius-xl)]" />
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="min-h-screen pt-8 pb-32 px-6 md:px-12 lg:px-16 max-w-4xl mx-auto bg-[var(--warm-cream)]">
        <div className="text-center py-20">
          <MaterialIcon name="error_outline" className="text-6xl text-[var(--warm-silver)] mx-auto mb-4" />
          <p className="text-lg text-[var(--warm-charcoal)] font-semibold">Paket tidak ditemukan</p>
          <Link to="/packages" className="text-[var(--matcha-600)] font-semibold mt-4 inline-block">
            Kembali ke Paket
          </Link>
        </div>
      </div>
    );
  }

  const totalQuestions = pkg.sections.reduce((sum, sec) => sum + sec.questions.length, 0);
  const answeredCount = Object.keys(answers).length;

  // Start screen
  if (!isStarted) {
    return (
      <div className="min-h-screen pt-8 pb-32 px-6 md:px-12 lg:px-16 max-w-3xl mx-auto bg-[var(--warm-cream)]">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-[var(--warm-charcoal)] mb-6">
            <Link to="/packages" className="hover:text-[var(--clay-black)] transition-colors">
              Paket
            </Link>
            <MaterialIcon name="chevron_right" className="text-xs" />
            <Link to="/package/$id" params={{ id: packageId }} className="hover:text-[var(--clay-black)] transition-colors">
              {pkg.title}
            </Link>
            <MaterialIcon name="chevron_right" className="text-xs" />
            <span className="text-[var(--clay-black)] font-medium">Latihan</span>
          </div>

          <h1 className="text-3xl font-headline font-extrabold text-[var(--clay-black)] tracking-tight mb-4">
            {pkg.title}
          </h1>
          <p className="text-[var(--warm-charcoal)] mb-8">
            Persiapkan diri Anda. Setelah memulai, timer akan berjalan dan jawaban tersimpan otomatis.
          </p>

          <Card className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)] mb-8">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <MaterialIcon name="quiz" className="text-[var(--matcha-600)]" />
                <span className="text-[var(--clay-black)] font-medium">{totalQuestions} soal</span>
              </div>
              <div className="flex items-center gap-3">
                <MaterialIcon name="folder" className="text-[var(--matcha-600)]" />
                <span className="text-[var(--clay-black)] font-medium">{pkg.totalSections} section</span>
              </div>
              {pkg.estimatedDurationMin && (
                <div className="flex items-center gap-3">
                  <MaterialIcon name="timer" className="text-[var(--matcha-600)]" />
                  <span className="text-[var(--clay-black)] font-medium">
                    Estimasi {pkg.estimatedDurationMin} menit
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            onClick={handleStart}
            disabled={startMutation.isPending}
            className="bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] clay-hover rounded-[var(--radius-lg)] px-8 py-6 text-lg"
          >
            <MaterialIcon name="play_arrow" />
            <span className="ml-2">{startMutation.isPending ? "Memulai..." : "Mulai Latihan"}</span>
          </Button>
        </div>
      </div>
    );
  }

  const currentSection = pkg.sections[currentSectionIdx];
  if (!currentSection) {
    return (
      <div className="min-h-screen pt-8 pb-32 px-6 md:px-12 lg:px-16 max-w-4xl mx-auto bg-[var(--warm-cream)]">
        <div className="text-center py-20">
          <MaterialIcon name="check_circle" className="text-6xl text-[var(--matcha-600)] mx-auto mb-4" />
          <p className="text-xl font-headline font-bold text-[var(--clay-black)]">Semua section selesai!</p>
          <Button onClick={handleFinish} className="mt-6 bg-[var(--clay-black)] text-[var(--pure-white)] clay-hover rounded-[var(--radius-lg)]">
            Selesaikan & Lihat Hasil
          </Button>
        </div>
      </div>
    );
  }

  // Find the sectionResultId for this section
  // We don't have it directly here since we didn't fetch attempt data.
  // We need to fetch attempt data after starting.
  // Actually, for the MVP, we can just use a placeholder or fetch attempt data.
  // Let me add an attempt query.

  return (
    <AttemptTestView
      attemptId={attemptId!}
      pkg={pkg}
      currentSectionIdx={currentSectionIdx}
      setCurrentSectionIdx={setCurrentSectionIdx}
      answers={answers}
      onAnswerChange={handleAnswerChange}
      timeElapsed={timeElapsed}
      answeredCount={answeredCount}
      totalQuestions={totalQuestions}
      onFinish={handleFinish}
      isFinished={isFinished}
      submittingQId={submittingQId}
    />
  );
}

function AttemptTestView({
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
}: {
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
}) {
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
