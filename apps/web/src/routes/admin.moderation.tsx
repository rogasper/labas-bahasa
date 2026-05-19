import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Button } from "@labas/ui/components/button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-utils";
import { DataTable } from "@/components/admin/DataTable";
import type { ColumnDef } from "@/components/admin/DataTable";

export const Route = createFileRoute("/admin/moderation")({
  component: AdminModeration,
});

type QuestionRow = {
  id: string;
  questionText: string;
  passageText: string | null;
  examTypeId: string;
  format: string;
  isPublic: boolean;
  source: string;
  createdAt: string | Date;
};

function formatDate(dateStr: string | Date | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function AdminModeration() {
  const [page, setPage] = useState(1);
  const limit = 30;
  const queryClient = useQueryClient();

  const questions = useQuery(
    trpc.admin.listLatestQuestions.queryOptions({ limit, offset: (page - 1) * limit }),
  );

  const toggleMutation = useMutation(
    trpc.admin.togglePublicAny.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: trpc.admin.listLatestQuestions.queryKey() });
        toast.success(data.isPublic ? "Made public" : "Made private");
      },
      onError: (e: unknown) => toast.error(getErrorMessage(e)),
    }),
  );

  const columns: ColumnDef<QuestionRow>[] = [
    {
      id: "question",
      header: "Question",
      size: "w-[35%]",
      cell: ({ row }) => (
        <div className="max-w-xs">
          <p className="font-medium text-[var(--clay-black)] truncate">{row.questionText}</p>
          {row.passageText && (
            <p className="text-xs text-[var(--warm-charcoal)] truncate mt-0.5">
              {row.passageText.slice(0, 80)}{row.passageText.length > 80 ? "..." : ""}
            </p>
          )}
        </div>
      ),
    },
    { id: "exam", header: "Exam", accessorKey: "examTypeId" },
    {
      id: "format", header: "Format",
      cell: ({ value }) => <span className="text-xs">{value as string}</span>,
    },
    {
      id: "visibility",
      header: "Visibility",
      cell: ({ row }) => (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          row.isPublic ? "bg-[var(--matcha-300)] text-[var(--matcha-800)]" : "bg-[var(--oat-border)] text-[var(--warm-charcoal)]"
        }`}>{row.isPublic ? "Public" : "Private"}</span>
      ),
    },
    {
      id: "source", header: "Source",
      cell: ({ value }) => <span className="text-xs">{value as string}</span>,
    },
    {
      id: "created",
      header: "Created",
      accessorFn: (q) => <span className="text-xs text-[var(--warm-charcoal)]">{formatDate(q.createdAt)}</span>,
    },
  ];

  const questionData = questions.data?.questions ?? [];
  const hasMore = questionData.length >= limit;

  return (
    <div>
      <h1 className="text-3xl font-headline font-bold text-[var(--clay-black)] mb-2">Content Moderation</h1>
      <p className="text-[var(--warm-charcoal)] mb-6">Review latest questions and manage visibility.</p>

      <DataTable
        data={questionData}
        columns={columns}
        isLoading={questions.isLoading}
        emptyMessage="No questions yet."
        keyExtractor={(q) => q.id}
        page={page}
        totalPages={page + 1}
        onPageChange={setPage}
        actions={(q) => (
          <Button variant="outline" className="h-9 rounded-[var(--radius-lg)] text-xs" onClick={() => toggleMutation.mutate({ questionId: q.id })} disabled={toggleMutation.isPending}>
            {q.isPublic ? "Make Private" : "Make Public"}
          </Button>
        )}
      />
      {hasMore && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <Button variant="outline" className="h-9 rounded-[var(--radius-lg)] text-xs" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Previous</Button>
          <span className="text-sm text-[var(--warm-charcoal)]">Page {page}</span>
          <Button variant="outline" className="h-9 rounded-[var(--radius-lg)] text-xs" onClick={() => setPage((p) => p + 1)} disabled={!hasMore}>Next</Button>
        </div>
      )}
    </div>
  );
}
