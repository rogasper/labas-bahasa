import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Input } from "@labas/ui/components/input";
import { Button } from "@labas/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@labas/ui/components/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@labas/ui/components/tabs";
import { Card } from "@labas/ui/components/card";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-utils";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { QuestionDetailModal } from "@/components/bank/QuestionDetailModal";
import { Pagination } from "@/components/admin/Pagination";

export const Route = createFileRoute("/admin/featured")({
  component: AdminFeatured,
});

type Tab = "featured" | "packages" | "questions";

type PackageDetail = Record<string, unknown> & {
  id: string;
  title?: string;
  description?: string | null;
  examTypeId?: string;
  examTypeName?: string | null;
  creatorUserId?: string;
  creatorName?: string | null;
  isPublic?: boolean;
  isFeatured?: boolean;
  totalQuestions?: number;
  totalSections?: number;
  estimatedDurationMin?: number | null;
  usageCount?: number;
  avgRating?: number | null;
  createdAt?: string | Date;
};

function AdminFeatured() {
  const [tab, setTab] = useState<Tab>("featured");
  const [search, debouncedSearch, setSearch] = useDebouncedValue("", 300);
  const [page, setPage] = useState(1);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<{ type: "package" | "question"; data: Record<string, unknown> } | null>(null);
  const limit = 15;
  const queryClient = useQueryClient();

  const featured = useQuery(trpc.admin.listFeatured.queryOptions());
  const fPackages = featured.data?.packages ?? [];
  const fQuestions = featured.data?.questions ?? [];

  const searchQuery = useQuery(
    trpc.admin.searchContent.queryOptions(
      { search: debouncedSearch, type: tab === "packages" ? "packages" : "questions", limit, offset: (page - 1) * limit },
      { enabled: tab !== "featured" },
    ),
  );

  const togglePkgMutation = useMutation(
    trpc.admin.toggleFeaturedPackage.mutationOptions({
      onMutate: (vars) => setTogglingId(vars.packageId),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.admin.listFeatured.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.admin.searchContent.queryKey() });
        toast.success("Package updated");
      },
      onError: (e: unknown) => toast.error(getErrorMessage(e)),
      onSettled: () => setTogglingId(null),
    }),
  );

  const toggleQMutation = useMutation(
    trpc.admin.toggleFeaturedQuestion.mutationOptions({
      onMutate: (vars) => setTogglingId(vars.questionId),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.admin.listFeatured.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.admin.searchContent.queryKey() });
        toast.success("Question updated");
      },
      onError: (e: unknown) => toast.error(getErrorMessage(e)),
      onSettled: () => setTogglingId(null),
    }),
  );

  function handleSearch(val: string) {
    setSearch(val);
    setPage(1);
  }

  function handleTabChange(v: string) {
    setTab(v as Tab);
    setSearch("");
    setPage(1);
  }

  function formatDate(d: string | Date | null | undefined) {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "featured", label: "Currently Featured" },
    { key: "packages", label: "Browse Packages" },
    { key: "questions", label: "Browse Questions" },
  ];

  function SkeletonCard() {
    return <Card className="h-[60px] bg-[var(--oat-light)] animate-pulse rounded-[var(--radius-lg)]" />;
  }

  function RicherSkeleton() {
    return <Card className="h-[120px] bg-[var(--oat-light)] animate-pulse rounded-[var(--radius-lg)]" />;
  }

  function EmptyState({ icon, title, message }: { icon: string; title: string; message: string }) {
    return (
      <div className="text-center py-12">
        <MaterialIcon name={icon} className="text-5xl text-[var(--warm-silver)] mx-auto mb-3" />
        <p className="text-sm font-semibold text-[var(--warm-charcoal)]">{title}</p>
        <p className="text-xs text-[var(--warm-silver)] mt-1">{message}</p>
      </div>
    );
  }

  function PackageDetailDialog({ item, onClose }: { item: Record<string, unknown>; onClose: () => void }) {
    const pkg = item as PackageDetail;
    const creator = pkg.creatorName ?? pkg.creatorUserId?.slice(0, 8) ?? "Unknown";
    return (
      <Dialog open onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <DialogTitle className="text-xl font-headline font-bold text-[var(--clay-black)]">
                {pkg.title ?? "Untitled Package"}
              </DialogTitle>
              <div className="flex gap-2 shrink-0 ml-4">
                {pkg.examTypeName && (
                  <span className="px-3 py-1 rounded-full bg-[var(--matcha-300)] text-[var(--matcha-800)] text-xs font-semibold">{pkg.examTypeName}</span>
                )}
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${pkg.isFeatured ? "bg-[var(--sunbeam-300)] text-[var(--sunbeam-800)]" : "bg-[var(--oat-border)] text-[var(--warm-charcoal)]"}`}>
                  {pkg.isFeatured ? "Featured" : "Not Featured"}
                </span>
              </div>
            </div>
          </DialogHeader>

          {pkg.description && (
            <div className="bg-[var(--oat-light)] rounded-[var(--radius-xl)] p-4 border border-[var(--oat-border)]">
              <p className="text-sm text-[var(--clay-black)] leading-relaxed">{pkg.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[var(--pure-white)] rounded-[var(--radius-xl)] p-4 border border-[var(--oat-border)]">
              <p className="text-xs text-[var(--warm-charcoal)]">Questions</p>
              <p className="text-xl font-bold text-[var(--clay-black)]">{pkg.totalQuestions ?? "-"}</p>
            </div>
            <div className="bg-[var(--pure-white)] rounded-[var(--radius-xl)] p-4 border border-[var(--oat-border)]">
              <p className="text-xs text-[var(--warm-charcoal)]">Sections</p>
              <p className="text-xl font-bold text-[var(--clay-black)]">{pkg.totalSections ?? "-"}</p>
            </div>
            <div className="bg-[var(--pure-white)] rounded-[var(--radius-xl)] p-4 border border-[var(--oat-border)]">
              <p className="text-xs text-[var(--warm-charcoal)]">Duration</p>
              <p className="text-xl font-bold text-[var(--clay-black)]">{pkg.estimatedDurationMin ? `${pkg.estimatedDurationMin}m` : "-"}</p>
            </div>
            <div className="bg-[var(--pure-white)] rounded-[var(--radius-xl)] p-4 border border-[var(--oat-border)]">
              <p className="text-xs text-[var(--warm-charcoal)]">Used</p>
              <p className="text-xl font-bold text-[var(--clay-black)]">{pkg.usageCount?.toLocaleString() ?? 0}</p>
            </div>
          </div>

          <div className="space-y-2 text-sm text-[var(--warm-charcoal)] border-t border-[var(--oat-border)] pt-4">
            <div className="flex justify-between">
              <span>Creator</span>
              <span className="font-medium text-[var(--clay-black)]">{creator}</span>
            </div>
            <div className="flex justify-between">
              <span>Visibility</span>
              <span className={`font-semibold ${pkg.isPublic ? "text-[var(--matcha-700)]" : "text-[var(--warm-charcoal)]"}`}>{pkg.isPublic ? "Public" : "Private"}</span>
            </div>
            <div className="flex justify-between">
              <span>Created</span>
              <span className="text-[var(--clay-black)]">{formatDate(pkg.createdAt)}</span>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-[var(--oat-border)]">
            <Button variant="outline" onClick={onClose} className="rounded-[var(--radius-lg)]">Close</Button>
            <Button
              className="rounded-[var(--radius-lg)]"
              onClick={() => { togglePkgMutation.mutate({ packageId: pkg.id }); onClose(); }}
              disabled={togglingId === pkg.id}
            >
              {togglingId === pkg.id ? "..." : pkg.isFeatured ? "Unfeature" : "Feature"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-headline font-bold text-[var(--clay-black)] mb-2">Editor&apos;s Pick</h1>
      <p className="text-[var(--warm-charcoal)] mb-6">Curate featured content for the homepage.</p>

      <Tabs value={tab} onValueChange={handleTabChange} className="mb-6">
        <TabsList variant="line" className="h-10 bg-transparent border-b border-[var(--oat-border)]">
          {tabs.map((t) => (
            <TabsTrigger
              key={t.key}
              value={t.key}
              className="px-4 py-2.5 text-sm font-medium rounded-t-[var(--radius-lg)] data-[active=true]:bg-[var(--pure-white)] data-[active=true]:text-[var(--clay-black)] data-[active=true]:border data-[active=true]:border-[var(--oat-border)] data-[active=true]:border-b-[var(--pure-white)] data-[active=true]:-mb-[1px] text-[var(--warm-charcoal)] hover:text-[var(--clay-black)] transition-colors"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Currently Featured tab ── */}
        <TabsContent value="featured" className="mt-6">
          {featured.isLoading ? (
            <div className="space-y-8">
              <section>
                <div className="h-5 w-44 bg-[var(--oat-light)] rounded animate-pulse mb-4" />
                <div className="space-y-2">{[1, 2, 3].map((i) => <RicherSkeleton key={i} />)}</div>
              </section>
              <section>
                <div className="h-5 w-48 bg-[var(--oat-light)] rounded animate-pulse mb-4" />
                <div className="space-y-2">{[1, 2, 3].map((i) => <SkeletonCard key={i} />)}</div>
              </section>
            </div>
          ) : (
            <div className="space-y-8">
              <section>
                <h2 className="text-lg font-headline font-bold text-[var(--clay-black)] mb-4 flex items-center gap-2">
                  Featured Packages
                  <span className="text-sm text-[var(--warm-charcoal)]">({fPackages.length})</span>
                </h2>
                {fPackages.length === 0 ? (
                  <EmptyState icon="inventory_2" title="No featured packages" message="Browse and feature packages from the tabs above." />
                ) : (
                  <div className="space-y-2">
                    {fPackages.map((pkg) => (
                      <PackageCardItem
                        key={pkg.id}
                        pkg={pkg as unknown as PackageDetail}
                        isToggling={togglingId === pkg.id}
                        onToggle={() => togglePkgMutation.mutate({ packageId: pkg.id })}
                        onClick={() => setDetailItem({ type: "package", data: pkg as unknown as Record<string, unknown> })}
                      />
                    ))}
                  </div>
                )}
              </section>
              <section>
                <h2 className="text-lg font-headline font-bold text-[var(--clay-black)] mb-4 flex items-center gap-2">
                  Featured Questions
                  <span className="text-sm text-[var(--warm-charcoal)]">({fQuestions.length})</span>
                </h2>
                {fQuestions.length === 0 ? (
                  <EmptyState icon="help_outline" title="No featured questions" message="Browse and feature questions from the tabs above." />
                ) : (
                  <div className="space-y-2">
                    {fQuestions.map((q) => (
                      <div
                        key={q.id}
                        className="flex items-center justify-between bg-[var(--pure-white)] border border-[var(--oat-border)] rounded-[var(--radius-lg)] px-4 py-3 cursor-pointer hover:bg-[var(--oat-light)]/50 transition-colors"
                        onClick={() => setDetailItem({ type: "question", data: q as unknown as Record<string, unknown> })}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[var(--clay-black)] truncate">{q.questionText}</p>
                          <p className="text-xs text-[var(--warm-charcoal)]">{q.format} · {q.examTypeId}</p>
                        </div>
                        <Button
                          variant="outline"
                          className="shrink-0 ml-4 h-9 rounded-[var(--radius-lg)] text-xs"
                          onClick={(e) => { e.stopPropagation(); toggleQMutation.mutate({ questionId: q.id }); }}
                          disabled={togglingId === q.id}
                        >
                          {togglingId === q.id ? "..." : "Unfeature"}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </TabsContent>

        {/* ── Browse Packages tab ── */}
        <TabsContent value="packages" className="mt-6">
          <div className="relative max-w-md mb-4">
            <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--warm-charcoal)]" />
            <Input
              placeholder="Search packages..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              aria-label="Search packages"
              className="pl-10 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] h-11"
            />
          </div>
          <SearchResults
            query={searchQuery}
            tab="packages"
            page={page}
            setPage={setPage}
            limit={limit}
            togglingId={togglingId}
            onItemClick={(item) => setDetailItem({ type: "package", data: item })}
            onTogglePackage={(pkgId) => togglePkgMutation.mutate({ packageId: pkgId })}
            onToggleQuestion={(qId) => toggleQMutation.mutate({ questionId: qId })}
          />
        </TabsContent>

        {/* ── Browse Questions tab ── */}
        <TabsContent value="questions" className="mt-6">
          <div className="relative max-w-md mb-4">
            <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--warm-charcoal)]" />
            <Input
              placeholder="Search questions..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              aria-label="Search questions"
              className="pl-10 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] h-11"
            />
          </div>
          <SearchResults
            query={searchQuery}
            tab="questions"
            page={page}
            setPage={setPage}
            limit={limit}
            togglingId={togglingId}
            onItemClick={(item) => setDetailItem({ type: "question", data: item })}
            onTogglePackage={(pkgId) => togglePkgMutation.mutate({ packageId: pkgId })}
            onToggleQuestion={(qId) => toggleQMutation.mutate({ questionId: qId })}
          />
        </TabsContent>
      </Tabs>

      {/* Detail dialogs */}
      {detailItem?.type === "question" && (
        <QuestionDetailModal
          question={detailItem.data as Record<string, unknown> & { id: string }}
          onClose={() => setDetailItem(null)}
          isAdmin
          isPublic={(detailItem.data as { isPublic?: boolean }).isPublic}
          onToggleVisibility={undefined}
        />
      )}
      {detailItem?.type === "package" && (
        <PackageDetailDialog
          item={detailItem.data}
          onClose={() => setDetailItem(null)}
        />
      )}
    </div>
  );
}

/* ── Shared components ── */

function PackageCardItem({
  pkg,
  isSearchResult,
  isToggling,
  onToggle,
  onClick,
}: {
  pkg: PackageDetail;
  isSearchResult?: boolean;
  isToggling: boolean;
  onToggle: () => void;
  onClick: () => void;
}) {
  const isFeatured = pkg.isFeatured ?? false;
  const creator = pkg.creatorName ?? pkg.creatorUserId?.slice(0, 8) ?? "Unknown";

  return (
    <div
      className="flex items-start justify-between bg-[var(--pure-white)] border border-[var(--oat-border)] rounded-[var(--radius-lg)] px-5 py-4 cursor-pointer hover:bg-[var(--oat-light)]/50 transition-colors"
      onClick={onClick}
    >
      <div className="flex-1 min-w-0 mr-4">
        {/* Badge row */}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="px-2.5 py-1 rounded-full bg-[var(--slushie-500)]/15 text-[var(--slushie-800)] text-xs font-semibold leading-none flex items-center gap-1">
            <MaterialIcon name="person" className="text-[10px]" />
            {creator}
          </span>
          {(pkg.examTypeName ?? pkg.examTypeId) && (
            <span className="px-2.5 py-1 rounded-full bg-[var(--matcha-300)] text-[var(--matcha-800)] text-xs font-semibold leading-none">
              {pkg.examTypeName ?? pkg.examTypeId}
            </span>
          )}
          {isFeatured && (
            <span className="px-2.5 py-1 rounded-full bg-[var(--sunbeam-300)] text-[var(--sunbeam-800)] text-xs font-semibold">
              <MaterialIcon name="star" className="text-[10px] mr-0.5 inline" />
              Featured
            </span>
          )}
          {isSearchResult && !isFeatured && (
            <span className="px-2.5 py-1 rounded-full bg-[var(--oat-border)] text-[var(--warm-charcoal)] text-xs font-semibold">
              Not Featured
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-headline font-bold text-[var(--clay-black)] mb-1 leading-snug">
          {pkg.title ?? "Untitled"}
        </h3>

        {/* Description preview */}
        {pkg.description && (
          <p className="text-sm text-[var(--warm-charcoal)] line-clamp-2 mb-2 leading-relaxed">
            {pkg.description}
          </p>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs text-[var(--warm-silver)] flex-wrap">
          {pkg.totalQuestions !== undefined && (
            <span className="flex items-center gap-1">
              <MaterialIcon name="quiz" className="text-xs" />
              {pkg.totalQuestions}
            </span>
          )}
          {pkg.totalSections !== undefined && (
            <span className="flex items-center gap-1">
              <MaterialIcon name="folder" className="text-xs" />
              {pkg.totalSections}
            </span>
          )}
          {pkg.estimatedDurationMin && (
            <span className="flex items-center gap-1">
              <MaterialIcon name="timer" className="text-xs" />
              {pkg.estimatedDurationMin}m
            </span>
          )}
          {pkg.usageCount !== undefined && (
            <span className="flex items-center gap-1">
              <MaterialIcon name="trending_up" className="text-xs" />
              {pkg.usageCount.toLocaleString()} uses
            </span>
          )}
          {pkg.avgRating && (
            <span className="flex items-center gap-1 text-[var(--lemon-700)]">
              <MaterialIcon name="star" className="text-xs" />
              {pkg.avgRating}
            </span>
          )}
          <span className="text-[var(--warm-silver)]">·</span>
          <span>{new Date(pkg.createdAt ?? "").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
        </div>
      </div>

      {/* Action button */}
      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
        <Button
          variant={isFeatured ? "outline" : "default"}
          className="h-9 rounded-[var(--radius-lg)] text-xs"
          onClick={onToggle}
          disabled={isToggling}
        >
          {isToggling ? "..." : isFeatured ? "Unfeature" : "Feature"}
        </Button>
      </div>
    </div>
  );
}

function SearchResults({
  query,
  tab,
  page,
  setPage,
  limit,
  togglingId,
  onItemClick,
  onTogglePackage,
  onToggleQuestion,
}: {
  query: ReturnType<typeof useQuery>;
  tab: "packages" | "questions";
  page: number;
  setPage: (fn: (p: number) => number) => void;
  limit: number;
  togglingId: string | null;
  onItemClick: (item: Record<string, unknown>) => void;
  onTogglePackage: (id: string) => void;
  onToggleQuestion: (id: string) => void;
}) {
  const data = query.data as { items: Array<Record<string, unknown>>; total: number } | undefined;
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  if (query.isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="h-[60px] bg-[var(--oat-light)] animate-pulse rounded-[var(--radius-lg)]" />
        ))}
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-[var(--warm-charcoal)] mb-3">
        {query.isSuccess ? `${total.toLocaleString()} ${tab} found` : ""}
      </p>

      {items.length === 0 ? (
        <div className="text-center py-12">
          <MaterialIcon name="search_off" className="text-5xl text-[var(--warm-silver)] mx-auto mb-3" />
          <p className="text-sm font-semibold text-[var(--warm-charcoal)]">No {tab} found</p>
          <p className="text-xs text-[var(--warm-silver)] mt-1">Try adjusting your search or browse a different category.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const id = item.id as string;
            const isFeatured = item.isFeatured as boolean;

            if (tab === "packages") {
              return (
                <PackageCardItem
                  key={id}
                  pkg={item as PackageDetail}
                  isSearchResult
                  isToggling={togglingId === id}
                  onToggle={() => onTogglePackage(id)}
                  onClick={() => onItemClick(item)}
                />
              );
            }

            // Question items
            const title = (item.title ?? item.questionText) as string;
            const examTypeId = item.examTypeId as string;
            const format = item.format as string | undefined;
            return (
              <div
                key={id}
                className="flex items-center justify-between bg-[var(--pure-white)] border border-[var(--oat-border)] rounded-[var(--radius-lg)] px-4 py-3 cursor-pointer hover:bg-[var(--oat-light)]/50 transition-colors"
                onClick={() => onItemClick(item)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--clay-black)] truncate">{title}</p>
                  <p className="text-xs text-[var(--warm-charcoal)]">
                    {format ? `${format} · ${examTypeId}` : examTypeId}
                    {isFeatured && (
                      <span className="ml-2 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-[var(--sunbeam-300)] text-[var(--sunbeam-800)]">Featured</span>
                    )}
                  </p>
                </div>
                <Button
                  variant={isFeatured ? "outline" : "default"}
                  className="shrink-0 ml-4 h-9 rounded-[var(--radius-lg)] text-xs"
                  onClick={(e) => { e.stopPropagation(); onToggleQuestion(id); }}
                  disabled={togglingId === id}
                >
                  {togglingId === id ? "..." : isFeatured ? "Unfeature" : "Feature"}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {total > limit && (
        <Pagination page={page} totalPages={Math.ceil(total / limit)} onChange={(p) => setPage(() => p)} />
      )}
    </>
  );
}
