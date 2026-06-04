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
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-utils";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { DataTable } from "@/components/admin/DataTable";
import { Pagination } from "@/components/admin/Pagination";
import type { ColumnDef } from "@/components/admin/DataTable";
import { z } from "zod";

const searchSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortDir: z.enum(["asc", "desc"]).optional().default("desc"),
}).parse;

export const Route = createFileRoute("/admin/credits")({
  validateSearch: searchSchema,
  component: AdminCredits,
});

const REFILL_AMOUNT = 50000;
const PAGE_SIZE = 25;

type UserCreditRow = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: string;
  tokenBalance: number;
  lifetimeTokensUsed: number;
  creditUpdatedAt: string | Date | null;
  createdAt: string | Date;
};

type SortBy = "" | "balance" | "usage" | "recent";
type SortDir = "asc" | "desc";

function AdminCredits() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const page = s.page;
  const sortBy = (s.sortBy ?? "usage") as SortBy;
  const sortDir = s.sortDir;
  const [rawSearch, debouncedSearch, setRawSearch] = useDebouncedValue(s.search ?? "", 300);

  useEffect(() => {
    if (debouncedSearch !== (s.search ?? "")) {
      navigate({ search: (prev) => ({ ...prev, search: debouncedSearch || undefined, page: 1 }), replace: true });
    }
  }, [debouncedSearch]);

  const [detailUser, setDetailUser] = useState<UserCreditRow | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [customNote, setCustomNote] = useState("");
  const [txnPage, setTxnPage] = useState(1);
  const queryClient = useQueryClient();

  const usersQuery = useQuery(
    trpc.admin.listUsersWithCredits.queryOptions({
      search: debouncedSearch || undefined,
      sortBy: sortBy || undefined,
      sortDir,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
  );

  const users = usersQuery.data?.users ?? [];
  const total = usersQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Separate query for the selected user's transaction history
  const historyQuery = useQuery(
    trpc.admin.getCreditHistory.queryOptions(
      { userId: detailUser?.id ?? "none" },
      { enabled: !!detailUser },
    ),
  );

  const adjustMutation = useMutation(
    trpc.admin.adjustCredit.mutationOptions({
      onSuccess: (data, vars) => {
        queryClient.invalidateQueries({ queryKey: trpc.admin.listUsersWithCredits.queryKey() });
        if (detailUser) {
          queryClient.invalidateQueries({ queryKey: trpc.admin.getCreditHistory.queryKey() });
        }
        setCustomAmount("");
        setCustomNote("");
        toast.success(
          `${vars.amount >= 0 ? "Added" : "Deducted"} ${Math.abs(vars.amount).toLocaleString()} tokens. New balance: ${data.newBalance.toLocaleString()}`,
        );
      },
      onError: (e: unknown) => toast.error(getErrorMessage(e)),
    }),
  );

  function toggleSort(column: string) {
    if (sortBy === column) {
      const newDir = sortDir === "desc" ? "asc" : "desc";
      navigate({ search: (prev) => ({ ...prev, sortDir: newDir }), replace: true });
    } else {
      navigate({ search: (prev) => ({ ...prev, sortBy: column, sortDir: "desc", page: 1 }), replace: true });
    }
  }

  // Compute refill-based usage %. A user may have multiple refills; use total credit ever received.
  function usagePercent(u: UserCreditRow): number {
    const totalTokens = u.tokenBalance + u.lifetimeTokensUsed;
    if (totalTokens <= 0) return 0;
    return Math.round((u.lifetimeTokensUsed / totalTokens) * 100);
  }

  function formatDate(d: string | Date | null) {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const columns: ColumnDef<UserCreditRow>[] = [
    {
      id: "name",
      header: "User",
      size: "w-[28%]",
      sortable: true,
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-[var(--clay-black)] truncate">{row.name}</p>
          <p className="text-xs text-[var(--warm-charcoal)] truncate">{row.email}</p>
        </div>
      ),
    },
    {
      id: "balance",
      header: "Balance",
      size: "w-[16%]",
      sortable: true,
      cell: ({ row }) => (
        <span className={`font-mono font-medium text-sm ${
          row.tokenBalance <= 0 ? "text-[var(--clay-red)]" : "text-[var(--clay-black)]"
        }`}>
          {row.tokenBalance.toLocaleString()}
        </span>
      ),
    },
    {
      id: "usage",
      header: "Progress",
      size: "w-[30%]",
      sortable: true,
      cell: ({ row }) => {
        const pct = usagePercent(row);
        const totalTokens = row.tokenBalance + row.lifetimeTokensUsed;
        let barColor: string;
        if (pct >= 90) barColor = "bg-[var(--clay-red)]";
        else if (pct >= 60) barColor = "bg-[var(--pomegranate-400)]";
        else barColor = "bg-[var(--matcha-500)]";
        return (
          <div className="flex items-center gap-2">
            <div className="w-full max-w-[140px] h-2 bg-[var(--oat-border)] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <span className="text-xs text-[var(--warm-charcoal)] font-mono whitespace-nowrap">
              {row.lifetimeTokensUsed.toLocaleString()} / {totalTokens.toLocaleString()}
            </span>
          </div>
        );
      },
    },
    {
      id: "recent",
      header: "Last Active",
      size: "w-[16%]",
      sortable: true,
      cell: ({ row }) => (
        <span className="text-xs text-[var(--warm-charcoal)]">{formatDate(row.creditUpdatedAt)}</span>
      ),
    },
  ];

  function handleAdjust(amount: number) {
    if (!detailUser) return;
    adjustMutation.mutate({
      userId: detailUser.id,
      amount,
      description: customNote || undefined,
    });
  }

  return (
    <div>
      <h1 className="text-3xl font-headline font-bold text-[var(--clay-black)] mb-2">Credit Management</h1>
      <p className="text-[var(--warm-charcoal)] mb-6">Manage token credits across all users.</p>

      {/* Search + sort controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--warm-charcoal)] text-sm" />
          <Input
            placeholder="Search by name or email..."
            value={rawSearch}
            onChange={(e) => setRawSearch(e.target.value)}
            aria-label="Search users"
            className="pl-8 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] h-10 text-sm"
          />
        </div>
        <div className="flex items-center gap-1 text-sm">
          <span className="text-[var(--warm-charcoal)] mr-1">Sort:</span>
          {(["usage", "balance", "recent"] as const).map((key) => (
            <button
              key={key}
              onClick={() => toggleSort(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                sortBy === key
                  ? "bg-[var(--matcha-300)] text-[var(--matcha-800)]"
                  : "bg-[var(--oat-light)] text-[var(--warm-charcoal)] hover:bg-[var(--oat-border)]"
              }`}
              aria-pressed={sortBy === key}
            >
              {key === "usage" ? "Usage" : key === "balance" ? "Balance" : "Recent"}
              {sortBy === key && (sortDir === "asc" ? " ↑" : " ↓")}
            </button>
          ))}
        </div>
        <span className="text-sm text-[var(--warm-charcoal)] ml-auto">{total.toLocaleString()} users</span>
      </div>

      <DataTable
        data={users}
        columns={columns}
        isLoading={usersQuery.isLoading}
        isFetching={usersQuery.isFetching}
        emptyMessage="No users found."
        keyExtractor={(u) => u.id}
        page={page}
        totalPages={totalPages}
        onPageChange={(p) => navigate({ search: (prev) => ({ ...prev, page: p }), replace: true })}
        onRowClick={(u) => {
          setDetailUser(u);
          setCustomAmount("");
          setCustomNote("");
          setTxnPage(1);
        }}
        onSort={toggleSort}
        sortColumn={sortBy || undefined}
        sortDirection={sortDir}
        actionsHeader="Top up"
        actions={(u) => {
          const pct = usagePercent(u);
          const isLow = u.tokenBalance <= REFILL_AMOUNT * 0.2;
          const isEmpty = u.tokenBalance <= 0;
          return (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 w-8 rounded-full p-0 ${
                  isEmpty ? "text-[var(--clay-red)]" : isLow ? "text-[var(--pomegranate-400)]" : "text-[var(--matcha-500)]"
                }`}
                onClick={() => {
                  adjustMutation.mutate({ userId: u.id, amount: REFILL_AMOUNT, description: "Quick top-up" });
                }}
                disabled={adjustMutation.isPending}
                aria-label={`Top up ${u.name} with ${REFILL_AMOUNT.toLocaleString()} tokens`}
              >
                <MaterialIcon name="bolt" className="text-base" />
              </Button>
            </div>
          );
        }}
      />
      <Pagination page={page} totalPages={totalPages} onChange={(p) => navigate({ search: (prev) => ({ ...prev, page: p }), replace: true })} />

      {/* Detail Dialog */}
      <Dialog open={!!detailUser} onOpenChange={(v) => { if (!v) setDetailUser(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detailUser && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-headline font-bold text-[var(--clay-black)]">
                  {detailUser.name}
                </DialogTitle>
                <p className="text-sm text-[var(--warm-charcoal)]">{detailUser.email}</p>
              </DialogHeader>

              {/* Progress */}
              <div className="bg-[var(--oat-light)] rounded-[var(--radius-xl)] p-5 border border-[var(--oat-border)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[var(--clay-black)]">Credit Usage</span>
                  <span className="text-xs text-[var(--warm-charcoal)]">
                    Balance: <span className="font-mono font-semibold text-[var(--clay-black)]">{detailUser.tokenBalance.toLocaleString()}</span>
                  </span>
                </div>
                <div className="h-3 bg-[var(--pure-white)] rounded-full border border-[var(--oat-border)] overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all ${
                      usagePercent(detailUser) >= 90 ? "bg-[var(--clay-red)]" :
                      usagePercent(detailUser) >= 60 ? "bg-[var(--pomegranate-400)]" :
                      "bg-[var(--matcha-500)]"
                    }`}
                    style={{ width: `${Math.min(usagePercent(detailUser), 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-[var(--warm-charcoal)]">
                  <span>Used: <span className="font-mono">{detailUser.lifetimeTokensUsed.toLocaleString()}</span></span>
                  <span>{usagePercent(detailUser)}% used</span>
                  <span>Total: <span className="font-mono">{(detailUser.tokenBalance + detailUser.lifetimeTokensUsed).toLocaleString()}</span></span>
                </div>
              </div>

              {/* Quick Top-up */}
              <div className="bg-[var(--pure-white)] rounded-[var(--radius-xl)] p-5 border border-[var(--oat-border)]">
                <h3 className="font-headline font-bold text-[var(--clay-black)] mb-3 text-sm">Quick Top-up</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {[10000, 25000, 50000, 100000].map((amount) => (
                    <Button
                      key={amount}
                      size="sm"
                      variant="outline"
                      className="rounded-[var(--radius-lg)] text-xs h-9"
                      onClick={() => handleAdjust(amount)}
                      disabled={adjustMutation.isPending}
                    >
                      +{amount.toLocaleString()}
                    </Button>
                  ))}
                </div>
                <div className="border-t border-[var(--oat-border)] pt-4">
                  <h4 className="text-xs font-medium text-[var(--warm-charcoal)] mb-3">Custom Adjustment</h4>
                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <label className="text-xs text-[var(--warm-charcoal)] block mb-1">Amount (+ add, - deduct)</label>
                      <Input
                        type="number"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        placeholder="e.g. 50000"
                        aria-label="Adjustment amount"
                        className="w-36 h-9 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[var(--warm-charcoal)] block mb-1">Note</label>
                      <Input
                        value={customNote}
                        onChange={(e) => setCustomNote(e.target.value)}
                        placeholder="Reason"
                        aria-label="Adjustment note"
                        className="w-44 h-9 text-sm"
                      />
                    </div>
                    <Button
                      size="sm"
                      className="h-9 rounded-[var(--radius-lg)]"
                      onClick={() => {
                        const val = parseInt(customAmount, 10);
                        if (isNaN(val) || val === 0) {
                          toast.error("Enter a valid amount");
                          return;
                        }
                        handleAdjust(val);
                      }}
                      disabled={adjustMutation.isPending || !customAmount}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </div>

              {/* Transaction History */}
              <div className="bg-[var(--pure-white)] rounded-[var(--radius-xl)] border border-[var(--oat-border)] overflow-hidden">
                <div className="px-5 pt-4 pb-2 border-b border-[var(--oat-border)]">
                  <h3 className="font-headline font-bold text-[var(--clay-black)] text-sm">Recent Transactions</h3>
                </div>
                {historyQuery.isLoading ? (
                  <div className="text-center py-8 text-sm text-[var(--warm-charcoal)]">Loading...</div>
                ) : (historyQuery.data?.transactions ?? []).length === 0 ? (
                  <div className="text-center py-8 text-sm text-[var(--warm-charcoal)]">No transactions yet.</div>
                ) : (
                  <div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-[var(--oat-light)] text-[var(--warm-charcoal)]">
                            <th className="text-left px-4 py-2.5 font-medium text-xs">Type</th>
                            <th className="text-right px-4 py-2.5 font-medium text-xs">Amount</th>
                            <th className="text-left px-4 py-2.5 font-medium text-xs">Description</th>
                            <th className="text-right px-4 py-2.5 font-medium text-xs">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(historyQuery.data?.transactions ?? [])
                            .slice((txnPage - 1) * 15, txnPage * 15)
                            .map((txn) => (
                            <tr key={txn.id} className="border-t border-[var(--oat-border)]">
                              <td className="px-4 py-2.5">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                  txn.type === "auto_refill" ? "bg-[var(--sunbeam-300)] text-[var(--sunbeam-800)]" :
                                  txn.type === "admin_adjust" ? "bg-[var(--matcha-300)] text-[var(--matcha-800)]" :
                                  txn.type === "generation_spend" ? "bg-[var(--slushie-500)]/20 text-[var(--slushie-800)]" :
                                  "bg-[var(--oat-border)] text-[var(--warm-charcoal)]"
                                }`}>
                                  {txn.type.replace(/_/g, " ")}
                                </span>
                              </td>
                              <td className={`px-4 py-2.5 text-right font-mono text-xs font-medium ${
                                txn.amount >= 0 ? "text-[var(--matcha-700)]" : "text-[var(--clay-red)]"
                              }`}>
                                {txn.amount >= 0 ? "+" : ""}{txn.amount.toLocaleString()}
                              </td>
                              <td className="px-4 py-2.5 text-xs text-[var(--warm-charcoal)]">{txn.description ?? "-"}</td>
                              <td className="px-4 py-2.5 text-right text-xs text-[var(--warm-charcoal)]">
                                {new Date(txn.createdAt).toLocaleDateString("id-ID", {
                                  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                                })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="pb-2">
                      <Pagination page={txnPage} totalPages={Math.max(1, Math.ceil((historyQuery.data?.transactions ?? []).length / 15))} onChange={setTxnPage} />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
