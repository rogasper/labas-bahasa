import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Input } from "@labas/ui/components/input";
import { Button } from "@labas/ui/components/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@labas/ui/components/select";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-utils";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { DataTable } from "@/components/admin/DataTable";
import { Pagination } from "@/components/admin/Pagination";
import type { ColumnDef } from "@/components/admin/DataTable";
import { z } from "zod";

const PAGE_SIZE = 20;

const searchSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  search: z.string().optional(),
  role: z.string().optional(),
  status: z.string().optional(),
  verified: z.string().optional(),
}).parse;

export const Route = createFileRoute("/admin/users")({
  validateSearch: searchSchema,
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
  const s = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();

  const page = s.page;
  const [rawSearch, debouncedSearch, setRawSearch] = useDebouncedValue(s.search ?? "", 300);

  useEffect(() => {
    if (debouncedSearch !== (s.search ?? "")) {
      navigate({ search: (prev) => ({ ...prev, search: debouncedSearch || undefined, page: 1 }), replace: true });
    }
  }, [debouncedSearch]);

  const roleFilter = s.role ?? "";
  const statusFilter = s.status ?? "";
  const verifFilter = s.verified ?? "";

  const nav = (updates: Record<string, string | number | undefined>) => {
    navigate({ search: (prev) => ({ ...prev, page: 1, ...updates }), replace: true });
  };

  const usersQuery = useQuery(
    trpc.admin.listUsers.queryOptions({
      search: debouncedSearch || undefined,
      role: (roleFilter as "user" | "admin") || undefined,
      suspended: statusFilter === "" ? undefined : statusFilter === "suspended",
      emailVerified: verifFilter === "" ? undefined : verifFilter === "verified",
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
  );

  const users = usersQuery.data?.users ?? [];
  const total = usersQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
        toast.success(`Role changed to ${data.role}`);
      },
      onError: (e: unknown) => toast.error(getErrorMessage(e)),
    }),
  );

  function handleSuspend(u: UserRow) {
    if (!confirm(u.suspended ? `Unsuspend ${u.name}?` : `Suspend ${u.name}? This will prevent them from using the platform.`)) return;
    suspendMutation.mutate({ userId: u.id, suspended: !u.suspended });
  }

  function handleRoleChange(u: UserRow) {
    const newRole = u.role === "admin" ? "user" : "admin";
    if (!confirm(`Change ${u.name}'s role to "${newRole}"?`)) return;
    roleMutation.mutate({ userId: u.id, role: newRole });
  }

  const columns: ColumnDef<UserRow>[] = [
    {
      id: "name",
      header: "Name",
      size: "w-[22%]",
      cell: ({ row }) => <span className="font-medium text-[var(--clay-black)]">{row.name}</span>,
    },
    {
      id: "email",
      header: "Email",
      size: "w-[28%]",
      cell: ({ row }) => <span className="text-[var(--warm-charcoal)]">{row.email}</span>,
    },
    {
      id: "verified",
      header: "Verified",
      size: "w-[12%]",
      cell: ({ row }) => (
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${row.emailVerified ? "bg-[var(--matcha-300)] text-[var(--matcha-800)]" : "bg-[var(--sunbeam-300)] text-[var(--sunbeam-800)]"}`}>
          <MaterialIcon name={row.emailVerified ? "check_circle" : "cancel"} className="text-xs" />
          {row.emailVerified ? "Verified" : "Unverified"}
        </span>
      ),
    },
    {
      id: "role",
      header: "Role",
      size: "w-[8%]",
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
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${row.suspended ? "bg-[var(--clay-red)]/10 text-[var(--clay-red)]" : "bg-[var(--matcha-300)] text-[var(--matcha-800)]"}`}>
          {row.suspended ? "Suspended" : "Active"}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-headline font-bold text-[var(--clay-black)]">Users</h1>
        <span className="text-sm text-[var(--warm-charcoal)]">{total.toLocaleString()} total</span>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--warm-charcoal)] text-sm" />
          <Input
            placeholder="Search by name or email..."
            value={rawSearch}
            onChange={(e) => { setRawSearch(e.target.value); }}
            aria-label="Search users"
            className="pl-8 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] h-10 text-sm"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v: string | null) => nav({ role: v || undefined })}>
          <SelectTrigger className="w-[120px] h-10 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] text-sm cursor-pointer" aria-label="Filter by role">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v: string | null) => nav({ status: v || undefined })}>
          <SelectTrigger className="w-[130px] h-10 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] text-sm cursor-pointer" aria-label="Filter by status">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select value={verifFilter} onValueChange={(v: string | null) => nav({ verified: v || undefined })}>
          <SelectTrigger className="w-[140px] h-10 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] text-sm cursor-pointer" aria-label="Filter by verification">
            <SelectValue placeholder="All Verified" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="">All Verified</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="unverified">Unverified</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
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
        actionsHeader=""
        actions={(u) => (
          <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button variant="outline" onClick={() => handleSuspend(u)} disabled={suspendMutation.isPending} className="h-9 rounded-[var(--radius-lg)] text-xs">
              {u.suspended ? "Unsuspend" : "Suspend"}
            </Button>
            <Button variant="outline" onClick={() => handleRoleChange(u)} disabled={roleMutation.isPending} className="h-9 rounded-[var(--radius-lg)] text-xs">
              {u.role === "admin" ? "Demote" : "Promote"}
            </Button>
          </div>
        )}
      />
      <Pagination page={page} totalPages={totalPages} onChange={(p) => navigate({ search: (prev) => ({ ...prev, page: p }), replace: true })} />
    </div>
  );
}
