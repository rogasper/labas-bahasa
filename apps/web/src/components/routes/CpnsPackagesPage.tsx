import { useQuery } from "@tanstack/react-query";
import { useSearch, useNavigate, Link } from "@tanstack/react-router";
import { trpc } from "@/utils/trpc";
import { Button } from "@labas/ui/components/button";
import { Card, CardContent } from "@labas/ui/components/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { CpnsPageHeader } from "@/components/ui/CpnsPageHeader";
import { CpnsPackageCard } from "@/components/packages/CpnsPackageCard";
import { Pagination } from "@/components/admin/Pagination";
import { useDebouncedSearch, useDebouncedNavigate } from "@/hooks/use-debounced-search";

const LIMIT = 12;

export function CpnsPackagesComponent() {
  const search = useSearch({ strict: false }) as Record<string, string>;
  const navigate = useNavigate();

  const searchText = search.search ?? "";
  const page = parseInt(search.page ?? "1", 10) || 1;
  const offset = (page - 1) * LIMIT;

  const [localSearch, setLocalSearch] = useDebouncedSearch(searchText);
  useDebouncedNavigate(localSearch, searchText, navigate);

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
      <CpnsPageHeader icon="folder" title="Paket Soal CPNS" subtitle="Latihan soal dari paket yang sudah dibuat" />

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--warm-silver)] text-sm" />
          <input
            type="text" placeholder="Cari paket..." value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
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
              <p className="text-sm font-semibold text-[var(--clay-black)] mb-1">Belum ada paket</p>
              <p className="text-xs text-[var(--warm-charcoal)] mb-4">Generate soal CPNS untuk membuat paket latihan</p>
              <Link to="/cpns/generate">
                <Button className="bg-[var(--clay-black)] text-[var(--pure-white)] rounded-[var(--radius-lg)]">Generate Soal</Button>
              </Link>
            </CardContent>
          </Card>
        )}
        {rows.map((pkg: any) => (
          <CpnsPackageCard key={pkg.id} pkg={pkg} />
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      )}
    </div>
  );
}
