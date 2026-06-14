import { useQuery } from "@tanstack/react-query";
import { useSearch, useNavigate, Link } from "@tanstack/react-router";
import { trpc } from "@/utils/trpc";
import { Button } from "@labas/ui/components/button";
import { Card, CardContent } from "@labas/ui/components/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { Pagination } from "@/components/admin/Pagination";

const LIMIT = 12;

export function CpnsPackagesComponent() {
  const search = useSearch({ strict: false }) as Record<string, string>;
  const navigate = useNavigate();

  const searchText = search.search ?? "";
  const page = parseInt(search.page ?? "1", 10) || 1;
  const offset = (page - 1) * LIMIT;

  function setParam(key: string, value: string) {
    navigate({ search: { [key]: value || undefined, page: 1 } as any, replace: true });
  }

  function setPage(newPage: number) {
    navigate({ search: { ...search, page: newPage } as any, replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const packages = useQuery(
    trpc.package.list.queryOptions({
      examTypeId: "CPNS",
      search: searchText || undefined,
      limit: LIMIT,
      offset,
    }),
  );

  const rows = packages.data?.packages ?? [];
  const total = packages.data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);
  const isLoading = packages.isLoading;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-[var(--radius-lg)] bg-[var(--blueberry-800)] flex items-center justify-center">
          <MaterialIcon name="folder" className="text-lg text-[var(--pure-white)]" />
        </div>
        <div>
          <h1 className="text-xl font-headline font-bold text-[var(--clay-black)]">Paket Soal CPNS</h1>
          <p className="text-xs text-[var(--warm-charcoal)]">Latihan soal dari paket yang sudah dibuat</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--warm-silver)] text-sm" />
          <input
            type="text"
            placeholder="Cari paket..."
            value={searchText}
            onChange={(e) => setParam("search", e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] text-sm text-[var(--clay-black)] placeholder:text-[var(--warm-silver)] focus:outline-none focus:border-[var(--matcha-500)]"
          />
        </div>
        <p className="text-xs text-[var(--warm-silver)] mt-2">{total} paket ditemukan</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading && (
          <Card className="md:col-span-2 bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
            <CardContent className="p-8 text-center">
              <div className="animate-spin inline-block mb-2 text-lg">⟳</div>
              <p className="text-sm text-[var(--warm-charcoal)]">Memuat paket...</p>
            </CardContent>
          </Card>
        )}
        {!isLoading && rows.length === 0 && (
          <Card className="md:col-span-2 bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
            <CardContent className="p-8 text-center">
              <MaterialIcon name="folder" className="text-3xl text-[var(--warm-silver)] mb-3" />
              <p className="text-sm font-semibold text-[var(--clay-black)] mb-1">Belum ada paket</p>
              <p className="text-xs text-[var(--warm-charcoal)] mb-4">Generate soal CPNS untuk membuat paket latihan</p>
              <Link to="/cpns/generate">
                <Button className="bg-[var(--clay-black)] text-[var(--pure-white)] rounded-[var(--radius-lg)]">
                  Generate Soal
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
        {rows.map((pkg: any) => (
          <Card key={pkg.id} className="bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)] hover:border-[var(--matcha-400)] transition-all">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <span className="px-2 py-0.5 rounded-full bg-[var(--blueberry-800)]/10 text-[var(--blueberry-800)] text-[10px] font-semibold">CPNS</span>
              </div>
              <h3 className="font-headline font-bold text-[var(--clay-black)] mb-1 line-clamp-2">{pkg.title}</h3>
              {pkg.description && (
                <p className="text-xs text-[var(--warm-charcoal)] line-clamp-2 mb-3">{pkg.description}</p>
              )}
              <div className="flex items-center justify-between pt-3 border-t border-[var(--oat-border)]">
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
                <Link to="/package/$id/take" params={{ id: pkg.id }} className="shrink-0">
                  <Button className="bg-[var(--matcha-600)] text-[var(--pure-white)] rounded-[var(--radius-lg)] h-8 text-xs">
                    Mulai
                  </Button>
                </Link>
              </div>
              <div className="mt-2 pt-2 border-t border-[var(--oat-border)]">
                <Link to="/package/$id" params={{ id: pkg.id }} className="text-xs text-[var(--matcha-600)] font-semibold hover:underline">
                  Lihat Detail →
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      )}
    </div>
  );
}
