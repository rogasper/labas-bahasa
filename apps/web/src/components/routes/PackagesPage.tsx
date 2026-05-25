import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { trpc, queryClient } from "@/utils/trpc";
import { Input } from "@labas/ui/components/input";
import { Button } from "@labas/ui/components/button";
import { Card } from "@labas/ui/components/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@labas/ui/components/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@labas/ui/components/select";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { GettingStartedCard } from "@/components/GettingStartedCard";
import { CalloutCard } from "@/components/bank/CalloutCard";
import { PackageCard } from "@/components/packages/PackageCard";
import { PageTour, TourHelpButton } from "@/components/TourGuide";
import type { Step } from "react-joyride";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-utils";
import { EXAM_TYPES } from "@/lib/exam-constants";

export const Route = createFileRoute("/packages")({
  validateSearch: z.object({
    tab: z.enum(["all", "mine"]).optional(),
    search: z.string().optional(),
    examType: z.string().optional(),
    page: z.coerce.number().optional(),
    visibility: z.enum(["all", "private", "public"]).optional(),
  }).parse,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({ to: "/login", throw: true });
    }
    return { session };
  },
});

type Tab = "all" | "mine";

export function PackagesComponent() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;

  const tab = search.tab ?? "all";
  const searchText = search.search ?? "";
  const examType = search.examType ?? "";
  const page = search.page ?? 1;
  const visibilityFilter = search.visibility ?? "all";
  const limit = 12;

  const allQuery = useQuery(
    trpc.package.list.queryOptions(
      {
        isPublic: true,
        examTypeId: examType || undefined,
        search: searchText || undefined,
        limit,
        offset: (page - 1) * limit,
      },
      { enabled: tab === "all" },
    ),
  );

  const visibilityFilterParam = tab === "mine" && visibilityFilter !== "all"
    ? { isPublic: visibilityFilter === "public" }
    : {};

  const mineQuery = useQuery(
    trpc.package.myPackages.queryOptions(
      {
        search: searchText || undefined,
        examTypeId: examType || undefined,
        limit,
        offset: (page - 1) * limit,
        ...visibilityFilterParam,
      },
      { enabled: tab === "mine" },
    ),
  );

  const privateCountQuery = useQuery(
    trpc.package.myPackages.queryOptions(
      { isPublic: false, limit: 1 },
      { enabled: !!userId && tab === "mine" },
    ),
  );
  const totalPrivateCount = privateCountQuery.data?.total ?? 0;

  const query = tab === "all" ? allQuery : mineQuery;
  const packages = query.data?.packages ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const updateMutation = useMutation(
    trpc.package.update.mutationOptions({
      onSuccess: () => {
        query.refetch();
      },
    }),
  );

  const togglePublic = (pkgId: string, current: boolean) => {
    updateMutation.mutate({ id: pkgId, isPublic: !current });
  };

  const bulkPublish = useMutation(
    trpc.package.bulkPublish.mutationOptions({
      onSuccess: (data) => {
        query.refetch();
        privateCountQuery.refetch();
        setBulkMode(false);
        setSelectedIds(new Set());
        if (data.skipped > 0) {
          toast.success(
            `${data.updated} paket dipublikasikan, ${data.skipped} dilewati`,
            { description: "Beberapa paket bukan milikmu atau sudah tidak tersedia." },
          );
        } else {
          toast.success(`${data.updated} paket berhasil dipublikasikan`);
        }
      },
      onError: (err: unknown) => {
        toast.error("Gagal mempublikasikan. Coba refresh dan pilih ulang paket.", { description: getErrorMessage(err) });
      },
    }),
  );

  // ── Bulk select ──
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());
  const selectAll = () => setSelectedIds(new Set(packages.map((p) => p.id)));

  useEffect(() => {
    setBulkMode(false);
    setSelectedIds(new Set());
  }, [tab, searchText, examType]);

  const setTab = (newTab: Tab) => {
    navigate({ search: { tab: newTab, search: "", examType: "", page: 1 } });
  };

  // ── Private callout state ──
  const [calloutDismissed, setCalloutDismissed] = useState(
    typeof window !== "undefined" && localStorage.getItem("labas-packages-private-callout-dismissed") === "true",
  );

  const handleDismissCallout = () => {
    localStorage.setItem("labas-packages-private-callout-dismissed", "true");
    setCalloutDismissed(true);
  };

  const handlePublishAllPrivate = async () => {
    if (!userId || totalPrivateCount === 0) return;
    const allPrivate = await queryClient.fetchQuery(
      trpc.package.myPackages.queryOptions({
        isPublic: false,
        limit: totalPrivateCount,
        offset: 0,
      }),
    );
    const ids = (allPrivate.packages ?? []).map((p) => p.id);
    if (ids.length > 0) bulkPublish.mutate({ ids });
  };

  const setSearch = (value: string) => {
    navigate({ search: (prev) => ({ ...prev, search: value, page: 1 }) });
  };

  const setExamType = (value: string) => {
    navigate({ search: (prev) => ({ ...prev, examType: value, page: 1 }) });
  };

  const setVisibility = (value: "all" | "private" | "public") => {
    navigate({ search: (prev) => ({ ...prev, visibility: value === "all" ? undefined : value, page: 1 }) });
  };

  const setPage = (newPage: number) => {
    navigate({ search: (prev) => ({ ...prev, page: newPage }) });
  };

  return (
    <div className="min-h-screen pt-8 pb-32 px-6 md:px-12 lg:px-16 max-w-7xl mx-auto bg-[var(--warm-cream)]">
      <section className="mb-8">
        <div data-tour="packages-header" className="flex items-center justify-between">
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

      {/* Getting Started Guide */}
      <GettingStartedCard />

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="mb-6">
        <TabsList variant="line" className="h-11 bg-transparent">
          <TabsTrigger
            value="all"
            className="px-4 py-2 rounded-[var(--radius-lg)] text-sm font-semibold data-[active=true]:bg-[var(--clay-black)] data-[active=true]:text-[var(--pure-white)] data-[active=true]:clay-shadow bg-[var(--pure-white)] text-[var(--warm-charcoal)] border-2 border-[var(--oat-border)] hover:bg-[var(--oat-light)] transition-all"
          >
            Semua Paket
          </TabsTrigger>
          <TabsTrigger
            value="mine"
            className="px-4 py-2 rounded-[var(--radius-lg)] text-sm font-semibold data-[active=true]:bg-[var(--clay-black)] data-[active=true]:text-[var(--pure-white)] data-[active=true]:clay-shadow bg-[var(--pure-white)] text-[var(--warm-charcoal)] border-2 border-[var(--oat-border)] hover:bg-[var(--oat-light)] transition-all"
          >
            Paket Saya
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div data-tour="packages-filters" className="flex flex-col md:flex-row gap-3 mb-8">
        <div className="relative flex-1 max-w-md">
          <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--warm-charcoal)]" />
          <Input
            placeholder="Cari paket..."
            value={searchText}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Cari paket"
            className="pl-10 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] h-11"
          />
        </div>
        <Select
          value={examType}
          onValueChange={(v: string | null) => setExamType(v ?? "")}
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
        {tab === "mine" && (
          <div className="flex gap-2">
            <VisChip active={visibilityFilter === "all"} onClick={() => setVisibility("all")}>
              <MaterialIcon name="visibility" className="text-xs" />
              Semua
            </VisChip>
            <VisChip active={visibilityFilter === "private"} onClick={() => setVisibility("private")}>
              <MaterialIcon name="lock" className="text-xs" />
              Privat
            </VisChip>
            <VisChip active={visibilityFilter === "public"} onClick={() => setVisibility("public")}>
              <MaterialIcon name="public" className="text-xs" />
              Publik
            </VisChip>
          </div>
        )}
      </div>

      {/* Bulk toolbar */}
      {tab === "mine" && (
        <div className="flex items-center justify-between mb-4 p-3 rounded-[var(--radius-lg)] bg-[var(--oat-light)] border-2 border-[var(--oat-border)]">
          {bulkMode ? (
            <>
              <div className="flex items-center gap-3">
                <button
                  onClick={clearSelection}
                  className="text-xs font-semibold text-[var(--warm-charcoal)] hover:text-[var(--clay-black)] transition-colors flex items-center gap-1"
                >
                  <MaterialIcon name="close" className="text-xs" />
                  Batalkan ({selectedIds.size})
                </button>
                <button
                  onClick={selectAll}
                  className="text-xs font-semibold text-[var(--matcha-600)] hover:text-[var(--matcha-800)] transition-colors flex items-center gap-1"
                >
                  <MaterialIcon name="select_all" className="text-xs" />
                  Pilih Semua
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="lg"
                  disabled={selectedIds.size === 0 || bulkPublish.isPending}
                  onClick={() => bulkPublish.mutate({ ids: Array.from(selectedIds) })}
                  className="rounded-[var(--radius-md)] bg-[var(--matcha-600)] text-[var(--pure-white)] hover:bg-[var(--matcha-800)]"
                >
                  <MaterialIcon name="public" className="text-xs mr-1" />
                  {bulkPublish.isPending ? "Mempublikasikan..." : `Jadikan Publik (${selectedIds.size})`}
                </Button>
                <button
                  onClick={() => { setBulkMode(false); setSelectedIds(new Set()); }}
                  className="text-xs font-semibold text-[var(--warm-charcoal)] hover:text-[var(--clay-black)] transition-colors"
                >
                  Selesai
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={() => setBulkMode(true)}
              className="text-xs font-semibold text-[var(--matcha-600)] hover:text-[var(--matcha-800)] transition-colors flex items-center gap-1 ml-auto"
            >
              <MaterialIcon name="select_all" className="text-sm" />
              Pilih Banyak
            </button>
          )}
        </div>
      )}

      {/* Private package callout */}
      {tab === "mine" && totalPrivateCount > 0 && !calloutDismissed && (
        <div className="mb-6">
          <CalloutCard
            privateCount={totalPrivateCount}
            label="paket"
            onPublishAll={handlePublishAllPrivate}
            onDismiss={handleDismissCallout}
          />
        </div>
      )}

      {/* Results */}
      {query.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-48 bg-[var(--oat-light)] animate-pulse rounded-[var(--radius-xl)]" />
          ))}
        </div>
      ) : packages.length === 0 ? (
        <div className="text-center py-16">
          <MaterialIcon name="folder_open" className="text-6xl text-[var(--warm-silver)] mx-auto mb-4" />
          <p className="text-lg text-[var(--warm-charcoal)] font-semibold">Tidak ada paket ditemukan</p>
          <p className="text-sm text-[var(--warm-silver)] mt-1 mb-6">
            {tab === "mine"
              ? "Belum ada paket yang Anda buat. Buat paket dari Bank Soal."
              : "Belum ada paket publik. Buat paket soal pertama Anda"}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link to="/generate">
              <Button className="bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] rounded-[var(--radius-lg)]">
                <MaterialIcon name="auto_awesome" className="mr-2" />
                Generate Soal
              </Button>
            </Link>
            <Link to="/bank">
              <Button variant="outline" className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)]">
                <MaterialIcon name="add" className="mr-2" />
                Buat Paket
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div data-tour="packages-list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg) => {
              const isOwner = pkg.creatorUserId === userId;
              return (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  isOwner={isOwner}
                  bulkMode={bulkMode}
                  isSelected={selectedIds.has(pkg.id)}
                  isTogglePending={updateMutation.isPending}
                  onToggleSelect={() => toggleSelect(pkg.id)}
                  onTogglePublic={() => togglePublic(pkg.id, pkg.isPublic)}
                />
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <Button
                variant="outline"
                onClick={() => setPage(Math.max(1, page - 1))}
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
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] clay-hover"
              >
                <MaterialIcon name="chevron_right" />
              </Button>
            </div>
          )}
        </>
      )}

      <PageTour storageKey={PACKAGES_TOUR_KEY} autoDelay={600} steps={packagesPageSteps} />
      <TourHelpButton storageKey={PACKAGES_TOUR_KEY} />
    </div>
  );
}

// ── Packages page tour ──
const PACKAGES_TOUR_KEY = "labas-page-tour-packages";
const packagesPageSteps: Step[] = [
  {
    target: "[data-tour='packages-header']",
    title: "Paket Soal",
    content: "Temukan paket soal dari komunitas atau lihat paket buatan sendiri. Klik 'Buat Paket' untuk membuat paket baru dari Bank Soal.",
    spotlightPadding: 8,
  },
  {
    target: "[data-tour='packages-filters']",
    title: "Filter & Pencarian",
    content: "Cari paket berdasarkan nama atau filter berdasarkan jenis ujian (IELTS, TOEFL, dll). Bisa juga switch antara 'Semua Paket' dan 'Paket Saya'.",
    spotlightPadding: 8,
  },
  {
    target: "[data-tour='packages-list']",
    title: "Mulai Latihan",
    content: "Klik kartu paket untuk lihat detail, atau langsung klik 'Mulai Latihan' untuk mengerjakan soal. Pantau skor dan progres kamu!",
    spotlightPadding: 8,
  },
];

function VisChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
        active
          ? "bg-[var(--clay-black)] text-[var(--pure-white)] clay-shadow"
          : "bg-[var(--pure-white)] text-[var(--warm-charcoal)] border-2 border-[var(--oat-border)] hover:bg-[var(--oat-light)]"
      }`}
    >
      {children}
    </button>
  );
}
