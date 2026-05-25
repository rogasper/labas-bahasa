import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { useTestSession } from "@/hooks/use-test-session";
import { Button } from "@labas/ui/components/button";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { AttemptTestView } from "@/components/test/AttemptTestView";
import { routeShell } from "@/lib/route-shell";

export const Route = createFileRoute("/package/$id/attempt/$attemptId")({
  staticData: routeShell.fullscreen,
  component: ContinueAttemptComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({ to: "/login", throw: true });
    }
    return { session };
  },
});

function ContinueAttemptComponent() {
  const { id: packageId, attemptId } = Route.useParams();

  const packageQuery = useQuery(trpc.package.getById.queryOptions({ id: packageId }));
  const pkg = packageQuery.data;

  const {
    currentSectionIdx,
    setCurrentSectionIdx,
    answers,
    timeElapsed,
    isFinished,
    submittingQId,
    markedQuestions,
    handleAnswerChange,
    handleFinish,
    handleAbandon,
    toggleMarkQuestion,
    startQuestionTimer,
  } = useTestSession(packageId, attemptId);

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

  const totalQuestions = pkg.sections.reduce((sum: number, sec) => sum + sec.questions.length, 0);
  const answeredCount = Object.keys(answers).length;

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
