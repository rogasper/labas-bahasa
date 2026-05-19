import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Input } from "@labas/ui/components/input";
import { Button } from "@labas/ui/components/button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-utils";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { DataTable } from "@/components/admin/DataTable";
import type { ColumnDef } from "@/components/admin/DataTable";

export const Route = createFileRoute("/admin/credits")({
  component: AdminCredits,
});

type TxnRow = {
  id: string;
  userId: string;
  amount: number;
  type: string;
  description: string | null;
  createdAt: string | Date;
};

function AdminCredits() {
  const [search, debouncedSearch, setSearch] = useDebouncedValue("", 300);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUserName, setSelectedUserName] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const queryClient = useQueryClient();

  function handleSearch(val: string) {
    setSearch(val);
    setSelectedUserId("");
    setSelectedUserName("");
  }

  const userSearch = useQuery(
    trpc.admin.listUsers.queryOptions(
      { search: debouncedSearch || undefined, limit: 10, offset: 0 },
      { enabled: true },
    ),
  );

  const creditQuery = useQuery(
    trpc.admin.getCreditBalance.queryOptions(
      { userId: selectedUserId || "none" },
      { enabled: !!selectedUserId },
    ),
  );

  const historyQuery = useQuery(
    trpc.admin.getCreditHistory.queryOptions(
      { userId: selectedUserId || "none" },
      { enabled: !!selectedUserId },
    ),
  );

  const adjustMutation = useMutation(
    trpc.admin.adjustCredit.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: trpc.admin.getCreditBalance.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.admin.getCreditHistory.queryKey() });
        toast.success(`Credit updated. New balance: ${data.newBalance.toLocaleString()}`);
        setAmount("");
        setDescription("");
      },
      onError: (e: unknown) => toast.error(getErrorMessage(e)),
    }),
  );

  function selectUser(id: string, name: string) {
    setSelectedUserId(id);
    setSelectedUserName(name);
    setSearch("");
  }

  function handleAdjust() {
    const val = parseInt(amount, 10);
    if (isNaN(val) || val === 0) {
      toast.error("Enter a valid amount");
      return;
    }
    adjustMutation.mutate({ userId: selectedUserId, amount: val, description: description || undefined });
  }

  return (
    <div>
      <h1 className="text-3xl font-headline font-bold text-[var(--clay-black)] mb-2">Credit Management</h1>
      <p className="text-[var(--warm-charcoal)] mb-8">View and adjust token credits for users.</p>

      <div className="bg-[var(--pure-white)] rounded-[var(--radius-xl)] border border-[var(--oat-border)] p-6 mb-8">
        <h2 className="text-lg font-headline font-bold text-[var(--clay-black)] mb-4">Find User</h2>
        <div className="relative">
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            aria-label="Cari user"
            className="max-w-md"
          />
          {userSearch.data && userSearch.data.users.length > 0 && !selectedUserId && (
            <div className="absolute top-full mt-1 w-full max-w-md bg-[var(--pure-white)] border border-[var(--oat-border)] rounded-[var(--radius-lg)] shadow-lg z-10 max-h-60 overflow-y-auto">
              {userSearch.data.users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => selectUser(u.id, u.name)}
                  className="w-full text-left px-4 py-2.5 hover:bg-[var(--oat-light)] transition-colors text-sm"
                >
                  <span className="font-medium text-[var(--clay-black)]">{u.name}</span>
                  <span className="text-[var(--warm-charcoal)] ml-2">{u.email}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedUserId && (
          <div className="mt-4">
            <div className="flex items-center gap-3">
              <span className="font-medium text-[var(--clay-black)]">{selectedUserName}</span>
              <span className="text-xs text-[var(--warm-charcoal)] font-mono">{selectedUserId}</span>
              <Button variant="ghost" size="sm" onClick={() => { setSelectedUserId(""); setSelectedUserName(""); }}>
                Change
              </Button>
            </div>
            {creditQuery.data && (
              <div className="mt-3 p-4 bg-[var(--oat-light)] rounded-[var(--radius-lg)] grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[var(--warm-charcoal)] mb-1">Token Balance</p>
                  <p className="text-2xl font-headline font-bold text-[var(--clay-black)]">{creditQuery.data.tokenBalance.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--warm-charcoal)] mb-1">Lifetime Used</p>
                  <p className="text-2xl font-headline font-bold text-[var(--warm-charcoal)]">{creditQuery.data.lifetimeTokensUsed.toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedUserId && (
        <div className="bg-[var(--pure-white)] rounded-[var(--radius-xl)] border border-[var(--oat-border)] p-6 mb-8">
          <h2 className="text-lg font-headline font-bold text-[var(--clay-black)] mb-4">Adjust Credits</h2>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-[var(--warm-charcoal)] block mb-1">Amount (+ add, - deduct)</label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 50000" className="w-40" />
            </div>
            <div>
              <label className="text-xs text-[var(--warm-charcoal)] block mb-1">Note</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Reason" className="w-48" />
            </div>
            <Button onClick={handleAdjust} disabled={adjustMutation.isPending}>Apply</Button>
          </div>
          <p className="text-xs text-[var(--warm-charcoal)] mt-3">
            Credits are in tokens. ~1,000 tokens ≈ $0.01 with budget models.
          </p>
        </div>
      )}

      {historyQuery.data && historyQuery.data.transactions.length > 0 && (
        <div className="bg-[var(--pure-white)] rounded-[var(--radius-xl)] border border-[var(--oat-border)] overflow-hidden">
          <h2 className="text-lg font-headline font-bold text-[var(--clay-black)] px-6 pt-6 pb-2">Transaction History</h2>
          <DataTable
            data={historyQuery.data.transactions}
            columns={[
              {
                id: "type",
                header: "Type",
                accessorKey: "type",
                cell: ({ value }) => {
                  const t = value as string;
                  return (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      t === "signup_bonus" ? "bg-[var(--sunbeam-300)] text-[var(--sunbeam-800)]" :
                      t === "admin_adjust" ? "bg-[var(--matcha-300)] text-[var(--matcha-800)]" :
                      "bg-[var(--oat-border)] text-[var(--warm-charcoal)]"
                    }`}>{t}</span>
                  );
                },
              },
              {
                id: "amount",
                header: "Amount",
                accessorFn: (t: TxnRow) => <span className={`font-medium ${t.amount >= 0 ? "text-[var(--matcha-700)]" : "text-[var(--clay-red)]"}`}>{t.amount >= 0 ? "+" : ""}{t.amount.toLocaleString()}</span>,
              },
              {
                id: "description",
                header: "Description",
                accessorFn: (t: TxnRow) => <span className="text-[var(--warm-charcoal)]">{t.description ?? "-"}</span>,
              },
              {
                id: "date",
                header: "Date",
                accessorFn: (t: TxnRow) => <span className="text-[var(--warm-charcoal)]">{new Date(t.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>,
              },
            ]}
            keyExtractor={(t) => t.id}
            classNames={{ wrapper: "" }}
          />
        </div>
      )}
    </div>
  );
}
