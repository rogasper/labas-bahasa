import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Input } from "@labas/ui/components/input";
import { Button } from "@labas/ui/components/button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-utils";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-[var(--pure-white)] rounded-[var(--radius-xl)] border border-[var(--oat-border)] p-6">
      <p className="text-sm text-[var(--warm-charcoal)]">{label}</p>
      <p className="text-3xl font-headline font-bold text-[var(--clay-black)] mt-2">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {sub && <p className="text-xs text-[var(--warm-charcoal)] mt-1">{sub}</p>}
    </div>
  );
}

function AdminDashboard() {
  const [poolInput, setPoolInput] = useState("");
  const queryClient = useQueryClient();
  const stats = useQuery(trpc.admin.dashboardStats.queryOptions());

  const setConfigMutation = useMutation(
    trpc.admin.setPlatformConfig.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.admin.dashboardStats.queryKey() });
        toast.success("Config updated");
      },
      onError: (e: unknown) => toast.error(getErrorMessage(e)),
    }),
  );

  if (stats.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
      </div>
    );
  }

  const s = stats.data;
  const poolPct = s && s.poolMax > 0 ? Math.round((s.poolUsed ?? 0) / s.poolMax * 100) : 0;
  const enabled = s?.freeCreditsEnabled ?? false;

  return (
    <div>
      <h1 className="text-3xl font-headline font-bold text-[var(--clay-black)] mb-2">Admin Dashboard</h1>
      <p className="text-[var(--warm-charcoal)] mb-8">Platform overview at a glance.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Users" value={s?.totalUsers ?? 0} />
        <StatCard label="Questions" value={s?.totalQuestions ?? 0} />
        <StatCard label="Packages" value={s?.totalPackages ?? 0} />
        <StatCard label="Jobs" value={s?.totalJobs ?? 0} />
      </div>

      <div className="bg-[var(--pure-white)] rounded-[var(--radius-xl)] border border-[var(--oat-border)] p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-headline font-bold text-[var(--clay-black)]">Free Credit Pool</h2>
          <button
            onClick={() => setConfigMutation.mutate({ key: "free_credits_enabled", value: String(!enabled) })}
            disabled={setConfigMutation.isPending}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ${
              enabled ? "bg-[var(--clay-black)] border-[var(--clay-black)]" : "bg-gray-300 border-gray-300"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition duration-200 ${
                enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        <div className="flex items-baseline gap-4 mb-3">
          <span className="text-3xl font-headline font-bold text-[var(--clay-black)]">{((s?.poolUsed ?? 0) / 1000).toFixed(0)}K</span>
          <span className="text-sm text-[var(--warm-charcoal)]">used of {((s?.poolMax ?? 1000000) / 1000).toFixed(0)}K tokens</span>
        </div>
        <div className="w-full h-3 bg-[var(--oat-border)] rounded-full overflow-hidden mb-4">
          <div
            className={`h-full rounded-full transition-all ${poolPct > 90 ? "bg-[var(--clay-red)]" : "bg-[var(--matcha-500)]"}`}
            style={{ width: `${Math.min(100, poolPct)}%` }}
          />
        </div>
        <p className="text-xs text-[var(--warm-charcoal)] mb-4">{poolPct}% used · {((s?.poolRemaining ?? 0) / 1000).toFixed(0)}K remaining</p>

        <div className="flex gap-3 items-end pt-4 border-t border-[var(--oat-border)]">
          <div>
            <label className="text-xs text-[var(--warm-charcoal)] block mb-1">Pool Size</label>
            <Input
              type="number"
              value={poolInput || String(s?.poolMax ?? "")}
              onChange={(e) => setPoolInput(e.target.value)}
              placeholder="1000000"
              className="w-40 h-10 rounded-[var(--radius-lg)] border-[var(--oat-border)]"
            />
          </div>
          <Button
            onClick={() => {
              const val = parseInt(poolInput, 10);
              if (!poolInput || isNaN(val) || val <= 0) {
                toast.error("Enter a valid number");
                return;
              }
              setConfigMutation.mutate({ key: "free_credits_max_pool", value: String(val) });
            }}
            disabled={setConfigMutation.isPending}
            className="h-10 rounded-[var(--radius-lg)]"
          >
            Save
          </Button>
        </div>
      </div>

      {s && s.totalUsers === 0 && (
        <p className="text-[var(--warm-charcoal)] text-sm mt-6">No data yet. Stats will appear as users start using the platform.</p>
      )}
    </div>
  );
}
