import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { Button } from "@labas/ui/components/button";
import { Card, CardContent } from "@labas/ui/components/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { formatTime } from "@/lib/time";

export const Route = createFileRoute("/attempt/$id")({
  component: AttemptResultComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({ to: "/login", throw: true });
    }
    return { session };
  },
});

function AttemptResultComponent() {
  const { id: attemptId } = Route.useParams();
  const { data: session } = authClient.useSession();

  const attemptQuery = useQuery(trpc.attempt.getById.queryOptions({ id: attemptId }));
  const attempt = attemptQuery.data;

  if (attemptQuery.isLoading) {
    return (
      <div className="min-h-screen pt-8 pb-32 px-6 md:px-12 lg:px-16 max-w-4xl mx-auto bg-[var(--warm-cream)]">
        <div className="h-8 w-48 bg-[var(--oat-light)] animate-pulse rounded mb-4" />
        <div className="h-64 bg-[var(--oat-light)] animate-pulse rounded-[var(--radius-xl)]" />
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="min-h-screen pt-8 pb-32 px-6 md:px-12 lg:px-16 max-w-4xl mx-auto bg-[var(--warm-cream)]">
        <div className="text-center py-20">
          <MaterialIcon name="error_outline" className="text-6xl text-[var(--warm-silver)] mx-auto mb-4" />
          <p className="text-lg text-[var(--warm-charcoal)] font-semibold">Hasil tidak ditemukan</p>
          <Link to="/packages" className="text-[var(--matcha-600)] font-semibold mt-4 inline-block">
            Kembali ke Paket
          </Link>
        </div>
      </div>
    );
  }

  const percentage = attempt.maxScore && attempt.maxScore > 0
    ? Math.round(((attempt.totalScore ?? 0) / attempt.maxScore) * 100)
    : 0;

  const durationSec = attempt.finishedAt && attempt.startedAt
    ? Math.round((new Date(attempt.finishedAt).getTime() - new Date(attempt.startedAt).getTime()) / 1000)
    : 0;

  return (
    <div className="min-h-screen pt-8 pb-32 px-6 md:px-12 lg:px-16 max-w-4xl mx-auto bg-[var(--warm-cream)]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--warm-charcoal)] mb-6">
        <Link to="/packages" className="hover:text-[var(--clay-black)] transition-colors">
          Paket
        </Link>
        <MaterialIcon name="chevron_right" className="text-xs" />
        <span className="text-[var(--clay-black)] font-medium">Hasil Latihan</span>
      </div>

      {/* Score Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-headline font-extrabold text-[var(--clay-black)] tracking-tight mb-4">
          Hasil Latihan
        </h1>

        <Card className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)] overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Big Score Circle */}
              <div className="w-32 h-32 rounded-full border-4 border-[var(--matcha-500)] flex flex-col items-center justify-center bg-[var(--matcha-100)]">
                <span className="text-3xl font-headline font-extrabold text-[var(--matcha-800)]">
                  {percentage}%
                </span>
                <span className="text-xs text-[var(--matcha-700)] font-medium">
                  {attempt.totalScore ?? 0}/{attempt.maxScore ?? 0}
                </span>
              </div>

              <div className="flex-1 space-y-2 text-center md:text-left">
                <p className="text-lg font-semibold text-[var(--clay-black)]">
                  {percentage >= 80
                    ? "Sempurna!"
                    : percentage >= 60
                      ? "Bagus, terus berlatih!"
                      : percentage >= 40
                        ? "Perlu latihan lebih"
                        : "Jangan menyerah, coba lagi!"}
                </p>
                <div className="flex flex-wrap gap-4 text-sm text-[var(--warm-charcoal)] justify-center md:justify-start">
                  <span className="flex items-center gap-1">
                    <MaterialIcon name="timer" className="text-sm" />
                    {formatTime(durationSec)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MaterialIcon name="quiz" className="text-sm" />
                    {attempt.maxScore ?? 0} soal
                  </span>
                  <span className="flex items-center gap-1">
                    <MaterialIcon name="check_circle" className="text-sm text-[var(--matcha-600)]" />
                    {attempt.totalScore ?? 0} benar
                  </span>
                  <span className="flex items-center gap-1">
                    <MaterialIcon name="cancel" className="text-sm text-[var(--pomegranate-500)]" />
                    {(attempt.maxScore ?? 0) - (attempt.totalScore ?? 0)} salah
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section Breakdown */}
      <div className="mb-8">
        <h2 className="text-xl font-headline font-bold text-[var(--clay-black)] mb-4">Per Section</h2>
        <div className="space-y-3">
          {attempt.sections.map((sec: any) => {
            const secPct = sec.maxScore && sec.maxScore > 0
              ? Math.round(((sec.score ?? 0) / sec.maxScore) * 100)
              : 0;
            return (
              <Card key={sec.id} className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-[var(--clay-black)]">{sec.title}</p>
                      <p className="text-sm text-[var(--warm-charcoal)]">
                        {sec.score ?? 0}/{sec.maxScore ?? 0} benar
                      </p>
                    </div>
                    <div className="w-16 h-16 rounded-full border-2 border-[var(--matcha-400)] flex items-center justify-center bg-[var(--matcha-50)]">
                      <span className="text-lg font-bold text-[var(--matcha-700)]">{secPct}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Question Review */}
      <div className="mb-8">
        <h2 className="text-xl font-headline font-bold text-[var(--clay-black)] mb-4">Pembahasan Soal</h2>
        <div className="space-y-4">
          {attempt.sections.map((sec: any, secIdx: number) =>
            sec.questions.map((q: any, qIdx: number) => {
              const ans = sec.answers.find((a: any) => a.questionId === q.id);
              const isCorrect = ans?.isCorrect;
              const userAnswer = ans?.userAnswer ?? "Tidak dijawab";

              return (
                <Card
                  key={q.id}
                  className={`clay-shadow bg-[var(--pure-white)] border-2 rounded-[var(--radius-xl)] ${
                    isCorrect === true
                      ? "border-[var(--matcha-400)]"
                      : isCorrect === false
                        ? "border-[var(--pomegranate-400)]"
                        : "border-[var(--oat-border)]"
                  }`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <span
                        className={`w-8 h-8 rounded-full text-xs flex items-center justify-center font-bold shrink-0 ${
                          isCorrect === true
                            ? "bg-[var(--matcha-600)] text-[var(--pure-white)]"
                            : isCorrect === false
                              ? "bg-[var(--pomegranate-500)] text-[var(--pure-white)]"
                              : "bg-[var(--oat-light)] text-[var(--warm-charcoal)]"
                        }`}
                      >
                        {secIdx + 1}.{qIdx + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-[var(--clay-black)] font-medium">{q.questionText}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 rounded bg-[var(--oat-light)] text-[var(--warm-charcoal)]">
                            {q.format.replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pl-11 space-y-2">
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div>
                          <span className="text-[var(--warm-silver)]">Jawaban Anda:</span>{" "}
                          <span
                            className={`font-semibold ${
                              isCorrect === true
                                ? "text-[var(--matcha-700)]"
                                : isCorrect === false
                                  ? "text-[var(--pomegranate-600)]"
                                  : "text-[var(--warm-charcoal)]"
                            }`}
                          >
                            {userAnswer}
                          </span>
                        </div>
                        {(isCorrect === false || isCorrect === null) && (
                          <div>
                            <span className="text-[var(--warm-silver)]">Jawaban Benar:</span>{" "}
                            <span className="font-semibold text-[var(--matcha-700)]">
                              {q.correctAnswer}
                            </span>
                          </div>
                        )}
                      </div>

                      {q.explanation && (
                        <div className="bg-[var(--oat-light)] rounded-[var(--radius-lg)] p-3 text-sm text-[var(--warm-charcoal)]">
                          <span className="font-semibold text-[var(--clay-black)]">Penjelasan:</span>{" "}
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            }),
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link to="/package/$id/take" params={{ id: attempt.packageId! }}>
          <Button className="bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] clay-hover rounded-[var(--radius-lg)]">
            <MaterialIcon name="replay" />
            <span className="ml-2">Coba Lagi</span>
          </Button>
        </Link>
        <Link to="/packages">
          <Button
            variant="outline"
            className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] clay-hover"
          >
            <MaterialIcon name="arrow_back" />
            <span className="ml-2">Kembali ke Paket</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
