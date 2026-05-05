import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { Button } from "@labas/ui/components/button";
import { Card, CardContent } from "@labas/ui/components/card";
import { Input } from "@labas/ui/components/input";
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

  const packageRatingQuery = useQuery(
    trpc.rating.getPackageRating.queryOptions(
      { packageId: attempt?.packageId ?? "" },
      { enabled: !!attempt?.packageId },
    ),
  );

  const ratePackageMutation = useMutation({
    ...trpc.rating.ratePackage.mutationOptions(),
    onSuccess: () => packageRatingQuery.refetch(),
  });

  const percentage = attempt?.maxScore && attempt.maxScore > 0
    ? Math.round(((attempt.totalScore ?? 0) / attempt.maxScore) * 100)
    : 0;

  const durationSec = attempt?.finishedAt && attempt.startedAt
    ? Math.round((new Date(attempt.finishedAt).getTime() - new Date(attempt.startedAt).getTime()) / 1000)
    : 0;

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

                {/* Package Rating */}
                <div className="flex items-center gap-2 justify-center md:justify-start pt-2">
                  <span className="text-xs text-[var(--warm-charcoal)]">Nilai paket:</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => ratePackageMutation.mutate({ packageId: attempt.packageId!, score: star })}
                        className="transition-transform hover:scale-110"
                      >
                        <MaterialIcon
                          name={(packageRatingQuery.data?.myRating ?? 0) >= star ? "star" : "star_outline"}
                          className={`text-lg ${(packageRatingQuery.data?.myRating ?? 0) >= star ? "text-[var(--lemon-500)]" : "text-[var(--oat-border)]"}`}
                        />
                      </button>
                    ))}
                  </div>
                  {packageRatingQuery.data?.avgRating && (
                    <span className="text-xs text-[var(--warm-charcoal)]">
                      {packageRatingQuery.data.avgRating}/5
                    </span>
                  )}
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
                      {sec.timeSpentSec !== null && sec.timeSpentSec !== undefined && (
                        <p className="text-xs text-[var(--warm-silver)] mt-1 flex items-center gap-1">
                          <MaterialIcon name="timer" className="text-xs" />
                          {formatTime(sec.timeSpentSec)}
                        </p>
                      )}
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
            sec.questions.map((q: any, qIdx: number) => (
              <QuestionReviewCard
                key={q.id}
                q={q}
                secIdx={secIdx}
                qIdx={qIdx}
                ans={sec.answers.find((a: any) => a.questionId === q.id)}
                userId={session?.user.id}
              />
            )),
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

function QuestionReviewCard({
  q,
  secIdx,
  qIdx,
  ans,
  userId,
}: {
  q: any;
  secIdx: number;
  qIdx: number;
  ans: any;
  userId?: string;
}) {
  const isCorrect = ans?.isCorrect;
  const userAnswer = ans?.userAnswer ?? "Tidak dijawab";
  const isOwner = q.creatorUserId === userId;

  const [isEditing, setIsEditing] = useState(false);
  const [editPassage, setEditPassage] = useState(q.passageText ?? "");
  const [editCorrectAnswer, setEditCorrectAnswer] = useState(q.correctAnswer ?? "");
  const [editExplanation, setEditExplanation] = useState(q.explanation ?? "");

  const feedbackQuery = useQuery(
    trpc.feedback.getQuestionFeedback.queryOptions(
      { questionId: q.id },
      { enabled: !!q.id },
    ),
  );

  const voteMutation = useMutation({
    ...trpc.feedback.voteQuestion.mutationOptions(),
    onSuccess: () => feedbackQuery.refetch(),
  });

  const updateQuestionMutation = useMutation({
    ...trpc.question.update.mutationOptions(),
    onSuccess: () => {
      setIsEditing(false);
      // Ideally refetch attempt data here
      window.location.reload();
    },
  });

  const handleSaveEdit = () => {
    updateQuestionMutation.mutate({
      id: q.id,
      passageText: editPassage,
      correctAnswer: editCorrectAnswer,
      explanation: editExplanation,
    });
  };

  return (
    <Card
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
            <div className="flex gap-2 mt-1 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded bg-[var(--oat-light)] text-[var(--warm-charcoal)]">
                {q.format.replace(/_/g, " ")}
              </span>
            </div>
          </div>
          {isOwner && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 rounded-md hover:bg-[var(--oat-light)] transition-colors text-[var(--warm-charcoal)]"
              title="Koreksi soal"
            >
              <MaterialIcon name="edit" className="text-sm" />
            </button>
          )}
          {isEditing && (
            <button
              onClick={() => setIsEditing(false)}
              className="p-1.5 rounded-md hover:bg-[var(--oat-light)] transition-colors text-[var(--warm-charcoal)]"
              title="Batal"
            >
              <MaterialIcon name="close" className="text-sm" />
            </button>
          )}
        </div>

        <div className="pl-11 space-y-3">
          {/* Passage Text */}
          {q.passageText && (
            <div className="bg-[var(--oat-light)] rounded-[var(--radius-lg)] p-3 text-sm text-[var(--warm-charcoal)] whitespace-pre-wrap leading-relaxed">
              <span className="font-semibold text-[var(--clay-black)] block mb-1">Teks Bacaan:</span>
              {q.passageText}
            </div>
          )}

          {/* Owner Inline Edit Form */}
          {isEditing && isOwner && (
            <div className="space-y-3 bg-[var(--badge-blue-bg)] rounded-[var(--radius-lg)] p-4 border-2 border-[var(--badge-blue-bg)]">
              <p className="text-sm font-semibold text-[var(--badge-blue-text)] flex items-center gap-2">
                <MaterialIcon name="edit_note" className="text-sm" />
                Koreksi Soal
              </p>
              <div>
                <label className="text-xs font-medium text-[var(--warm-charcoal)] mb-1 block">Teks Bacaan</label>
                <textarea
                  value={editPassage}
                  onChange={(e) => setEditPassage(e.target.value)}
                  className="w-full min-h-[80px] p-2 rounded-[var(--radius-md)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] text-sm text-[var(--clay-black)] resize-y"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--warm-charcoal)] mb-1 block">Jawaban Benar</label>
                <Input
                  value={editCorrectAnswer}
                  onChange={(e) => setEditCorrectAnswer(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--warm-charcoal)] mb-1 block">Penjelasan</label>
                <textarea
                  value={editExplanation}
                  onChange={(e) => setEditExplanation(e.target.value)}
                  className="w-full min-h-[60px] p-2 rounded-[var(--radius-md)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] text-sm text-[var(--clay-black)] resize-y"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveEdit}
                  disabled={updateQuestionMutation.isPending}
                  className="h-9 text-sm bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] rounded-[var(--radius-lg)]"
                >
                  <MaterialIcon name="save" className="text-sm mr-1" />
                  Simpan
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="h-9 text-sm rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)]"
                >
                  Batal
                </Button>
              </div>
            </div>
          )}

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
            {ans?.timeSpentSec !== null && ans?.timeSpentSec !== undefined && (
              <div className="flex items-center gap-1 text-[var(--warm-silver)]">
                <MaterialIcon name="timer" className="text-xs" />
                <span>{formatTime(ans.timeSpentSec)}</span>
              </div>
            )}
          </div>

          {q.explanation && !isEditing && (
            <div className="bg-[var(--oat-light)] rounded-[var(--radius-lg)] p-3 text-sm text-[var(--warm-charcoal)]">
              <span className="font-semibold text-[var(--clay-black)]">Penjelasan:</span>{" "}
              {q.explanation}
            </div>
          )}

          {/* Thumbs Feedback */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => voteMutation.mutate({ questionId: q.id, type: "up" })}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                feedbackQuery.data?.myFeedback === "up"
                  ? "bg-[var(--matcha-300)] text-[var(--matcha-800)]"
                  : "bg-[var(--oat-light)] text-[var(--warm-charcoal)] hover:bg-[var(--matcha-300)] hover:text-[var(--matcha-800)]"
              }`}
            >
              <MaterialIcon name="thumb_up" className="text-sm" />
              <span>{feedbackQuery.data?.up ?? 0}</span>
            </button>
            <button
              onClick={() => voteMutation.mutate({ questionId: q.id, type: "down" })}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                feedbackQuery.data?.myFeedback === "down"
                  ? "bg-[var(--pomegranate-100)] text-[var(--pomegranate-600)]"
                  : "bg-[var(--oat-light)] text-[var(--warm-charcoal)] hover:bg-[var(--pomegranate-100)] hover:text-[var(--pomegranate-600)]"
              }`}
            >
              <MaterialIcon name="thumb_down" className="text-sm" />
              <span>{feedbackQuery.data?.down ?? 0}</span>
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
