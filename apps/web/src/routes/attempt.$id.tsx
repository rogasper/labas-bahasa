import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { Button } from "@labas/ui/components/button";
import { Card, CardContent } from "@labas/ui/components/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { formatTime } from "@/lib/time";
import type { Question } from "@/lib/types";
import { QuestionReviewCard } from "@/components/attempt/QuestionReviewCard";
import { ReviewFilterBar } from "@/components/attempt/ReviewFilterBar";
import { SkillBreakdown } from "@/components/attempt/SkillBreakdown";

type FilterStatus = "all" | "wrong" | "correct" | "marked";

interface AnswerItem {
  questionId: string;
  userAnswer?: string;
  answer?: string;
  isCorrect?: boolean | null;
  partialScore?: number | null;
  timeSpentSec?: number;
}

interface QuestionAnswer {
  q: Question;
  ans: AnswerItem | null;
  secIdx: number;
  qIdx: number;
}

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

  const durationSec = attempt?.finishedAt && attempt.startedAt
    ? Math.round((new Date(attempt.finishedAt).getTime() - new Date(attempt.startedAt).getTime()) / 1000)
    : 0;

  // ── Filter state ──
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterSkills, setFilterSkills] = useState<string[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);

  // ── Flatten all questions with section context ──
  const allQuestions = useMemo(() => {
    if (!attempt?.sections) return [];
    return attempt.sections.flatMap((sec, secIdx: number) =>
      sec.questions.map((q: Question, qIdx: number) => ({
        q,
        secIdx,
        qIdx,
        ans: sec.answers.find((a: AnswerItem) => a.questionId === q.id) ?? null,
      })),
    );
  }, [attempt]);

  const questionStats = useMemo(() => {
    const total = allQuestions.length;
    const correct = allQuestions.filter(({ ans }) => ans?.isCorrect === true).length;
    const wrong = allQuestions.filter(({ ans }) => ans?.isCorrect === false).length;
    return { total, correct, wrong };
  }, [allQuestions]);

  const percentage = questionStats.total > 0
    ? Math.round((questionStats.correct / questionStats.total) * 100)
    : 0;

  // ── Filtered questions ──
  const partialCount = useMemo(
    () => allQuestions.filter(({ ans }) => ans?.partialScore != null && ans?.partialScore < 100).length,
    [allQuestions],
  );

  const filteredQuestions = useMemo(() => {
    return allQuestions.filter(({ q, ans }) => {
      if (filterStatus === "wrong" && ans?.isCorrect !== false) return false;
      if (filterStatus === "correct" && ans?.isCorrect !== true) return false;
      if (filterStatus === "marked") {
        const hasPartial = ans?.partialScore != null && ans?.partialScore < 100;
        if (!hasPartial) return false;
      }
      if (filterSkills.length > 0) {
        const tags: string[] = q.skillTags ?? [];
        if (!filterSkills.some((s) => tags.includes(s))) return false;
      }
      return true;
    });
  }, [allQuestions, filterStatus, filterSkills]);

  // ── Expand/collapse ──
  const toggleAllExpanded = () => {
    const next = !allExpanded;
    setAllExpanded(next);
    if (next) {
      setExpandedIds(new Set(filteredQuestions.map(({ q }) => q.id)));
    } else {
      setExpandedIds(new Set());
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setAllExpanded(false);
  };

  const toggleSkill = (skill: string) => {
    setFilterSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [skill],
    );
    setFilterStatus("all");
  };

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
    <div className="min-h-screen pb-32 bg-[var(--warm-cream)]">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-[var(--warm-cream)]/95 backdrop-blur-sm border-b border-[var(--oat-border)] shadow-sm">
        <div className="px-6 md:px-12 lg:px-16 max-w-4xl mx-auto pt-4 pb-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-[var(--warm-charcoal)] mb-3">
            <Link to="/packages" className="hover:text-[var(--clay-black)] transition-colors">
              Paket
            </Link>
            <MaterialIcon name="chevron_right" className="text-[10px]" />
            <span className="text-[var(--clay-black)] font-medium">Hasil Latihan</span>
          </div>

          {/* Title + score summary + actions */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center shrink-0 font-headline font-extrabold text-sm ${
                percentage >= 80
                  ? "border-[var(--matcha-500)] bg-[var(--matcha-100)] text-[var(--matcha-800)]"
                  : percentage >= 60
                    ? "border-[var(--lemon-500)] bg-[var(--lemon-100)] text-[var(--lemon-800)]"
                    : "border-[var(--pomegranate-400)] bg-[var(--pomegranate-50)] text-[var(--pomegranate-700)]"
              }`}>
                {percentage}%
              </div>
              <div>
                <h1 className="text-lg font-headline font-extrabold text-[var(--clay-black)] leading-tight">
                  Hasil Latihan
                </h1>
                <p className="text-xs text-[var(--warm-charcoal)]">
                  {questionStats.correct}/{questionStats.total} benar · {formatTime(durationSec)}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Link to="/package/$id/take" params={{ id: attempt.packageId! }}>
                <Button className="bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] clay-hover rounded-[var(--radius-lg)]">
                  <MaterialIcon name="replay" />
                  <span className="ml-1.5">Coba Lagi</span>
                </Button>
              </Link>
              <Link to="/packages">
                <Button
                  variant="outline"
                  className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] clay-hover"
                >
                  <MaterialIcon name="arrow_back" />
                  <span className="ml-1.5 hidden sm:inline">Kembali</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-12 lg:px-16 max-w-4xl mx-auto pt-8">
        {/* Score Card */}
        <div className="mb-8">
          <Card className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)] overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Big Score Circle */}
                <div className="w-32 h-32 rounded-full border-4 border-[var(--matcha-500)] flex flex-col items-center justify-center bg-[var(--matcha-100)]">
                  <span className="text-3xl font-headline font-extrabold text-[var(--matcha-800)]">
                    {percentage}%
                  </span>
                  <span className="text-xs text-[var(--matcha-700)] font-medium">
                    {questionStats.correct}/{questionStats.total}
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
                      {questionStats.total} soal
                    </span>
                    <span className="flex items-center gap-1">
                      <MaterialIcon name="check_circle" className="text-sm text-[var(--matcha-600)]" />
                      {questionStats.correct} benar
                    </span>
                    <span className="flex items-center gap-1">
                      <MaterialIcon name="cancel" className="text-sm text-[var(--pomegranate-400)]" />
                      {questionStats.wrong} salah
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
                          aria-label={`Nilai ${star} bintang`}
                          className="p-1 transition-transform hover:scale-110 cursor-pointer"
                        >
                          <MaterialIcon
                            name={(packageRatingQuery.data?.myRating ?? 0) >= star ? "star" : "star_outline"}
                            className={`text-xl ${(packageRatingQuery.data?.myRating ?? 0) >= star ? "text-[var(--lemon-500)]" : "text-[var(--oat-border)]"}`}
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
            {attempt.sections.map((sec) => {
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
                        {sec.timeSpentSec != null && (
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

        {/* Skill Breakdown */}
        <div className="mb-8">
          <h2 className="text-xl font-headline font-bold text-[var(--clay-black)] mb-1">
            Kemampuan per Topik
          </h2>
          <p className="text-sm text-[var(--warm-charcoal)] mb-4">Klik topik untuk filter soal</p>
          <SkillBreakdown
            questions={allQuestions.map(({ q, ans }) => ({
              skillTags: q.skillTags ?? [],
              isCorrect: ans?.isCorrect ?? null,
            }))}
            onSkillClick={toggleSkill}
            activeSkills={filterSkills}
          />
        </div>

        {/* Question Review */}
        <div className="mb-8">
          <div className="flex items-baseline gap-2 mb-4">
            <h2 className="text-xl font-headline font-bold text-[var(--clay-black)]">
              Pembahasan Soal
            </h2>
            {filterStatus !== "all" && (
              <span className="text-sm text-[var(--warm-charcoal)]">
                {filteredQuestions.length} soal
              </span>
            )}
          </div>

          <ReviewFilterBar
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterSkills={filterSkills}
            setFilterSkills={setFilterSkills}
            questions={allQuestions.map(({ q, ans }) => ({
              skillTags: q.skillTags ?? [],
              isCorrect: ans?.isCorrect,
            }))}
            markedCount={partialCount}
            allExpanded={allExpanded}
            onToggleAllExpanded={toggleAllExpanded}
          />

          <div className="space-y-3">
            {filteredQuestions.map(({ q, secIdx, qIdx, ans }) => (
              <QuestionReviewCard
                key={q.id}
                q={q}
                secIdx={secIdx}
                qIdx={qIdx}
                ans={ans}
                userId={session?.user.id}
                isExpanded={expandedIds.has(q.id)}
                onToggleExpand={() => toggleExpand(q.id)}
              />
            ))}
            {filteredQuestions.length === 0 && (
              <div className="text-center py-12">
                <MaterialIcon name="search_off" className="text-4xl text-[var(--warm-silver)] mx-auto mb-3" />
                <p className="text-sm text-[var(--warm-charcoal)]">Tidak ada soal yang sesuai filter.</p>
                <button
                  onClick={() => { setFilterStatus("all"); setFilterSkills([]); }}
                  className="text-sm text-[var(--matcha-600)] font-semibold mt-2 hover:underline cursor-pointer"
                >
                  Reset filter
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
