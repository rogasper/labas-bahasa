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

const PAGE_SIZE = 20;

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  suspended: boolean;
  emailVerified: boolean;
};

function AdminUsers() {
  const [search, debouncedSearch, setSearch] = useDebouncedValue("", 300);
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const usersQuery = useQuery(
    trpc.admin.listUsers.queryOptions({ search: debouncedSearch || undefined, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
  );

  const users = usersQuery.data?.users ?? [];
  const total = usersQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function handleSearch(val: string) {
    setSearch(val);
    setPage(1);
  }

  const suspendMutation = useMutation(
    trpc.admin.suspendUser.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: trpc.admin.listUsers.queryKey() });
        toast.success(data.suspended ? "User suspended" : "User unsuspended");
      },
      onError: (e: unknown) => toast.error(getErrorMessage(e)),
    }),
  );

  const roleMutation = useMutation(
    trpc.admin.setUserRole.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: trpc.admin.listUsers.queryKey() });
        toast.success(`Role: ${data.role}`);
      },
      onError: (e: unknown) => toast.error(getErrorMessage(e)),
    }),
  );

  const columns: ColumnDef<UserRow>[] = [
    {
      id: "name",
      header: "Name",
      accessorKey: "name",
      size: "w-[25%]",
      cell: ({ value }) => <span className="font-medium text-[var(--clay-black)]">{value as string}</span>,
    },
    {
      id: "email",
      header: "Email",
      accessorKey: "email",
      size: "w-[30%]",
      cell: ({ row }) => (
        <span className="text-[var(--warm-charcoal)]">
          {row.email}
          {!row.emailVerified && (
            <span className="ml-1.5 text-[10px] bg-[var(--sunbeam-300)] text-[var(--sunbeam-800)] px-1.5 py-0.5 rounded-full font-medium">unverified</span>
          )}
        </span>
      ),
    },
    {
      id: "role",
      header: "Role",
      size: "w-[10%]",
      cell: ({ row }) => (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${row.role === "admin" ? "bg-[var(--matcha-300)] text-[var(--matcha-800)]" : "bg-[var(--oat-border)] text-[var(--warm-charcoal)]"}`}>
          {row.role}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      size: "w-[10%]",
      cell: ({ row }) => (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          row.suspended ? "bg-[var(--clay-red)]/10 text-[var(--clay-red)]" : "bg-[var(--matcha-300)] text-[var(--matcha-800)]"
        }`}>
          {row.suspended ? "Suspended" : "Active"}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-[var(--clay-black)]">Users</h1>
          <p className="text-[var(--warm-charcoal)] mt-1">{total.toLocaleString()} total users</p>
        </div>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          aria-label="Cari user"
          className="max-w-md rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] h-11"
        />
      </div>

      <DataTable
        data={users}
        columns={columns}
        isLoading={usersQuery.isLoading}
        emptyMessage="No users found."
        keyExtractor={(u) => u.id}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        actions={(u) => (
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => suspendMutation.mutate({ userId: u.id, suspended: !u.suspended })} disabled={suspendMutation.isPending} className="h-9 rounded-[var(--radius-lg)] text-xs">
              {u.suspended ? "Unsuspend" : "Suspend"}
            </Button>
            <Button variant="outline" onClick={() => roleMutation.mutate({ userId: u.id, role: u.role === "admin" ? "user" : "admin" })} disabled={roleMutation.isPending} className="h-9 rounded-[var(--radius-lg)] text-xs">
              {u.role === "admin" ? "Demote" : "Promote"}
            </Button>
          </div>
        )}
      />
    </div>
  );
}
