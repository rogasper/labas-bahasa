import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { Button } from "@labas/ui/components/button";
import { Card, CardContent } from "@labas/ui/components/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@labas/ui/components/select";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { EXAM_TYPES } from "@/lib/exam-constants";
import { RankingPodium } from "@/components/leaderboard/RankingPodium";
import { RankingRow } from "@/components/leaderboard/RankingRow";
import { MyRankCard } from "@/components/leaderboard/MyRankCard";

const PERIODS = [
  { value: "today" as const, label: "Hari Ini" },
  { value: "week" as const, label: "Minggu Ini" },
  { value: "month" as const, label: "Bulan Ini" },
  { value: "all" as const, label: "Sepanjang Masa" },
] as const;

export const Route = createFileRoute("/leaderboard")({
  component: LeaderboardPage,
  validateSearch: z.object({
    examTypeId: z.string().optional(),
  }).parse,
});

function GapRow({ count }: { count: number }) {
  return (
    <div className="flex items-center justify-center py-4 text-[var(--warm-charcoal)]">
      <span className="text-xs font-medium tracking-widest">
        · · · {count.toLocaleString()} lainnya · · ·
      </span>
    </div>
  );
}

function LeaderboardPage() {
  const { data: session } = authClient.useSession();
  const isLoggedIn = !!session;
  const navigate = useNavigate();
  const routeSearch = useSearch({ strict: false }) as Record<string, string>;

  const [period, setPeriod] = useState<(typeof PERIODS)[number]["value"]>("week");
  const [examTypeId, setExamTypeId] = useState<string>(routeSearch.examTypeId ?? "");

  const handleExamTypeChange = (value: string) => {
    setExamTypeId(value);
    navigate({ search: { examTypeId: value || undefined } as any, replace: true });
  };

  const rankingsQuery = useQuery(
    trpc.leaderboard.getRankings.queryOptions({
      period,
      examTypeId: examTypeId || undefined,
      limit: 20,
      offset: 0,
      nearUserId: session?.user.id ?? undefined,
    }),
  );

  const myRankQuery = useQuery({
    ...trpc.leaderboard.getMyRank.queryOptions({
      period,
      examTypeId: examTypeId || undefined,
    }),
    enabled: isLoggedIn,
  });

  const rankingsData = rankingsQuery.data;
  const rankings = rankingsData && "rankings" in rankingsData ? (rankingsData as { rankings: any[]; nearRankings: any[]; total: number; userRank: number | null }).rankings ?? [] : [];
  const nearRankings = rankingsData && "nearRankings" in rankingsData ? (rankingsData as { rankings: any[]; nearRankings: any[]; total: number; userRank: number | null }).nearRankings ?? [] : [];
  const total = rankingsData && "total" in rankingsData ? (rankingsData as any).total ?? 0 : 0;
  const userRank = rankingsData && "userRank" in rankingsData ? (rankingsData as { rankings: any[]; nearRankings: any[]; total: number; userRank: number | null }).userRank ?? null : null;
  const isLoading = rankingsQuery.isLoading;

  const gap = userRank ? Math.max(0, userRank - 3 - 5) : 0;

  return (
    <div className="min-h-screen pt-8 pb-32 px-6 md:px-12 lg:px-16 max-w-3xl mx-auto bg-[var(--warm-cream)]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-[var(--warm-charcoal)] mb-4">
          <Link to="/dashboard" className="hover:text-[var(--clay-black)] transition-colors">
            Beranda
          </Link>
          <MaterialIcon name="chevron_right" className="text-xs" />
          <span className="text-[var(--clay-black)] font-medium">Klasemen</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-headline font-extrabold text-[var(--clay-black)] tracking-tight">
              Klasemen
            </h1>
            <p className="text-lg text-[var(--warm-charcoal)] mt-2">
              Lihat peringkat berdasarkan total skor latihan.
            </p>
          </div>
        </div>
      </div>

      {/* Period Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {PERIODS.map((p) => (
          <Button
            key={p.value}
            variant={period === p.value ? "default" : "outline"}
            onClick={() => setPeriod(p.value)}
            className={`rounded-[var(--radius-lg)] clay-hover cursor-pointer ${
              period === p.value
                ? "bg-[var(--clay-black)] text-[var(--pure-white)]"
                : "border-2 border-[var(--oat-border)] bg-[var(--pure-white)] text-[var(--clay-black)] hover:bg-[var(--oat-light)]"
            }`}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* Exam Filter */}
      <div className="mb-6">
        <Select value={examTypeId} onValueChange={(v) => handleExamTypeChange(v ?? "")}>
          <SelectTrigger className="w-[180px] rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)]">
            <SelectValue placeholder="Semua Ujian" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="">Semua Ujian</SelectItem>
              {EXAM_TYPES.map((exam) => (
                <SelectItem key={exam.id} value={exam.id}>
                  {exam.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        /* Loading */
        <div className="space-y-4">
          <div className="flex items-end justify-center gap-4 py-8">
            {[120, 140, 120].map((w, i) => (
              <div
                key={i}
                className={`w-[${w}px] h-${i === 1 ? "36" : i === 0 ? "28" : "24"} bg-[var(--oat-light)] animate-pulse rounded-[var(--radius-xl)]`}
              />
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-[var(--oat-light)] animate-pulse rounded-[var(--radius-xl)]" />
          ))}
        </div>
      ) : rankings.length === 0 ? (
        /* Empty */
        <Card className="bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
          <CardContent className="p-12 text-center">
            <MaterialIcon name="leaderboard" className="text-5xl text-[var(--warm-silver)] mx-auto mb-4" />
            <p className="text-[var(--warm-charcoal)] font-semibold text-lg">
              Belum ada data untuk periode ini
            </p>
            <p className="text-sm text-[var(--warm-silver)] mt-2">
              Mulai latihan dan selesaikan paket soal untuk masuk klasemen.
            </p>
            <Link to="/packages" className="inline-block mt-6">
              <Button className="bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] rounded-[var(--radius-lg)] clay-shadow clay-hover cursor-pointer">
                <MaterialIcon name="folder" className="mr-2" />
                Mulai Latihan
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Podium Top 3 */}
          <RankingPodium top3={rankings.slice(0, 3)} />

          {/* Rankings List */}
          <div className="space-y-3 mt-4">
            {/* Ranks 4-5 */}
            {rankings.slice(3).map((entry) => (
              <RankingRow
                key={entry.userId}
                entry={entry}
                isCurrentUser={isLoggedIn && entry.userId === session?.user.id}
              />
            ))}

            {/* Gap if user is beyond top 5 */}
            {gap > 0 && <GapRow count={gap} />}

            {/* Near user's rank */}
            {nearRankings.map((entry) => (
              <RankingRow
                key={entry.userId}
                entry={entry}
                isCurrentUser={isLoggedIn && entry.userId === session?.user.id}
              />
            ))}
          </div>
        </>
      )}

      {/* My Rank Card (pinned at bottom) */}
      {isLoggedIn && (
        <MyRankCard data={myRankQuery.data} isLoading={myRankQuery.isLoading} />
      )}
    </div>
  );
}
