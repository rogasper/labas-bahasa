import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useState } from "react";
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

const RANKINGS_PER_PAGE = 20;

export const Route = createFileRoute("/leaderboard")({
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { data: session } = authClient.useSession();
  const isLoggedIn = !!session;

  const [period, setPeriod] = useState<(typeof PERIODS)[number]["value"]>("week");
  const [examTypeId, setExamTypeId] = useState<string>("");
  const [page, setPage] = useState(0);

  const rankingsQuery = useQuery(
    trpc.leaderboard.getRankings.queryOptions({
      period,
      examTypeId: examTypeId || undefined,
      limit: RANKINGS_PER_PAGE,
      offset: page * RANKINGS_PER_PAGE,
    }),
  );

  const myRankQuery = useQuery({
    ...trpc.leaderboard.getMyRank.queryOptions({
      period,
      examTypeId: examTypeId || undefined,
    }),
    enabled: isLoggedIn,
  });

  const rankings = rankingsQuery.data?.rankings ?? [];
  const total = rankingsQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / RANKINGS_PER_PAGE);

  const isLoading = rankingsQuery.isLoading;

  function handlePeriodChange(value: string) {
    setPeriod(value as typeof period);
    setPage(0);
  }

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
            onClick={() => handlePeriodChange(p.value)}
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
        <Select value={examTypeId} onValueChange={(v) => { setExamTypeId(v ?? ""); setPage(0); }}>
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
            <div
              key={i}
              className="h-16 bg-[var(--oat-light)] animate-pulse rounded-[var(--radius-xl)]"
            />
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
          {/* Podium Top 3 (only on page 0) */}
          {page === 0 && <RankingPodium top3={rankings.slice(0, 3)} />}

          {/* Rankings List */}
          <div className="space-y-3 mt-4">
            {(page === 0 ? rankings.slice(3) : rankings).map((entry) => (
              <RankingRow
                key={entry.userId}
                entry={entry}
                isCurrentUser={isLoggedIn && entry.userId === session?.user.id}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] clay-hover cursor-pointer disabled:opacity-40"
              >
                <MaterialIcon name="chevron_left" className="text-sm" />
                Sebelumnya
              </Button>
              <span className="text-sm text-[var(--warm-charcoal)]">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages - 1}
                className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] clay-hover cursor-pointer disabled:opacity-40"
              >
                Selanjutnya
                <MaterialIcon name="chevron_right" className="text-sm" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* My Rank Card (pinned at bottom) */}
      {isLoggedIn && (
        <MyRankCard data={myRankQuery.data} isLoading={myRankQuery.isLoading} />
      )}
    </div>
  );
}
