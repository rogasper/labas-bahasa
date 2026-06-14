import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch, useNavigate, Link } from "@tanstack/react-router";
import { trpc } from "@/utils/trpc";
import { Card, CardContent } from "@labas/ui/components/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { Pagination } from "@/components/admin/Pagination";

const LIMIT = 15;

export function CpnsHistoryComponent() {
  const search = useSearch({ strict: false }) as Record<string, string>;
  const navigate = useNavigate();

  const searchQuery = search.search ?? "";
  const page = parseInt(search.page ?? "1", 10) || 1;
  const offset = (page - 1) * LIMIT;

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setLocalSearch(searchQuery); }, [searchQuery]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (localSearch !== searchQuery) {
        navigate({ search: { search: localSearch || undefined, page: 1 } as any, replace: true });
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [localSearch]);

  function setPage(newPage: number) {
    navigate({ search: { ...search, page: newPage } as any, replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const attempts = useQuery(
    trpc.attempt.myAttempts.queryOptions({
      examTypeId: "CPNS",
      search: searchQuery || undefined,
      limit: LIMIT,
      offset,
    }),
  );

  const rows = attempts.data?.attempts ?? [];
  const total = attempts.data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);
  const isLoading = attempts.isLoading;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-[var(--radius-lg)] bg-[var(--blueberry-800)] flex items-center justify-center">
          <MaterialIcon name="history" className="text-lg text-[var(--pure-white)]" />
        </div>
        <div>
          <h1 className="text-xl font-headline font-bold text-[var(--clay-black)]">Riwayat Latihan CPNS</h1>
          <p className="text-xs text-[var(--warm-charcoal)]">Lihat hasil dan progres latihan CPNS kamu</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--warm-silver)] text-sm" />
          <input
            type="text"
            placeholder="Cari paket..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] text-sm text-[var(--clay-black)] placeholder:text-[var(--warm-silver)] focus:outline-none focus:border-[var(--matcha-500)]"
          />
        </div>
        <p className="text-xs text-[var(--warm-silver)] mt-2">{total} latihan ditemukan</p>
      </div>

      <div className="space-y-3">
        {isLoading && (
          <Card className="bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
            <CardContent className="p-8 text-center">
              <div className="animate-spin inline-block mb-2 text-lg">⟳</div>
              <p className="text-sm text-[var(--warm-charcoal)]">Memuat riwayat...</p>
            </CardContent>
          </Card>
        )}
        {!isLoading && rows.length === 0 && (
          <Card className="bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
            <CardContent className="p-8 text-center">
              <MaterialIcon name="history" className="text-3xl text-[var(--warm-silver)] mb-3" />
              <p className="text-sm font-semibold text-[var(--clay-black)] mb-1">Belum ada latihan</p>
              <p className="text-xs text-[var(--warm-charcoal)]">Mulai latihan CPNS dan hasilnya akan muncul di sini</p>
            </CardContent>
          </Card>
        )}
        {rows.map((a: any) => {
          const pct = a.maxScore && a.maxScore > 0 && a.totalScore != null
            ? Math.round((a.totalScore / a.maxScore) * 100)
            : null;
          return (
            <Card key={a.id} className="bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {a.status === "completed" ? (
                        <MaterialIcon name="check_circle" className="text-[var(--matcha-600)] text-sm shrink-0" />
                      ) : a.status === "abandoned" ? (
                        <MaterialIcon name="cancel" className="text-[var(--warm-silver)] text-sm shrink-0" />
                      ) : (
                        <MaterialIcon name="hourglass_top" className="text-[var(--slushie-600)] text-sm shrink-0" />
                      )}
                      <span className="text-sm font-semibold text-[var(--clay-black)] truncate">
                        {a.packageTitle ?? "Paket tidak diketahui"}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--warm-charcoal)]">
                      {a.startedAt ? new Date(a.startedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {pct != null && (
                      <div className="text-right">
                        <div className="text-lg font-headline font-bold text-[var(--clay-black)]">{pct}%</div>
                        <div className="text-xs text-[var(--warm-charcoal)]">{a.totalScore}/{a.maxScore}</div>
                      </div>
                    )}
                    {a.status === "completed" && (
                      <Link to="/attempt/$id" params={{ id: a.id }}>
                        <button className="px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] hover:bg-[var(--oat-light)] transition-all">
                          Hasil
                        </button>
                      </Link>
                    )}
                    {a.status === "in_progress" && a.packageId && (
                      <Link to="/package/$id/attempt/$attemptId" params={{ id: a.packageId, attemptId: a.id }}>
                        <button className="px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-lg)] bg-[var(--matcha-600)] text-[var(--pure-white)] hover:bg-[var(--matcha-800)] transition-all">
                          Lanjutkan
                        </button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      )}
    </div>
  );
}
