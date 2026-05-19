import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Input } from "@labas/ui/components/input";
import { Button } from "@labas/ui/components/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@labas/ui/components/tabs";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-utils";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

export const Route = createFileRoute("/admin/featured")({
  component: AdminFeatured,
});

type Tab = "featured" | "packages" | "questions";

function AdminFeatured() {
  const [tab, setTab] = useState<Tab>("featured");
  const [search, debouncedSearch, setSearch] = useDebouncedValue("", 300);
  const [page, setPage] = useState(1);
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
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.admin.listFeatured.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.admin.searchContent.queryKey() });
        toast.success("Package updated");
      },
      onError: (e: unknown) => toast.error(getErrorMessage(e)),
    }),
  );

  const toggleQMutation = useMutation(
    trpc.admin.toggleFeaturedQuestion.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.admin.listFeatured.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.admin.searchContent.queryKey() });
        toast.success("Question updated");
      },
      onError: (e: unknown) => toast.error(getErrorMessage(e)),
    }),
  );

  function handleSearch(val: string) {
    setSearch(val);
    setPage(1);
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "featured", label: "Currently Featured" },
    { key: "packages", label: "Browse Packages" },
    { key: "questions", label: "Browse Questions" },
  ];

  return (
    <div>
      <h1 className="text-3xl font-headline font-bold text-[var(--clay-black)] mb-2">Editor&apos;s Pick</h1>
      <p className="text-[var(--warm-charcoal)] mb-6">Curate featured content for the homepage.</p>

      <Tabs
        value={tab}
        onValueChange={(v) => { setTab(v as Tab); setSearch(""); setPage(1); }}
        className="mb-6"
      >
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

        <TabsContent value="featured" className="mt-6">
          <div className="space-y-8">
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-headline font-bold text-[var(--clay-black)]">Featured Packages</h2>
                <span className="text-sm text-[var(--warm-charcoal)]">({fPackages.length})</span>
              </div>
              {fPackages.length === 0 ? (
                <p className="text-sm text-[var(--warm-charcoal)] py-4">No featured packages. Browse and select from the tabs above.</p>
              ) : (
                <div className="space-y-2">
                  {fPackages.map((pkg) => (
                    <div key={pkg.id} className="flex items-center justify-between bg-[var(--pure-white)] border border-[var(--oat-border)] rounded-[var(--radius-lg)] px-4 py-3">
                      <div>
                        <p className="font-medium text-[var(--clay-black)]">{pkg.title}</p>
                        <p className="text-xs text-[var(--warm-charcoal)]">{pkg.examTypeId}</p>
                      </div>
                      <Button variant="outline" onClick={() => togglePkgMutation.mutate({ packageId: pkg.id })} disabled={togglePkgMutation.isPending} className="h-9 rounded-[var(--radius-lg)] text-xs">Unfeature</Button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-headline font-bold text-[var(--clay-black)]">Featured Questions</h2>
                <span className="text-sm text-[var(--warm-charcoal)]">({fQuestions.length})</span>
              </div>
              {fQuestions.length === 0 ? (
                <p className="text-sm text-[var(--warm-charcoal)] py-4">No featured questions.</p>
              ) : (
                <div className="space-y-2">
                  {fQuestions.map((q) => (
                    <div key={q.id} className="flex items-center justify-between bg-[var(--pure-white)] border border-[var(--oat-border)] rounded-[var(--radius-lg)] px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[var(--clay-black)] truncate">{q.questionText}</p>
                        <p className="text-xs text-[var(--warm-charcoal)]">{q.format} · {q.examTypeId}</p>
                      </div>
                      <Button variant="outline" className="shrink-0 ml-4 h-9 rounded-[var(--radius-lg)] text-xs" onClick={() => toggleQMutation.mutate({ questionId: q.id })} disabled={toggleQMutation.isPending}>Unfeature</Button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </TabsContent>

        <TabsContent value="packages" className="mt-6">
          <div className="relative flex-1">
            <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--warm-charcoal)]" />
            <Input
              placeholder="Search packages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search packages"
              className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] h-11"
            />
          </div>
          <SearchResults query={searchQuery} tab="packages" page={page} setPage={setPage} limit={limit} togglePkgMutation={togglePkgMutation} toggleQMutation={toggleQMutation} />
        </TabsContent>

        <TabsContent value="questions" className="mt-6">
          <Input
            placeholder="Search questions..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="max-w-md mb-4"
          />
          <SearchResults query={searchQuery} tab="questions" page={page} setPage={setPage} limit={limit} togglePkgMutation={togglePkgMutation} toggleQMutation={toggleQMutation} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SearchResults({
  query,
  tab,
  page,
  setPage,
  limit,
  togglePkgMutation,
  toggleQMutation,
}: {
  query: ReturnType<typeof useQuery>;
  tab: "packages" | "questions";
  page: number;
  setPage: (fn: (p: number) => number) => void;
  limit: number;
  togglePkgMutation: { mutate: (args: { packageId: string }) => void; isPending: boolean };
  toggleQMutation: { mutate: (args: { questionId: string }) => void; isPending: boolean };
}) {
  if (query.isLoading) {
    return <p className="text-sm text-[var(--warm-charcoal)] py-8 text-center">Searching...</p>;
  }
  const data = query.data as { items: Array<{ id: string; title?: string; questionText?: string; format?: string; examTypeId?: string; isFeatured?: boolean }>; total: number } | undefined;
  return (
    <>
      <p className="text-sm text-[var(--warm-charcoal)] mb-3">
        {query.isSuccess ? `Showing ${data?.total ?? 0} ${tab}` : ""}
      </p>
      <div className="space-y-2">
        {(data?.items ?? []).map((item) => (
          <div key={item.id} className="flex items-center justify-between bg-[var(--pure-white)] border border-[var(--oat-border)] rounded-[var(--radius-lg)] px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[var(--clay-black)] truncate">
                {item.title ?? item.questionText}
              </p>
              <p className="text-xs text-[var(--warm-charcoal)]">
                {item.format ? `${item.format} · ${item.examTypeId}` : item.examTypeId}
                {item.isFeatured && (
                  <span className="ml-2 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-[var(--sunbeam-300)] text-[var(--sunbeam-800)]">Featured</span>
                )}
              </p>
            </div>
            <Button
              variant={item.isFeatured ? "outline" : "default"}
              className="shrink-0 ml-4 h-9 rounded-[var(--radius-lg)] text-xs"
              onClick={() => {
                if (tab === "packages") togglePkgMutation.mutate({ packageId: item.id });
                else toggleQMutation.mutate({ questionId: item.id });
              }}
              disabled={togglePkgMutation.isPending || toggleQMutation.isPending}
            >
              {item.isFeatured ? "Unfeature" : "Feature"}
            </Button>
          </div>
        ))}
      </div>
      {data && data.total > limit && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Previous</Button>
          <span className="text-sm text-[var(--warm-charcoal)]">Page {page} of {Math.ceil(data.total / limit)}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page * limit >= data.total}>Next</Button>
        </div>
      )}
    </>
  );
}