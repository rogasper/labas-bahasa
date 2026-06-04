import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Input } from "@labas/ui/components/input";
import { Button } from "@labas/ui/components/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@labas/ui/components/tabs";
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
import { formatLabel } from "@/lib/format";
import { QuestionDetailModal } from "@/components/bank/QuestionDetailModal";
import { DataTable } from "@/components/admin/DataTable";
import { Pagination } from "@/components/admin/Pagination";
import { EXAM_TYPES } from "@/lib/exam-constants";
import type { ColumnDef } from "@/components/admin/DataTable";
import { z } from "zod";

const searchSchema = z.object({
  tab: z.enum(["questions", "packages"]).optional().default("questions"),
  q_page: z.coerce.number().min(1).default(1),
  q_search: z.string().optional(),
  q_exam: z.string().optional(),
  q_vis: z.string().optional(),
  p_page: z.coerce.number().min(1).default(1),
  p_search: z.string().optional(),
  p_exam: z.string().optional(),
  p_vis: z.string().optional(),
}).parse;

export const Route = createFileRoute("/admin/moderation")({
  validateSearch: searchSchema,
  component: AdminModeration,
});

type QuestionRow = {
  id: string;
  questionText: string;
  passageText: string | null;
  options?: unknown;
  correctAnswer: string;
  explanation: string | null;
  format: string;
  examTypeId: string;
  difficulty: number;
  skillTags: string[] | null;
  source: string | null;
  aiModel: string | null;
  generationKeySource: string | null;
  creatorUserId: string;
  isPublic: boolean;
  createdAt: string | Date;
};

type PackageRow = {
  id: string;
  title: string;
  description: string | null;
  examTypeId: string;
  creatorUserId: string;
  creatorName: string | null;
  isPublic: boolean;
  totalQuestions: number;
  totalSections: number;
  createdAt: string | Date;
};

const PAGE_SIZE = 30;

function QuestionsView() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const page = s.q_page;
  const [rawSearch, debouncedSearch, setRawSearch] = useDebouncedValue(s.q_search ?? "", 300);
  const examFilter = s.q_exam ?? "";
  const visFilter = s.q_vis ?? "";
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailQuestion, setDetailQuestion] = useState<QuestionRow | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (debouncedSearch !== (s.q_search ?? "")) {
      navigate({ search: (prev) => ({ ...prev, q_search: debouncedSearch || undefined, q_page: 1 }), replace: true });
    }
  }, [debouncedSearch]);

  const qNav = (updates: Record<string, string | number | undefined>) => {
    navigate({ search: (prev) => ({ ...prev, ...updates, q_page: 1 }), replace: true });
  };

  const questions = useQuery(
    trpc.admin.listLatestQuestions.queryOptions({
      limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE,
      search: debouncedSearch || undefined,
      examTypeId: examFilter || undefined,
      isPublic: visFilter === "" ? undefined : visFilter === "public",
    }),
  );

  const questionData = questions.data?.questions ?? [];
  const total = questions.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const toggleMutation = useMutation(
    trpc.admin.togglePublicAny.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: trpc.admin.listLatestQuestions.queryKey() });
        setSelectedIds(new Set());
        toast.success(data.isPublic ? "Made public" : "Made private");
      },
      onError: (e: unknown) => toast.error(getErrorMessage(e)),
    }),
  );

  const bulkMutation = useMutation(
    trpc.admin.bulkTogglePublic.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: trpc.admin.listLatestQuestions.queryKey() });
        setSelectedIds(new Set());
        toast.success(`Updated ${data.updated} questions`);
      },
      onError: (e: unknown) => toast.error(getErrorMessage(e)),
    }),
  );

  function toggleVisibility(q: QuestionRow) { toggleMutation.mutate({ questionId: q.id }); }

  const columns: ColumnDef<QuestionRow>[] = [
    {
      id: "question", header: "Question", size: "w-[28%]",
      cell: ({ row }) => (
        <div className="max-w-xs">
          <p className="font-medium text-[var(--clay-black)] truncate">{row.questionText}</p>
          {row.passageText && <p className="text-xs text-[var(--warm-charcoal)] truncate mt-0.5">{row.passageText.slice(0, 80)}{row.passageText.length > 80 ? "..." : ""}</p>}
        </div>
      ),
    },
    { id: "exam", header: "Exam", size: "w-[10%]", cell: ({ row }) => <span className="text-xs">{row.examTypeId}</span> },
    { id: "format", header: "Format", size: "w-[10%]", cell: ({ row }) => <span className="text-xs">{formatLabel(row.format)}</span> },
    {
      id: "source", header: "Source", size: "w-[12%]",
      cell: ({ row }) => {
        const key = row.generationKeySource ?? row.source;
        let cls = "bg-[var(--oat-border)] text-[var(--warm-charcoal)]";
        let label = key ?? "-";
        if (key === "free_credit") { cls = "bg-[var(--slushie-500)]/20 text-[var(--slushie-800)]"; label = "Free Credit"; }
        else if (key === "byok") { cls = "bg-[var(--ube-300)]/30 text-[var(--ube-800)]"; label = "BYOK"; }
        else if (key === "manual") { cls = "bg-[var(--oat-light)] text-[var(--warm-charcoal)]"; label = "Manual"; }
        return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
      },
    },
    {
      id: "visibility", header: "Visibility", size: "w-[10%]",
      cell: ({ row }) => (<span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${row.isPublic ? "bg-[var(--matcha-300)] text-[var(--matcha-800)]" : "bg-[var(--oat-border)] text-[var(--warm-charcoal)]"}`}>{row.isPublic ? "Public" : "Private"}</span>),
    },
    { id: "created", header: "Created", size: "w-[12%]", cell: ({ row }) => <span className="text-xs text-[var(--warm-charcoal)]">{new Date(row.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span> },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--warm-charcoal)] text-sm" />
          <Input placeholder="Search questions..." value={rawSearch} onChange={(e) => setRawSearch(e.target.value)} aria-label="Search questions" className="pl-8 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] h-10 text-sm" />
        </div>
        <Select value={examFilter} onValueChange={(v: string | null) => qNav({ q_exam: v || undefined })}>
          <SelectTrigger className="w-[160px] h-10 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] text-sm cursor-pointer" aria-label="Filter by exam type">
            <SelectValue placeholder="All Exams" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="">All Exams</SelectItem>
              {EXAM_TYPES.map((et) => <SelectItem key={et.id} value={et.id}>{et.name}</SelectItem>)}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select value={visFilter} onValueChange={(v: string | null) => qNav({ q_vis: v || undefined })}>
          <SelectTrigger className="w-[150px] h-10 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] text-sm cursor-pointer" aria-label="Filter by visibility">
            <SelectValue placeholder="All Visibility" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="">All Visibility</SelectItem>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="private">Private</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <span className="text-sm text-[var(--warm-charcoal)]">{total.toLocaleString()} questions</span>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-[var(--matcha-300)]/15 border border-[var(--matcha-500)] rounded-[var(--radius-lg)]">
          <span className="text-sm font-medium text-[var(--matcha-800)]">{selectedIds.size} question{selectedIds.size > 1 ? "s" : ""} selected</span>
          <div className="flex items-center gap-2 ml-auto">
            <Button size="sm" className="h-8 rounded-[var(--radius-lg)] text-xs" onClick={() => bulkMutation.mutate({ questionIds: Array.from(selectedIds), isPublic: true })} disabled={bulkMutation.isPending}>Make Public</Button>
            <Button variant="outline" size="sm" className="h-8 rounded-[var(--radius-lg)] text-xs" onClick={() => bulkMutation.mutate({ questionIds: Array.from(selectedIds), isPublic: false })} disabled={bulkMutation.isPending}>Make Private</Button>
            <Button variant="ghost" size="sm" className="h-8 rounded-[var(--radius-lg)] text-xs text-[var(--warm-charcoal)]" onClick={() => setSelectedIds(new Set())}>Clear</Button>
          </div>
        </div>
      )}

      <DataTable data={questionData} columns={columns} isLoading={questions.isLoading} isFetching={questions.isFetching} emptyMessage="No questions found." keyExtractor={(q) => q.id} selectable selectedIds={selectedIds} onSelectionChange={setSelectedIds} onRowClick={(q) => setDetailQuestion(q)} actions={(q) => (
        <Button variant="outline" className="h-9 rounded-[var(--radius-lg)] text-xs" onClick={(e) => { e.stopPropagation(); toggleVisibility(q); }} disabled={toggleMutation.isPending}>{q.isPublic ? "Make Private" : "Make Public"}</Button>
      )} />
      <Pagination page={page} totalPages={totalPages} onChange={(p) => navigate({ search: (prev) => ({ ...prev, q_page: p }), replace: true })} />

      {detailQuestion && <QuestionDetailModal question={detailQuestion} onClose={() => setDetailQuestion(null)} isAdmin isPublic={detailQuestion.isPublic} onToggleVisibility={() => toggleVisibility(detailQuestion)} />}
    </div>
  );
}

function PackagesView() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const page = s.p_page;
  const [rawSearch, debouncedSearch, setRawSearch] = useDebouncedValue(s.p_search ?? "", 300);
  const examFilter = s.p_exam ?? "";
  const visFilter = s.p_vis ?? "";
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  useEffect(() => {
    if (debouncedSearch !== (s.p_search ?? "")) {
      navigate({ search: (prev) => ({ ...prev, p_search: debouncedSearch || undefined, p_page: 1 }), replace: true });
    }
  }, [debouncedSearch]);

  const pNav = (updates: Record<string, string | number | undefined>) => {
    navigate({ search: (prev) => ({ ...prev, ...updates, p_page: 1 }), replace: true });
  };

  const packages = useQuery(
    trpc.admin.listLatestPackages.queryOptions({
      limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE,
      search: debouncedSearch || undefined,
      examTypeId: examFilter || undefined,
      isPublic: visFilter === "" ? undefined : visFilter === "public",
    }),
  );

  const packageData = packages.data?.packages ?? [];
  const total = packages.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const toggleMutation = useMutation(
    trpc.admin.togglePublicAnyPackage.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: trpc.admin.listLatestPackages.queryKey() });
        setSelectedIds(new Set());
        toast.success(data.isPublic ? "Made public" : "Made private");
      },
      onError: (e: unknown) => toast.error(getErrorMessage(e)),
    }),
  );

  const bulkMutation = useMutation(
    trpc.admin.bulkTogglePublicPackages.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: trpc.admin.listLatestPackages.queryKey() });
        setSelectedIds(new Set());
        toast.success(`Updated ${data.updated} packages`);
      },
      onError: (e: unknown) => toast.error(getErrorMessage(e)),
    }),
  );

  function toggleVisibility(p: PackageRow) { toggleMutation.mutate({ packageId: p.id }); }

  const columns: ColumnDef<PackageRow>[] = [
    {
      id: "title", header: "Title", size: "w-[30%]",
      cell: ({ row }) => (
        <div className="max-w-xs">
          <p className="font-medium text-[var(--clay-black)] truncate">{row.title}</p>
          {row.creatorName && <p className="text-xs text-[var(--warm-charcoal)] truncate mt-0.5">by {row.creatorName}</p>}
        </div>
      ),
    },
    { id: "exam", header: "Exam", size: "w-[10%]", cell: ({ row }) => <span className="text-xs">{row.examTypeId}</span> },
    { id: "questions", header: "Qs", size: "w-[8%]", cell: ({ row }) => <span className="text-xs">{row.totalQuestions}</span> },
    { id: "visibility", header: "Visibility", size: "w-[12%]", cell: ({ row }) => (<span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${row.isPublic ? "bg-[var(--matcha-300)] text-[var(--matcha-800)]" : "bg-[var(--oat-border)] text-[var(--warm-charcoal)]"}`}>{row.isPublic ? "Public" : "Private"}</span>) },
    { id: "created", header: "Created", size: "w-[12%]", cell: ({ row }) => <span className="text-xs text-[var(--warm-charcoal)]">{new Date(row.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span> },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--warm-charcoal)] text-sm" />
          <Input placeholder="Search packages..." value={rawSearch} onChange={(e) => setRawSearch(e.target.value)} aria-label="Search packages" className="pl-8 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] h-10 text-sm" />
        </div>
        <Select value={examFilter} onValueChange={(v: string | null) => pNav({ p_exam: v || undefined })}>
          <SelectTrigger className="w-[160px] h-10 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] text-sm cursor-pointer" aria-label="Filter by exam type">
            <SelectValue placeholder="All Exams" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="">All Exams</SelectItem>
              {EXAM_TYPES.map((et) => <SelectItem key={et.id} value={et.id}>{et.name}</SelectItem>)}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select value={visFilter} onValueChange={(v: string | null) => pNav({ p_vis: v || undefined })}>
          <SelectTrigger className="w-[150px] h-10 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] text-sm cursor-pointer" aria-label="Filter by visibility">
            <SelectValue placeholder="All Visibility" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="">All Visibility</SelectItem>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="private">Private</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <span className="text-sm text-[var(--warm-charcoal)]">{total.toLocaleString()} packages</span>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-[var(--matcha-300)]/15 border border-[var(--matcha-500)] rounded-[var(--radius-lg)]">
          <span className="text-sm font-medium text-[var(--matcha-800)]">{selectedIds.size} package{selectedIds.size > 1 ? "s" : ""} selected</span>
          <div className="flex items-center gap-2 ml-auto">
            <Button size="sm" className="h-8 rounded-[var(--radius-lg)] text-xs" onClick={() => bulkMutation.mutate({ packageIds: Array.from(selectedIds), isPublic: true })} disabled={bulkMutation.isPending}>Make Public</Button>
            <Button variant="outline" size="sm" className="h-8 rounded-[var(--radius-lg)] text-xs" onClick={() => bulkMutation.mutate({ packageIds: Array.from(selectedIds), isPublic: false })} disabled={bulkMutation.isPending}>Make Private</Button>
            <Button variant="ghost" size="sm" className="h-8 rounded-[var(--radius-lg)] text-xs text-[var(--warm-charcoal)]" onClick={() => setSelectedIds(new Set())}>Clear</Button>
          </div>
        </div>
      )}

      <DataTable data={packageData} columns={columns} isLoading={packages.isLoading} isFetching={packages.isFetching} emptyMessage="No packages found." keyExtractor={(p) => p.id} selectable selectedIds={selectedIds} onSelectionChange={setSelectedIds} actionsHeader="" actions={(p) => (
        <Button variant="outline" className="h-9 rounded-[var(--radius-lg)] text-xs" onClick={(e) => { e.stopPropagation(); toggleVisibility(p); }} disabled={toggleMutation.isPending}>{p.isPublic ? "Make Private" : "Make Public"}</Button>
      )} />
      <Pagination page={page} totalPages={totalPages} onChange={(p) => navigate({ search: (prev) => ({ ...prev, p_page: p }), replace: true })} />
    </div>
  );
}

function AdminModeration() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const tab = s.tab;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-headline font-bold text-[var(--clay-black)]">Content Moderation</h1>
      </div>
      <p className="text-[var(--warm-charcoal)] mb-6">Review questions and packages, manage visibility across the platform.</p>

      <Tabs value={tab} onValueChange={(v) => navigate({ search: { tab: v, q_page: 1, p_page: 1 } }) } className="mb-6">
        <TabsList variant="line" className="h-10 bg-transparent border-b border-[var(--oat-border)]">
          <TabsTrigger value="questions" className="px-4 py-2.5 text-sm font-medium rounded-t-[var(--radius-lg)] data-[active=true]:bg-[var(--pure-white)] data-[active=true]:text-[var(--clay-black)] data-[active=true]:border data-[active=true]:border-[var(--oat-border)] data-[active=true]:border-b-[var(--pure-white)] data-[active=true]:-mb-[1px] text-[var(--warm-charcoal)] hover:text-[var(--clay-black)] transition-colors">
            Questions
          </TabsTrigger>
          <TabsTrigger value="packages" className="px-4 py-2.5 text-sm font-medium rounded-t-[var(--radius-lg)] data-[active=true]:bg-[var(--pure-white)] data-[active=true]:text-[var(--clay-black)] data-[active=true]:border data-[active=true]:border-[var(--oat-border)] data-[active=true]:border-b-[var(--pure-white)] data-[active=true]:-mb-[1px] text-[var(--warm-charcoal)] hover:text-[var(--clay-black)] transition-colors">
            Packages
          </TabsTrigger>
        </TabsList>
        <TabsContent value="questions" className="mt-6">
          {tab === "questions" && <QuestionsView />}
        </TabsContent>
        <TabsContent value="packages" className="mt-6">
          {tab === "packages" && <PackagesView />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
