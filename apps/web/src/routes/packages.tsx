import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { Input } from "@labas/ui/components/input";
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

export const Route = createFileRoute("/packages")({
  component: PackagesComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({ to: "/login", throw: true });
    }
    return { session };
  },
});

const EXAM_TYPES = [
  { id: "IELTS", name: "IELTS" },
  { id: "TOEFL", name: "TOEFL" },
  { id: "JLPT", name: "JLPT" },
  { id: "HSK", name: "HSK" },
  { id: "GOETHE", name: "German" },
];

function PackagesComponent() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [examType, setExamType] = useState<string>("");
  const [page, setPage] = useState(0);
  const limit = 12;

  const query = useQuery(
    trpc.package.list.queryOptions({
      examTypeId: examType || undefined,
      isPublic: true,
      search: search || undefined,
      limit,
      offset: page * limit,
    }),
  );

  const packages = query.data?.packages ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen pt-8 pb-32 px-6 md:px-12 lg:px-16 max-w-7xl mx-auto bg-[var(--warm-cream)]">
      <section className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-headline font-extrabold text-[var(--clay-black)] tracking-tight">
              Paket Soal
            </h1>
            <p className="text-lg text-[var(--warm-charcoal)] mt-2">
              Kumpulan paket latihan dari komunitas.
            </p>
          </div>
          <Link to="/bank">
            <Button className="bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] clay-hover rounded-[var(--radius-lg)] h-11">
              <MaterialIcon name="add" />
              <span className="ml-2 hidden sm:inline">Buat Paket</span>
            </Button>
          </Link>
        </div>
      </section>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-8">
        <div className="relative flex-1 max-w-md">
          <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--warm-charcoal)]" />
          <Input
            placeholder="Cari paket..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-10 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] h-11"
          />
        </div>
        <Select
          items={[
            { value: "", label: "Semua Ujian" },
            ...EXAM_TYPES.map((t) => ({ value: t.id, label: t.name })),
          ]}
          value={examType}
          onValueChange={(v: string | null) => { setExamType(v ?? ""); setPage(0); }}
        >
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

      {/* Results */}
      {query.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-48 bg-[var(--oat-light)] animate-pulse rounded-[var(--radius-xl)]" />
          ))}
        </div>
      ) : packages.length === 0 ? (
        <div className="text-center py-20">
          <MaterialIcon name="folder_open" className="text-6xl text-[var(--warm-silver)] mx-auto mb-4" />
          <p className="text-lg text-[var(--warm-charcoal)] font-semibold">Tidak ada paket ditemukan</p>
          <p className="text-sm text-[var(--warm-silver)] mt-1">Buat paket soal pertama Anda</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg) => (
              <Card key={pkg.id} className="clay-shadow clay-hover bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)] h-full flex flex-col">
                <CardContent className="p-5 flex flex-col h-full">
                  <Link to="/package/$id" params={{ id: pkg.id }} className="block flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <span className="px-2.5 py-1 rounded-full bg-[var(--matcha-300)] text-[var(--matcha-800)] text-xs font-semibold">
                        {pkg.examTypeName}
                      </span>
                      {pkg.avgRating && (
                        <div className="flex items-center gap-1 text-[var(--lemon-700)]">
                          <MaterialIcon name="star" className="text-sm" />
                          <span className="text-xs font-bold">{pkg.avgRating}</span>
                        </div>
                      )}
                    </div>

                    <h3 className="font-headline text-lg font-bold text-[var(--clay-black)] mb-2 line-clamp-2">
                      {pkg.title}
                    </h3>

                    {pkg.description && (
                      <p className="text-sm text-[var(--warm-charcoal)] line-clamp-2 mb-4">
                        {pkg.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-[var(--oat-border)]">
                      <div className="flex gap-3 text-xs text-[var(--warm-charcoal)]">
                        <span className="flex items-center gap-1">
                          <MaterialIcon name="quiz" className="text-xs" />
                          {pkg.totalQuestions}
                        </span>
                        <span className="flex items-center gap-1">
                          <MaterialIcon name="folder" className="text-xs" />
                          {pkg.totalSections}
                        </span>
                        {pkg.estimatedDurationMin && (
                          <span className="flex items-center gap-1">
                            <MaterialIcon name="timer" className="text-xs" />
                            {pkg.estimatedDurationMin}m
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[var(--warm-silver)]">
                        {pkg.usageCount}x digunakan
                      </span>
                    </div>
                  </Link>

                  <div className="mt-4 pt-3 border-t border-[var(--oat-border)]">
                    <Button
                      className="w-full bg-[var(--matcha-600)] text-[var(--pure-white)] hover:bg-[var(--matcha-800)] clay-hover rounded-[var(--radius-lg)]"
                      onClick={() => navigate({ to: '/package/$id/take', params: { id: pkg.id } })}
                    >
                      <MaterialIcon name="play_arrow" className="mr-2" />
                      Mulai Latihan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] clay-hover"
              >
                <MaterialIcon name="chevron_left" />
              </Button>
              <span className="text-sm text-[var(--warm-charcoal)] px-4">
                Halaman {page + 1} dari {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
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
