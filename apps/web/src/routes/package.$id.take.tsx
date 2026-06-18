import { useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { useAppMode } from "@/lib/app-mode";
import { trpc } from "@/utils/trpc";
import { useTestSession } from "@/hooks/use-test-session";
import { trackUmamiEvent, AnalyticsEvent } from "@/lib/umami";
import { Button } from "@labas/ui/components/button";
import { Card, CardContent } from "@labas/ui/components/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { AttemptTestView } from "@/components/test/AttemptTestView";
import { routeShell } from "@/lib/route-shell";

export const Route = createFileRoute("/package/$id/take")({
  staticData: routeShell.fullscreen,
  component: TakeTestComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({ to: "/login", throw: true });
    }
    return { session };
  },
});

function TakeTestComponent() {
  const { id: packageId } = Route.useParams();
  const navigate = useNavigate();
  const { setMode } = useAppMode();

  const packageQuery = useQuery(trpc.package.getById.queryOptions({ id: packageId }));
  const pkg = packageQuery.data;
  const isCpns = pkg?.examTypeId === "CPNS";
  const packagesLink = isCpns ? "/cpns/packages" : "/packages";

  useEffect(() => {
    if (pkg) {
      setMode(isCpns ? "kedinasan" : "bahasa");
    }
  }, [pkg, isCpns, setMode]);

  // Check if there's an active in-progress attempt for this package
  const activeAttemptQuery = useQuery(
    trpc.attempt.getActiveAttempt.queryOptions(
      { packageId },
      { enabled: !!packageId },
    ),
  );

  useEffect(() => {
    if (activeAttemptQuery.data?.id) {
      navigate({
        to: "/package/$id/attempt/$attemptId",
        params: { id: packageId, attemptId: activeAttemptQuery.data.id },
      });
    }
  }, [activeAttemptQuery.data, navigate, packageId]);

  const {
    attemptId,
    currentSectionIdx,
    setCurrentSectionIdx,
    answers,
    timeElapsed,
    timeLimitSec,
    isStarted,
    isFinished,
    isTimeUp,
    submittingQId,
    markedQuestions,
    activeQuestionId,
    setActiveQuestionId,
    startPending,
    startError,
    handleStart,
    handleAnswerChange,
    handleFinish,
    handleAbandon,
    toggleMarkQuestion,
    startQuestionTimer,
  } = useTestSession(packageId, undefined, pkg?.estimatedDurationMin ?? undefined, packagesLink);

  const totalQuestions = pkg?.sections.reduce((sum: number, sec) => sum + sec.questions.length, 0) ?? 0;
  const answeredCount = Object.keys(answers).length;
  const timeLimitMin = pkg?.estimatedDurationMin && pkg.estimatedDurationMin > 0 ? pkg.estimatedDurationMin : undefined;

  const handleStartWithTracking = useCallback(async () => {
    await handleStart();
    trackUmamiEvent(AnalyticsEvent.ATTEMPT_START, {
      exam_type: pkg?.examTypeName ?? "unknown",
      question_count: totalQuestions,
    });
  }, [handleStart, pkg?.examTypeName, totalQuestions]);

  const handleFinishWithTracking = useCallback(async () => {
    const result = await handleFinish();
    if (result) {
      trackUmamiEvent(AnalyticsEvent.ATTEMPT_FINISH, {
        exam_type: pkg?.examTypeName ?? "unknown",
        score: result.totalScore,
        max_score: result.maxScore,
        percentage: result.percentage,
        time_elapsed_sec: timeElapsed,
      });
    }
  }, [handleFinish, pkg?.examTypeName, timeElapsed]);

  const handleAbandonWithTracking = useCallback(async () => {
    await handleAbandon();
    trackUmamiEvent(AnalyticsEvent.ATTEMPT_ABANDON, {
      exam_type: pkg?.examTypeName ?? "unknown",
      questions_answered: answeredCount,
      total_questions: totalQuestions,
    });
  }, [handleAbandon, pkg?.examTypeName, answeredCount, totalQuestions]);

  if (packageQuery.isLoading || activeAttemptQuery.isLoading) {
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
          <Link to={packagesLink} className="text-[var(--matcha-600)] font-semibold mt-4 inline-block">
            Kembali ke Paket
          </Link>
        </div>
      </div>
    );
  }

  // Start screen
  if (!isStarted) {
    return (
      <div className="min-h-screen pt-8 pb-32 px-6 md:px-12 lg:px-16 max-w-3xl mx-auto bg-[var(--warm-cream)]">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-[var(--warm-charcoal)] mb-6">
            <Link to={packagesLink} className="hover:text-[var(--clay-black)] transition-colors">
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
            Persiapkan diri Anda. Setelah memulai,
            {timeLimitMin
              ? ` timer ${timeLimitMin} menit akan berjalan dan`
              : " timer akan berjalan dan"}
            {" "}jawaban tersimpan otomatis.
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
                    {pkg.estimatedDurationMin} menit — jawaban akan dikumpulkan otomatis saat waktu habis
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {startError && (
            <div className="mb-4 p-4 rounded-[var(--radius-md)] bg-[var(--pomegranate-400)]/10 border-2 border-[var(--pomegranate-400)]/30 text-sm text-[var(--pomegranate-600)]">
              {startError}
            </div>
          )}

          <Button
            onClick={handleStartWithTracking}
            disabled={startPending}
            className="bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] clay-hover rounded-[var(--radius-lg)] px-8 py-6 text-lg"
          >
            <MaterialIcon name="play_arrow" />
            <span className="ml-2">{startPending ? "Memulai..." : "Mulai Latihan"}</span>
          </Button>
        </div>
      </div>
    );
  }

  if (!attemptId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--warm-cream)]">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-[var(--matcha-600)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--warm-charcoal)]">Menyiapkan latihan...</p>
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
          <Button onClick={handleFinishWithTracking} className="mt-6 bg-[var(--clay-black)] text-[var(--pure-white)] clay-hover rounded-[var(--radius-lg)]">
            Selesaikan & Lihat Hasil
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AttemptTestView
      attemptId={attemptId}
      pkg={pkg}
      currentSectionIdx={currentSectionIdx}
      setCurrentSectionIdx={setCurrentSectionIdx}
      answers={answers}
      onAnswerChange={handleAnswerChange}
      timeElapsed={timeElapsed}
      timeLimitSec={timeLimitSec}
      answeredCount={answeredCount}
      totalQuestions={totalQuestions}
      onFinish={handleFinishWithTracking}
      onAbandon={handleAbandonWithTracking}
      isFinished={isFinished}
      isTimeUp={isTimeUp}
      submittingQId={submittingQId}
      markedQuestions={markedQuestions}
      toggleMarkQuestion={toggleMarkQuestion}
      startQuestionTimer={startQuestionTimer}
      activeQuestionId={activeQuestionId}
      setActiveQuestionId={setActiveQuestionId}
    />
  );
}
