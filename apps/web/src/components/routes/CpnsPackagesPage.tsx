import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearch, useNavigate, Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { trpc, queryClient } from "@/utils/trpc";
import { Button } from "@labas/ui/components/button";
import { Card, CardContent } from "@labas/ui/components/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { CpnsPageHeader } from "@/components/ui/CpnsPageHeader";
import { CpnsPackageCard } from "@/components/packages/CpnsPackageCard";
import { Pagination } from "@/components/admin/Pagination";
import { useDebouncedSearch, useDebouncedNavigate } from "@/hooks/use-debounced-search";
import { CPNS_SECTION_CONFIG, CPNS_FULL_TEST } from "@/lib/cpns-constants";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-utils";

const LIMIT = 12;

function pickRandom<T>(items: T[]): T | null {
  if (!items.length) return null;
  const sorted = [...items].sort(() => Math.random() - 0.5);
  return sorted[0] ?? null;
}

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

  const allPackages = useQuery(
    trpc.package.list.queryOptions({ examTypeId: "CPNS", limit: 50, offset: 0 }),
  );

  const rows = packages.data?.packages ?? [];
  const total = packages.data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);
  const isLoading = packages.isLoading;

  // Group packages by section from title
  const grouped = useMemo(() => {
    const g: Record<string, { id: string; title: string; totalQuestions: number }[]> = {};
    for (const pkg of allPackages.data?.packages ?? []) {
      const title: string = (pkg as any).title ?? "";
      const sec = title.includes("TIU") ? "TIU" : title.includes("TWK") ? "TWK" : title.includes("TKP") ? "TKP" : null;
      if (sec) {
        if (!g[sec]) g[sec] = [];
        g[sec].push({ id: (pkg as any).id, title, totalQuestions: (pkg as any).totalQuestions ?? 0 });
      }
    }
    return g;
  }, [allPackages.data]);

  const [rerollKey, setRerollKey] = useState(0);

  const picks = useMemo(() => {
    const result: Record<string, { id: string; title: string; totalQuestions: number } | null> = {};
    for (const s of ["TIU", "TWK", "TKP"] as const) {
      result[s] = pickRandom(grouped[s] ?? []);
    }
    return result;
  }, [grouped, rerollKey]);

  const allAvailable = picks.TIU && picks.TWK && picks.TKP;
  const totalQuestions = [picks.TIU, picks.TWK, picks.TKP].reduce((sum, p) => sum + (p?.totalQuestions ?? 0), 0);

  const comboMutation = useMutation(trpc.combo.create.mutationOptions());

  const { data: session } = authClient.useSession();
  const creatorName = session?.user?.name ?? "User";

  const handleCreate = async () => {
    if (!allAvailable) return;
    const dateStr = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    const title = `[${creatorName}] - Full Test SKD - ${dateStr}`;
    const desc = `Gabungan TIU (${picks.TIU?.totalQuestions} soal) + TWK (${picks.TWK?.totalQuestions} soal) + TKP (${picks.TKP?.totalQuestions} soal).`;
    try {
      const sections = await Promise.all(
        (["TIU", "TWK", "TKP"] as const).map(async (sec, i) => {
          const pick = picks[sec]!;
          const pkg = await queryClient.fetchQuery(
            trpc.package.getById.queryOptions({ id: pick.id }),
          );
          const firstSection = pkg?.sections?.[0];
          if (!firstSection?.id) throw new Error(`Package ${pkg?.title} has no sections`);
          return { sourcePackageId: pick.id, sourceSectionId: firstSection.id, orderIndex: i };
        }),
      );
      const result = await comboMutation.mutateAsync({ title, description: desc, isPublic: true, sections });
      toast.success("Full Test SKD siap!");
      navigate({ to: "/package/$id", params: { id: result.packageId } });
    } catch (err: unknown) {
      toast.error("Gagal membuat paket SKD", { description: getErrorMessage(err) });
    }
  };

  return (
    <div>
      <CpnsPageHeader icon="folder" title="Paket Soal CPNS" subtitle="Latihan soal dari paket yang sudah dibuat" />

      {/* Auto Random Pick — Full Test SKD */}
      <Card className="mb-6 bg-gradient-to-br from-[var(--blueberry-800)]/5 to-[var(--ube-800)]/5 border-2 border-[var(--blueberry-800)]/20 rounded-[var(--radius-xl)]">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-[var(--radius-lg)] bg-[var(--blueberry-800)] flex items-center justify-center shrink-0">
              <MaterialIcon name="workspace_premium" className="text-lg text-[var(--pure-white)]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-[var(--clay-black)]">Full Test SKD — Auto Bundle</p>
              <p className="text-xs text-[var(--warm-charcoal)]">Acak & gabung paket TIU, TWK, TKP jadi satu latihan</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            {(["TIU", "TWK", "TKP"] as const).map((sec) => {
              const cfg = CPNS_SECTION_CONFIG[sec];
              const pick = picks[sec];
              const count = (grouped[sec] ?? []).length;
              return (
                <div key={sec} className={`p-3 rounded-[var(--radius-lg)] border ${pick ? "bg-[var(--pure-white)]/80 border-[var(--oat-border)]" : "bg-[var(--pomegranate-400)]/5 border-[var(--pomegranate-400)]/20"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <MaterialIcon
                      name={pick ? "check_circle" : "error"}
                      className={`text-sm ${pick ? "text-[var(--matcha-600)]" : "text-[var(--pomegranate-400)]"}`}
                    />
                    <p className="text-xs font-semibold text-[var(--clay-black)]">{sec}</p>
                    <span className="text-[10px] text-[var(--warm-silver)]">{cfg.questionCount} soal</span>
                  </div>
                  {pick ? (
                    <>
                      <p className="text-[11px] text-[var(--warm-charcoal)] truncate">{pick.title}</p>
                      <p className="text-[10px] text-[var(--warm-silver)]">{pick.totalQuestions} soal · {cfg.durationMin}m</p>
                    </>
                  ) : (
                    <p className="text-[11px] text-[var(--pomegranate-400)]">
                      Belum ada paket {sec}
                      {sec === "TIU" && " — Generate TIU dulu"}
                      {sec === "TWK" && " — Generate TWK dulu"}
                      {sec === "TKP" && " — Generate TKP dulu"}
                    </p>
                  )}
                  {count > 0 && (
                    <p className="text-[10px] text-[var(--warm-silver)] mt-1">{count} paket tersedia</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[var(--oat-border)]">
            <p className="text-xs text-[var(--warm-charcoal)]">
              {allAvailable
                ? `🎲 ${totalQuestions} soal terkumpul · Target ${CPNS_FULL_TEST.totalTargetScore}`
                : "Pilih section yang belum tersedia untuk generate"}
            </p>
            <div className="flex gap-2">
              {allAvailable && (
                <Button
                  variant="outline"
                  onClick={() => setRerollKey((k) => k + 1)}
                  className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] text-sm"
                >
                  <MaterialIcon name="shuffle" className="text-sm mr-1" />
                  Acak Ulang
                </Button>
              )}
              {!allAvailable && (
                <Link to="/cpns/generate">
                  <Button className="bg-[var(--clay-black)] text-[var(--pure-white)] rounded-[var(--radius-lg)] text-sm">
                    Generate Soal
                  </Button>
                </Link>
              )}
              <Button
                onClick={handleCreate}
                disabled={!allAvailable || comboMutation.isPending}
                className="bg-[var(--clay-black)] text-[var(--pure-white)] rounded-[var(--radius-lg)] text-sm"
              >
                {comboMutation.isPending ? "Menggabungkan..." : "Buat & Mulai Latihan SKD"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search & list */}
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
