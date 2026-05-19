import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Button } from "@labas/ui/components/button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-utils";
import { DataTable } from "@/components/admin/DataTable";
import type { ColumnDef } from "@/components/admin/DataTable";

const STATUSES = ["all", "pending", "running", "completed", "failed", "cancelled"] as const;

export const Route = createFileRoute("/admin/jobs")({
  component: AdminJobs,
});

type JobRow = {
  id: string;
  userId: string | null;
  examTypeId: string | null;
  mode: string | null;
  progress: number | null;
  tokensUsed: number | null;
  status: string;
  createdAt: string | Date;
  completedAt: string | Date | null;
};

function formatDate(dateStr: string | Date | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function AdminJobs() {
  const [status, setStatus] = useState<string>("all");
  const queryClient = useQueryClient();

  const jobs = useQuery(
    trpc.admin.listAllJobs.queryOptions({
      status: status !== "all" ? status : undefined,
      limit: 30,
      offset: 0,
    }),
  );

  const cancelMutation = useMutation(
    trpc.admin.cancelAnyJob.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.admin.listAllJobs.queryKey() });
        toast.success("Job cancelled");
      },
      onError: (e: unknown) => toast.error(getErrorMessage(e)),
    }),
  );

  const columns: ColumnDef<JobRow>[] = [
    {
      id: "user",
      header: "User",
      accessorFn: (j) => <span className="font-mono text-xs text-[var(--warm-charcoal)]">{j.userId?.slice(0, 10)}...</span>,
    },
    { id: "exam", header: "Exam", accessorKey: "examTypeId" },
    {
      id: "mode", header: "Mode",
      cell: ({ value }) => <span className="text-xs">{value as string}</span>,
    },
    {
      id: "progress",
      header: "Progress",
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
      id: "tokens",
      header: "Tokens",
      accessorFn: (j) => j.tokensUsed?.toLocaleString() ?? "-",
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          row.status === "completed" ? "bg-[var(--matcha-300)] text-[var(--matcha-800)]" :
          row.status === "failed" ? "bg-[var(--clay-red)]/10 text-[var(--clay-red)]" :
          row.status === "cancelled" ? "bg-[var(--oat-border)] text-[var(--warm-charcoal)]" :
          row.status === "running" ? "bg-[var(--sunbeam-300)] text-[var(--sunbeam-800)]" :
          "bg-[var(--oat-border)] text-[var(--warm-charcoal)]"
        }`}>{row.status}</span>
      ),
    },
    {
      id: "created",
      header: "Created",
      accessorFn: (j) => <span className="text-xs text-[var(--warm-charcoal)]">{formatDate(j.createdAt)}</span>,
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-headline font-bold text-[var(--clay-black)] mb-2">Generation Jobs</h1>
      <p className="text-[var(--warm-charcoal)] mb-6">Monitor AI generation jobs across the platform.</p>

      <div className="flex flex-wrap gap-2 mb-4">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
              status === s
                ? "bg-[var(--matcha-300)] text-[var(--matcha-800)]"
                : "bg-[var(--oat-light)] text-[var(--warm-charcoal)] hover:bg-[var(--oat-border)]"
            }`}
          >
            {s === "all" ? "All" : s}
          </button>
        ))}
      </div>

      <DataTable
        data={jobs.data?.jobs ?? []}
        columns={columns}
        isLoading={jobs.isLoading}
        emptyMessage="No jobs found."
        keyExtractor={(j) => j.id}
        actions={(j) => (
          (j.status === "pending" || j.status === "running") ? (
            <Button variant="outline" className="text-[var(--clay-red)] h-9 rounded-[var(--radius-lg)] text-xs" onClick={() => cancelMutation.mutate({ jobId: j.id })} disabled={cancelMutation.isPending}>
              Cancel
            </Button>
          ) : null
        )}
      />
    </div>
  );
}
