import { useCallback, useRef, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { Button } from "@labas/ui/components/button";
import { Card, CardContent } from "@labas/ui/components/card";
import { Input } from "@labas/ui/components/input";
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

export const Route = createFileRoute("/history")({
  validateSearch: z.object({
    page: z.coerce.number().optional(),
    examTypeId: z.string().optional(),
    search: z.string().optional(),
  }).parse,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({ to: "/login", throw: true });
    }
    return { session };
  },
});

function formatDate(dateStr: string | Date | null) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--matcha-300)] text-[var(--matcha-800)] text-xs font-semibold">
          <MaterialIcon name="check_circle" className="text-xs" />
          Selesai
        </span>
      );
    case "abandoned":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--oat-light)] text-[var(--warm-charcoal)] text-xs font-semibold">
          <MaterialIcon name="cancel" className="text-xs" />
          Ditinggalkan
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--slushie-500)]/20 text-[var(--slushie-800)] text-xs font-semibold">
          <MaterialIcon name="hourglass_top" className="text-xs" />
          Berlangsung
        </span>
      );
  }
}

export function HistoryComponent() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const page = search.page ?? 1;
  const examTypeId = search.examTypeId ?? "";
  const searchQuery = search.search ?? "";
  const limit = 12;

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (localSearch !== searchQuery) {
        navigate({ search: (prev) => ({ ...prev, search: localSearch || undefined, page: 1 }) });
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [localSearch]);

  const setExamTypeFilter = useCallback((value: string) => {
    navigate({ search: (prev) => ({ ...prev, examTypeId: value || undefined, page: 1 }) });
  }, [navigate]);

  const query = useQuery(
    trpc.attempt.myAttempts.queryOptions({
      limit,
      offset: (page - 1) * limit,
      examTypeId: examTypeId || undefined,
      search: searchQuery || undefined,
    }),
  );

  const attempts = query.data?.attempts ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen pt-8 pb-32 px-6 md:px-12 lg:px-16 max-w-5xl mx-auto bg-[var(--warm-cream)]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-[var(--warm-charcoal)] mb-4">
          <Link to="/dashboard" className="hover:text-[var(--clay-black)] transition-colors">
            Beranda
          </Link>
          <MaterialIcon name="chevron_right" className="text-xs" />
          <span className="text-[var(--clay-black)] font-medium">Riwayat Latihan</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-headline font-extrabold text-[var(--clay-black)] tracking-tight">
              Riwayat Latihan
            </h1>
            <p className="text-lg text-[var(--warm-charcoal)] mt-2">
              Semua attempt latihan Anda.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 mt-6">
          <div className="relative flex-1 max-w-md">
            <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--warm-charcoal)]" />
            <Input
              placeholder="Cari paket..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              aria-label="Cari paket"
              className="pl-10 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] h-11"
            />
          </div>
          <Select value={examTypeId} onValueChange={(v) => setExamTypeFilter(v ?? "")}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Semua Ujian" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="">Semua Ujian</SelectItem>
                {EXAM_TYPES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results */}
      {query.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="h-24 bg-[var(--oat-light)] animate-pulse rounded-[var(--radius-xl)]" />
          ))}
        </div>
      ) : attempts.length === 0 ? (
        <div className="text-center py-20">
          <MaterialIcon name="history" className="text-6xl text-[var(--warm-silver)] mx-auto mb-4" />
          <p className="text-lg text-[var(--warm-charcoal)] font-semibold">Belum ada riwayat latihan</p>
          <p className="text-sm text-[var(--warm-silver)] mt-1">
            Mulai latihan dari paket soal untuk melihat riwayat di sini.
          </p>
          <Link to="/packages" className="inline-block mt-6">
            <Button className="bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] rounded-[var(--radius-lg)]">
              <MaterialIcon name="folder" className="mr-2" />
              Lihat Paket Soal
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {attempts.map((attempt) => {
              const pct =
                attempt.maxScore && attempt.maxScore > 0 && attempt.totalScore != null
                  ? Math.round((attempt.totalScore / attempt.maxScore) * 100)
                  : null;

              return (
                <Card
                  key={attempt.id}
                  className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)] hover:border-[var(--matcha-400)] transition-colors"
                >
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {getStatusBadge(attempt.status)}
                          {attempt.examTypeName && (
                            <span className="px-2.5 py-1 rounded-full bg-[var(--matcha-300)] text-[var(--matcha-800)] text-xs font-semibold">
                              {attempt.examTypeName}
                            </span>
                          )}
                        </div>

                        <h2 className="font-headline text-lg font-bold text-[var(--clay-black)] truncate">
                          {attempt.packageTitle ?? "Paket tidak diketahui"}
                        </h2>

                        <div className="flex items-center gap-4 mt-1 text-xs text-[var(--warm-charcoal)]">
                          <span className="flex items-center gap-1">
                            <MaterialIcon name="event" className="text-xs" />
                            {formatDate(attempt.startedAt)}
                          </span>
                          {attempt.finishedAt && (
                            <span className="flex items-center gap-1">
                              <MaterialIcon name="check" className="text-xs" />
                              {formatDate(attempt.finishedAt)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-6 shrink-0">
                        {pct != null && (
                          <div className="text-center">
                            <div className="text-2xl font-headline font-extrabold text-[var(--clay-black)]">
                              {pct}%
                            </div>
                            <div className="text-xs text-[var(--warm-charcoal)]">
                              {attempt.totalScore}/{attempt.maxScore}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          {attempt.status === "completed" && (
                            <Link to="/attempt/$id" params={{ id: attempt.id }}>
                              <Button
                                variant="outline"
                                className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] clay-hover text-sm"
                              >
                                <MaterialIcon name="visibility" className="mr-1" />
                                Hasil
                              </Button>
                            </Link>
                          )}
                          {attempt.packageId && (
                            <Link to="/package/$id" params={{ id: attempt.packageId }}>
                              <Button
                                variant="outline"
                                className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] clay-hover text-sm"
                              >
                                <MaterialIcon name="folder" className="mr-1" />
                                Paket
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <Button
                variant="outline"
                onClick={() => navigate({ search: (prev) => ({ ...prev, page: Math.max(1, page - 1) }) })}
                disabled={page <= 1}
                className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] clay-hover"
              >
                <MaterialIcon name="chevron_left" />
              </Button>
              <span className="text-sm text-[var(--warm-charcoal)] px-4">
                Halaman {page} dari {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => navigate({ search: (prev) => ({ ...prev, page: Math.min(totalPages, page + 1) }) })}
                disabled={page >= totalPages}
                className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] clay-hover"
              >
                <MaterialIcon name="chevron_right" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
