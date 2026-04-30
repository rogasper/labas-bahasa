import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { useTestSession } from "@/hooks/use-test-session";
import { Button } from "@labas/ui/components/button";
import { Card, CardContent } from "@labas/ui/components/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { AttemptTestView } from "@/components/test/AttemptTestView";

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

function TakeTestComponent() {
  const { id: packageId } = Route.useParams();
  const { data: session } = authClient.useSession();

  const packageQuery = useQuery(trpc.package.getById.queryOptions({ id: packageId }));
  const pkg = packageQuery.data;

  const {
    attemptId,
    currentSectionIdx,
    setCurrentSectionIdx,
    answers,
    timeElapsed,
    isStarted,
    isFinished,
    submittingQId,
    markedQuestions,
    startPending,
    startError,
    handleStart,
    handleAnswerChange,
    handleFinish,
    handleAbandon,
    toggleMarkQuestion,
    startQuestionTimer,
  } = useTestSession(packageId);

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

  const totalQuestions = pkg.sections.reduce((sum: number, sec: any) => sum + sec.questions.length, 0);
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

          {startError && (
            <div className="mb-4 p-4 rounded-[var(--radius-md)] bg-[var(--pomegranate-400)]/10 border-2 border-[var(--pomegranate-400)]/30 text-sm text-[var(--pomegranate-600)]">
              {startError}
            </div>
          )}

          <Button
            onClick={handleStart}
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
          <Button onClick={handleFinish} className="mt-6 bg-[var(--clay-black)] text-[var(--pure-white)] clay-hover rounded-[var(--radius-lg)]">
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
      answeredCount={answeredCount}
      totalQuestions={totalQuestions}
      onFinish={handleFinish}
      onAbandon={handleAbandon}
      isFinished={isFinished}
      submittingQId={submittingQId}
      markedQuestions={markedQuestions}
      toggleMarkQuestion={toggleMarkQuestion}
      startQuestionTimer={startQuestionTimer}
    />
  );
}
