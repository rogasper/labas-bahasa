import { useEffect, useCallback, useState } from "react";
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
  DialogDescription,
} from "@labas/ui/components/dialog";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { DataTable } from "@/components/admin/DataTable";
import { Pagination } from "@/components/admin/Pagination";
import type { ColumnDef } from "@/components/admin/DataTable";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-utils";
import { z } from "zod";

const searchSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  search: z.string().optional(),
  status: z.enum(["in_progress", "completed", "abandoned"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional().default("desc"),
}).parse;

export const Route = createFileRoute("/admin/activity")({
  validateSearch: searchSchema,
  component: AdminActivity,
});

const PAGE_SIZE = 25;

interface AttemptRow {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  packageId: string | null;
  packageTitle: string | null;
  status: string;
  isOvertime: boolean;
  startedAt: Date | string;
  finishedAt: Date | string | null;
  totalScore: number | null;
  maxScore: number | null;
}

function statusBadge(status: string, isOvertime?: boolean) {
  if (isOvertime) {
    return {
      label: "Overtime",
      className: "bg-[var(--pomegranate-400)]/15 text-[var(--pomegranate-600)]",
      icon: "warning",
    };
  }
  switch (status) {
    case "in_progress":
      return {
        label: "In Progress",
        className: "bg-[var(--chart-3)]/15 text-[var(--chart-3)]",
        icon: "bolt",
      };
    case "completed":
      return {
        label: "Completed",
        className: "bg-[var(--matcha-300)] text-[var(--matcha-800)]",
        icon: "check_circle",
      };
    case "abandoned":
      return {
        label: "Abandoned",
        className: "bg-[var(--oat-border)] text-[var(--warm-charcoal)]",
        icon: "cancel",
      };
    default:
      return {
        label: status,
        className: "bg-[var(--oat-border)] text-[var(--warm-charcoal)]",
        icon: "help",
      };
  }
}

function AdminActivity() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const page = s.page;
  const [rawSearch, debouncedSearch, setRawSearch] = useDebouncedValue(s.search ?? "", 300);
  const [showAbandonDialog, setShowAbandonDialog] = useState(false);

  useEffect(() => {
    if (debouncedSearch !== (s.search ?? "")) {
      navigate({ search: (prev) => ({ ...prev, search: debouncedSearch || undefined, page: 1 }), replace: true });
    }
  }, [debouncedSearch]);

  const attemptsQuery = useQuery(
    trpc.admin.listAttempts.queryOptions({
      search: debouncedSearch || undefined,
      status: s.status,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
  );

  const abandonMutation = useMutation(
    trpc.admin.abandonStaleAttempts.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: trpc.admin.listAttempts.queryKey() });
        toast.success(`${data.abandoned} stale attempt(s) abandoned.`);
      },
      onError: (e: unknown) => toast.error(getErrorMessage(e)),
    }),
  );

  const attempts = attemptsQuery.data?.attempts ?? [];
  const total = attemptsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function durationMinutes(start: Date | string, finish: Date | string | null): string {
    if (!finish) {
      const ms = Date.now() - new Date(start).getTime();
      const m = Math.floor(ms / 60000);
      if (m < 1) return "< 1m";
      if (m < 60) return `${m}m`;
      return `${Math.floor(m / 60)}j ${m % 60}m`;
    }
    const ms = new Date(finish).getTime() - new Date(start).getTime();
    const m = Math.floor(ms / 60000);
    if (m < 1) return "< 1m";
    if (m < 60) return `${m}m`;
    return `${Math.floor(m / 60)}j ${m % 60}m`;
  }

  function scorePct(row: AttemptRow): string {
    if (row.totalScore == null || row.maxScore == null || row.maxScore === 0) return "-";
    return `${Math.round((row.totalScore / row.maxScore) * 100)}%`;
  }

  function formatRelTime(d: Date | string): string {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "baru saja";
    if (mins < 60) return `${mins}m lalu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}j lalu`;
    const days = Math.floor(hours / 24);
    return `${days}h lalu`;
  }

  function isStale(row: AttemptRow): boolean {
    if (row.status !== "in_progress") return false;
    const diff = Date.now() - new Date(row.startedAt).getTime();
    return diff > 6 * 60 * 60 * 1000;
  }

  const toggleSort = useCallback(
    (column: string) => {
      const newDir = s.sortDir === "desc" ? "asc" : "desc";
      navigate({ search: (prev) => ({ ...prev, sortDir: newDir as "asc" | "desc" }), replace: true });
    },
    [s.sortDir, navigate],
  );

  const columns: ColumnDef<AttemptRow>[] = [
    {
      id: "user",
      header: "User",
      size: "w-[22%]",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-[var(--clay-black)] truncate">{row.userName ?? "Unknown"}</p>
          <p className="text-xs text-[var(--warm-charcoal)] truncate">{row.userEmail ?? "-"}</p>
        </div>
      ),
    },
    {
      id: "package",
      header: "Paket",
      size: "w-[22%]",
      cell: ({ row }) => (
        <p className="text-[var(--clay-black)] truncate">
          {row.packageTitle ?? "-"}
        </p>
      ),
    },
    {
      id: "status",
      header: "Status",
      size: "w-[18%]",
      cell: ({ row }) => {
        const isStaleAttempt = isStale(row);
        const badge = isStaleAttempt
          ? { label: "Stale", className: "bg-[var(--oat-border)] text-[var(--warm-charcoal)]", icon: "timer_off" }
          : statusBadge(row.status, row.isOvertime);
        return (
          <>
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${badge.className}`}>
              <MaterialIcon name={badge.icon} className="text-xs" />
              {badge.label}
            </span>
            {isStaleAttempt && (
              <p className="text-[10px] text-[var(--warm-silver)] mt-0.5">
                {formatRelTime(row.startedAt)}
              </p>
            )}
          </>
        );
      },
    },
    {
      id: "startedAt",
      header: "Mulai",
      size: "w-[14%]",
      sortable: true,
      cell: ({ row }) => (
        <span className="text-xs text-[var(--warm-charcoal)]">{formatRelTime(row.startedAt)}</span>
      ),
    },
    {
      id: "duration",
      header: "Durasi",
      size: "w-[10%]",
      cell: ({ row }) => (
        <span className="text-xs font-mono text-[var(--warm-charcoal)]">
          {durationMinutes(row.startedAt, row.finishedAt)}
        </span>
      ),
    },
    {
      id: "score",
      header: "Skor",
      size: "w-[14%]",
      cell: ({ row }) => {
        const pct = scorePct(row);
        const isCompleted = row.status === "completed";
        return (
          <span className={`text-xs font-mono font-semibold ${
            isCompleted ? "text-[var(--clay-black)]" : "text-[var(--warm-silver)]"
          }`}>
            {pct}
          </span>
        );
      },
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-3xl font-headline font-bold text-[var(--clay-black)]">Activity</h1>
          <p className="text-[var(--warm-charcoal)] mt-1">Lihat semua aktivitas latihan user.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAbandonDialog(true)}
          disabled={abandonMutation.isPending}
          className="border-[var(--pomegranate-600)]/30 text-[var(--pomegranate-600)] hover:bg-[var(--pomegranate-600)]/5 rounded-[var(--radius-lg)] text-xs"
        >
          <MaterialIcon name="timer_off" className="text-sm mr-1" />
          Abandon Stale
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--warm-charcoal)] text-sm" />
          <Input
            placeholder="Cari user, email, atau paket..."
            value={rawSearch}
            onChange={(e) => setRawSearch(e.target.value)}
            aria-label="Search attempts"
            className="pl-8 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] h-10 text-sm"
          />
        </div>

        <div className="flex items-center gap-1">
          {(["in_progress", "completed", "abandoned"] as const).map((st) => {
            const badge = statusBadge(st);
            const isActive = s.status === st;
            return (
              <button
                key={st}
                onClick={() => {
                  navigate({
                    search: (prev) => ({
                      ...prev,
                      status: isActive ? undefined : st,
                      page: 1,
                    }),
                    replace: true,
                  });
                }}
                className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-full transition-colors ${
                  isActive
                    ? badge.className
                    : "bg-[var(--oat-light)] text-[var(--warm-charcoal)] hover:bg-[var(--oat-border)]"
                }`}
              >
                <MaterialIcon name={badge.icon} className="text-xs" />
                {badge.label}
              </button>
            );
          })}
        </div>

        <span className="text-sm text-[var(--warm-charcoal)] ml-auto">{total.toLocaleString("id-ID")} attempt</span>
      </div>

      <DataTable
        data={attempts}
        columns={columns}
        isLoading={attemptsQuery.isLoading}
        isFetching={attemptsQuery.isFetching}
        emptyMessage={
          s.status
            ? `Tidak ada attempt dengan status "${s.status}".`
            : "Belum ada aktivitas latihan."
        }
        keyExtractor={(a) => a.id}
        page={page}
        totalPages={totalPages}
        onPageChange={(p) => navigate({ search: (prev) => ({ ...prev, page: p }), replace: true })}
        onSort={toggleSort}
        sortColumn="startedAt"
        sortDirection={s.sortDir}
      />
      <Pagination page={page} totalPages={totalPages} onChange={(p) => navigate({ search: (prev) => ({ ...prev, page: p }), replace: true })} />

      <Dialog open={showAbandonDialog} onOpenChange={(v) => { if (!v) setShowAbandonDialog(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-headline font-bold text-[var(--clay-black)]">
              Abandon Stale Attempts
            </DialogTitle>
            <DialogDescription className="text-[var(--warm-charcoal)] text-sm mt-2">
              Tandai semua attempt <strong>in_progress</strong> yang sudah lebih dari 24 jam sebagai abandoned. Tindakan ini tidak bisa dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => setShowAbandonDialog(false)}
              className="rounded-[var(--radius-lg)]"
            >
              Batal
            </Button>
            <Button
              onClick={() => {
                abandonMutation.mutate({});
                setShowAbandonDialog(false);
              }}
              disabled={abandonMutation.isPending}
              className="bg-[var(--pomegranate-600)] text-[var(--pure-white)] hover:bg-[var(--pomegranate-600)]/80 rounded-[var(--radius-lg)]"
            >
              {abandonMutation.isPending ? "Processing..." : "Abandon"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
