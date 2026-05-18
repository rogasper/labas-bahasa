import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Button } from "@labas/ui/components/button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-utils";

const STATUSES = ["all", "pending", "running", "completed", "failed", "cancelled"] as const;

export const Route = createFileRoute("/admin/jobs")({
  component: AdminJobs,
});

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

      <div className="bg-[var(--pure-white)] rounded-[var(--radius-xl)] border border-[var(--oat-border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--oat-light)] text-[var(--warm-charcoal)]">
            <tr>
              <th className="text-left px-4 py-3 font-medium">User</th>
              <th className="text-left px-4 py-3 font-medium">Exam</th>
              <th className="text-left px-4 py-3 font-medium">Mode</th>
              <th className="text-left px-4 py-3 font-medium">Progress</th>
              <th className="text-left px-4 py-3 font-medium">Tokens</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Created</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.isLoading ? (
              <tr><td colSpan={8} className="text-center py-16 text-[var(--warm-charcoal)]">Loading...</td></tr>
            ) : (!jobs.data?.jobs || jobs.data.jobs.length === 0) ? (
              <tr><td colSpan={8} className="text-center py-16 text-[var(--warm-charcoal)]">No jobs found.</td></tr>
            ) : (
              jobs.data.jobs.map((job: any) => (
                <tr key={job.id} className="border-t border-[var(--oat-border)] hover:bg-[var(--oat-light)]/50 transition-colors">
                  <td className="px-4 py-3 text-[var(--warm-charcoal)] font-mono text-xs">{job.userId?.slice(0, 10)}...</td>
                  <td className="px-4 py-3">{job.examTypeId}</td>
                  <td className="px-4 py-3 text-xs">{job.mode}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-[var(--oat-border)] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${job.progress === 100 ? "bg-[var(--matcha-500)]" : "bg-[var(--sunbeam-500)]"}`} style={{ width: `${job.progress ?? 0}%` }} />
                      </div>
                      <span className="text-xs text-[var(--warm-charcoal)]">{job.progress ?? 0}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{job.tokensUsed?.toLocaleString() ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      job.status === "completed" ? "bg-[var(--matcha-300)] text-[var(--matcha-800)]" :
                      job.status === "failed" ? "bg-[var(--clay-red)]/10 text-[var(--clay-red)]" :
                      job.status === "cancelled" ? "bg-[var(--oat-border)] text-[var(--warm-charcoal)]" :
                      job.status === "running" ? "bg-[var(--sunbeam-300)] text-[var(--sunbeam-800)]" :
                      "bg-[var(--oat-border)] text-[var(--warm-charcoal)]"
                    }`}>{job.status}</span>
                  </td>
                  <td className="px-4 py-3 text-[var(--warm-charcoal)] text-xs">{formatDate(job.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {(job.status === "pending" || job.status === "running") && (
                      <Button variant="outline" className="text-[var(--clay-red)] h-9 rounded-[var(--radius-lg)] text-xs" onClick={() => cancelMutation.mutate({ jobId: job.id })} disabled={cancelMutation.isPending}>
                        Cancel
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
