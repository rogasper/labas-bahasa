import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-utils";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { DataTable } from "@/components/admin/DataTable";
import { Pagination } from "@/components/admin/Pagination";
import type { ColumnDef } from "@/components/admin/DataTable";
import { z } from "zod";

const STATUSES = ["all", "pending", "running", "completed", "completed_partial", "failed", "cancelled"] as const;

const searchSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  search: z.string().optional(),
  status: z.string().optional(),
}).parse;

export const Route = createFileRoute("/admin/jobs")({
  validateSearch: searchSchema,
  component: AdminJobs,
});

type JobRow = {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  examTypeId: string | null;
  sectionTypeId: string | null;
  mode: string | null;
  progress: number | null;
  tokensUsed: number | null;
  questionCount: number | null;
  errorMessage: string | null;
  generationKeySource: string | null;
  status: string;
  createdAt: string | Date;
  completedAt: string | Date | null;
};

function formatDate(dateStr: string | Date | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function AdminJobs() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const page = s.page;
  const status = s.status ?? "all";
  const [rawSearch, debouncedSearch, setRawSearch] = useDebouncedValue(s.search ?? "", 300);
  const [detailJob, setDetailJob] = useState<JobRow | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const PAGE_SIZE = 30;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (debouncedSearch !== (s.search ?? "")) {
      navigate({ search: (prev) => ({ ...prev, search: debouncedSearch || undefined, page: 1 }), replace: true });
    }
  }, [debouncedSearch]);

  const jobsQuery = useQuery(
    trpc.admin.listAllJobs.queryOptions({
      status: status !== "all" ? status : undefined,
      search: debouncedSearch || undefined,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
  );

  const jobData = jobsQuery.data?.jobs ?? [];
  const total = jobsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const cancelMutation = useMutation(
    trpc.admin.cancelAnyJob.mutationOptions({
      onMutate: (_vars) => setCancellingId(_vars.jobId),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.admin.listAllJobs.queryKey() });
        setDetailJob(null);
        toast.success("Job cancelled");
      },
      onError: (e: unknown) => toast.error(getErrorMessage(e)),
      onSettled: () => setCancellingId(null),
    }),
  );

  function handleCancel(jobId: string) {
    if (!confirm("Cancel this job?")) return;
    cancelMutation.mutate({ jobId });
  }

  function statusColor(s: string): string {
    const map: Record<string, string> = {
      completed: "bg-[var(--matcha-300)] text-[var(--matcha-800)]",
      completed_partial: "bg-[var(--pomegranate-400)]/10 text-[var(--pomegranate-400)]",
      failed: "bg-[var(--clay-red)]/10 text-[var(--clay-red)]",
      cancelled: "bg-[var(--oat-border)] text-[var(--warm-charcoal)]",
      running: "bg-[var(--sunbeam-300)] text-[var(--sunbeam-800)]",
    };
    return map[s] ?? "bg-[var(--oat-border)] text-[var(--warm-charcoal)]";
  }

  const columns: ColumnDef<JobRow>[] = [
    {
      id: "user",
      header: "User",
      size: "w-[18%]",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-[var(--clay-black)] text-sm truncate">{row.userName ?? row.userId?.slice(0, 10)}</p>
          {row.userEmail && <p className="text-xs text-[var(--warm-charcoal)] truncate">{row.userEmail}</p>}
        </div>
      ),
    },
    { id: "exam", header: "Exam", size: "w-[10%]", cell: ({ row }) => <span className="text-xs">{row.examTypeId ?? "-"}</span> },
    {
      id: "mode", header: "Mode", size: "w-[10%]",
      cell: ({ row }) => <span className="text-xs">{row.mode ?? "-"}</span>,
    },
    {
      id: "progress",
      header: "Progress",
      size: "w-[15%]",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-[var(--oat-border)] rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${(row.progress ?? 0) >= 100 ? "bg-[var(--matcha-500)]" : "bg-[var(--sunbeam-500)]"}`} style={{ width: `${row.progress ?? 0}%` }} />
          </div>
          <span className="text-xs text-[var(--warm-charcoal)]">{row.progress ?? 0}%</span>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      size: "w-[13%]",
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block w-fit ${statusColor(row.status)}`}>{row.status}</span>
          {row.status === "failed" && row.errorMessage && (
            <span className="text-[10px] text-[var(--clay-red)] truncate max-w-[140px]" title={row.errorMessage}>{row.errorMessage}</span>
          )}
        </div>
      ),
    },
    {
      id: "source", header: "Source", size: "w-[14%]",
      cell: ({ row }) => {
        const key = row.generationKeySource;
        let cls = "bg-[var(--oat-border)] text-[var(--warm-charcoal)]";
        let label = key ?? "-";
        if (key === "free_credit") { cls = "bg-[var(--slushie-500)]/20 text-[var(--slushie-800)]"; label = "Free Credit"; }
        else if (key === "byok") { cls = "bg-[var(--ube-300)]/30 text-[var(--ube-800)]"; label = "BYOK"; }
        return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
      },
    },
    {
      id: "completed",
      header: "Completed",
      size: "w-[12%]",
      cell: ({ row }) => <span className="text-xs text-[var(--warm-charcoal)]">{formatDate(row.completedAt)}</span>,
    },
    {
      id: "created",
      header: "Created",
      size: "w-[12%]",
      accessorFn: (j) => <span className="text-xs text-[var(--warm-charcoal)]">{formatDate(j.createdAt)}</span>,
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-headline font-bold text-[var(--clay-black)] mb-2">Generation Jobs</h1>
      <p className="text-[var(--warm-charcoal)] mb-6">Monitor AI generation jobs across the platform.</p>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--warm-charcoal)] text-sm" />
          <Input
            placeholder="Search by user name or email..."
            value={rawSearch}
            onChange={(e) => { setRawSearch(e.target.value); }}
            aria-label="Search jobs by user"
            className="pl-8 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] h-10 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => { navigate({ search: (prev) => ({ ...prev, status: s === "all" ? undefined : s, page: 1 }), replace: true }); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                status === s
                  ? "bg-[var(--matcha-300)] text-[var(--matcha-800)]"
                  : "bg-[var(--oat-light)] text-[var(--warm-charcoal)] hover:bg-[var(--oat-border)]"
              }`}
              aria-pressed={status === s}
            >
              {s === "all" ? "All" : s.replace(/_/g, " ")}
            </button>
          ))}
        </div>
        <span className="text-sm text-[var(--warm-charcoal)]">{total.toLocaleString()} jobs</span>
      </div>

      <DataTable
        data={jobData}
        columns={columns}
        isLoading={jobsQuery.isLoading}
        isFetching={jobsQuery.isFetching}
        emptyMessage="No jobs found."
        keyExtractor={(j) => j.id}
        page={page}
        totalPages={totalPages}
        onPageChange={(p) => navigate({ search: (prev) => ({ ...prev, page: p }), replace: true })}
        onRowClick={(j) => setDetailJob(j)}
        actionsHeader=""
        actions={(j) => (
          (j.status === "pending" || j.status === "running") ? (
            <Button
              variant="outline"
              className="text-[var(--clay-red)] h-9 rounded-[var(--radius-lg)] text-xs"
              onClick={(e) => { e.stopPropagation(); handleCancel(j.id); }}
              disabled={cancellingId === j.id}
            >
              {cancellingId === j.id ? "..." : "Cancel"}
            </Button>
          ) : null
        )}
      />
      <Pagination page={page} totalPages={totalPages} onChange={(p) => navigate({ search: (prev) => ({ ...prev, page: p }), replace: true })} />

      {/* Detail Dialog */}
      <Dialog open={!!detailJob} onOpenChange={(v) => { if (!v) setDetailJob(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {detailJob && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-headline font-bold text-[var(--clay-black)]">
                  Job Detail
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* User */}
                <div className="bg-[var(--oat-light)] rounded-[var(--radius-xl)] p-4 border border-[var(--oat-border)]">
                  <p className="text-xs text-[var(--warm-charcoal)] mb-1">User</p>
                  <p className="font-medium text-[var(--clay-black)]">{detailJob.userName ?? "Unknown"}</p>
                  {detailJob.userEmail && <p className="text-sm text-[var(--warm-charcoal)]">{detailJob.userEmail}</p>}
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[var(--pure-white)] rounded-[var(--radius-xl)] p-4 border border-[var(--oat-border)]">
                    <p className="text-xs text-[var(--warm-charcoal)] mb-1">Job ID</p>
                    <p className="text-xs font-mono text-[var(--clay-black)] break-all">{detailJob.id}</p>
                  </div>
                  <div className="bg-[var(--pure-white)] rounded-[var(--radius-xl)] p-4 border border-[var(--oat-border)]">
                    <p className="text-xs text-[var(--warm-charcoal)] mb-1">Status</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor(detailJob.status)}`}>{detailJob.status}</span>
                  </div>
                  <div className="bg-[var(--pure-white)] rounded-[var(--radius-xl)] p-4 border border-[var(--oat-border)]">
                    <p className="text-xs text-[var(--warm-charcoal)] mb-1">Exam</p>
                    <p className="text-sm font-medium text-[var(--clay-black)]">{detailJob.examTypeId ?? "-"}</p>
                  </div>
                  <div className="bg-[var(--pure-white)] rounded-[var(--radius-xl)] p-4 border border-[var(--oat-border)]">
                    <p className="text-xs text-[var(--warm-charcoal)] mb-1">Mode</p>
                    <p className="text-sm font-medium text-[var(--clay-black)]">{detailJob.mode ?? "-"}</p>
                  </div>
                  <div className="bg-[var(--pure-white)] rounded-[var(--radius-xl)] p-4 border border-[var(--oat-border)]">
                    <p className="text-xs text-[var(--warm-charcoal)] mb-1">Section</p>
                    <p className="text-sm font-medium text-[var(--clay-black)]">{detailJob.sectionTypeId ?? "-"}</p>
                  </div>
                  <div className="bg-[var(--pure-white)] rounded-[var(--radius-xl)] p-4 border border-[var(--oat-border)]">
                    <p className="text-xs text-[var(--warm-charcoal)] mb-1">Questions</p>
                    <p className="text-sm font-medium text-[var(--clay-black)]">{detailJob.questionCount ?? "-"}</p>
                  </div>
                </div>

                {/* Progress */}
                <div className="bg-[var(--pure-white)] rounded-[var(--radius-xl)] p-4 border border-[var(--oat-border)]">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-[var(--warm-charcoal)]">Progress</p>
                    <span className="text-xs text-[var(--warm-charcoal)]">{detailJob.progress ?? 0}%</span>
                  </div>
                  <div className="h-2 bg-[var(--oat-border)] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${(detailJob.progress ?? 0) >= 100 ? "bg-[var(--matcha-500)]" : "bg-[var(--sunbeam-500)]"}`}
                      style={{ width: `${detailJob.progress ?? 0}%` }}
                    />
                  </div>
                </div>

                {/* Tokens */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[var(--pure-white)] rounded-[var(--radius-xl)] p-4 border border-[var(--oat-border)]">
                    <p className="text-xs text-[var(--warm-charcoal)] mb-1">Tokens Used</p>
                    <p className="text-lg font-bold text-[var(--clay-black)]">{detailJob.tokensUsed?.toLocaleString() ?? "-"}</p>
                  </div>
                  <div className="bg-[var(--pure-white)] rounded-[var(--radius-xl)] p-4 border border-[var(--oat-border)]">
                    <p className="text-xs text-[var(--warm-charcoal)] mb-1">Created</p>
                    <p className="text-sm text-[var(--clay-black)]">{formatDate(detailJob.createdAt)}</p>
                  </div>
                </div>

                {/* Error */}
                {detailJob.errorMessage && (
                  <div className="bg-[var(--clay-red)]/5 rounded-[var(--radius-xl)] p-4 border border-[var(--clay-red)]/30">
                    <p className="text-xs font-semibold text-[var(--clay-red)] mb-1 flex items-center gap-1">
                      <MaterialIcon name="error" className="text-sm" />
                      Error
                    </p>
                    <p className="text-sm text-[var(--clay-red)] whitespace-pre-wrap">{detailJob.errorMessage}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-[var(--oat-border)]">
                <Button
                  variant="outline"
                  onClick={() => setDetailJob(null)}
                  className="rounded-[var(--radius-lg)]"
                >
                  Close
                </Button>
                {(detailJob.status === "pending" || detailJob.status === "running") && (
                  <Button
                    className="rounded-[var(--radius-lg)]"
                    variant="destructive"
                    onClick={() => handleCancel(detailJob.id)}
                    disabled={cancellingId === detailJob.id}
                  >
                    {cancellingId === detailJob.id ? "Cancelling..." : "Cancel Job"}
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
