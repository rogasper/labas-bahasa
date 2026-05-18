import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Button } from "@labas/ui/components/button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-utils";

export const Route = createFileRoute("/admin/moderation")({
  component: AdminModeration,
});

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

  return (
    <div>
      <h1 className="text-3xl font-headline font-bold text-[var(--clay-black)] mb-2">Content Moderation</h1>
      <p className="text-[var(--warm-charcoal)] mb-6">Review latest questions and manage visibility.</p>

      <div className="bg-[var(--pure-white)] rounded-[var(--radius-xl)] border border-[var(--oat-border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--oat-light)] text-[var(--warm-charcoal)]">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Question</th>
              <th className="text-left px-4 py-3 font-medium">Exam</th>
              <th className="text-left px-4 py-3 font-medium">Format</th>
              <th className="text-left px-4 py-3 font-medium">Visibility</th>
              <th className="text-left px-4 py-3 font-medium">Source</th>
              <th className="text-left px-4 py-3 font-medium">Created</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {questions.isLoading ? (
              <tr><td colSpan={7} className="text-center py-16 text-[var(--warm-charcoal)]">Loading...</td></tr>
            ) : (!questions.data?.questions || questions.data.questions.length === 0) ? (
              <tr><td colSpan={7} className="text-center py-16 text-[var(--warm-charcoal)]">No questions yet.</td></tr>
            ) : (
              questions.data.questions.map((q: any) => (
                <tr key={q.id} className="border-t border-[var(--oat-border)] hover:bg-[var(--oat-light)]/50 transition-colors">
                  <td className="px-4 py-3 max-w-xs">
                    <p className="font-medium text-[var(--clay-black)] truncate">{q.questionText}</p>
                    <p className="text-xs text-[var(--warm-charcoal)] truncate mt-0.5">{q.passageText?.slice(0, 80)}{(q.passageText?.length ?? 0) > 80 ? "..." : ""}</p>
                  </td>
                  <td className="px-4 py-3">{q.examTypeId}</td>
                  <td className="px-4 py-3 text-xs">{q.format}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      q.isPublic ? "bg-[var(--matcha-300)] text-[var(--matcha-800)]" : "bg-[var(--oat-border)] text-[var(--warm-charcoal)]"
                    }`}>{q.isPublic ? "Public" : "Private"}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">{q.source}</td>
                  <td className="px-4 py-3 text-[var(--warm-charcoal)] text-xs">{formatDate(q.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" className="h-9 rounded-[var(--radius-lg)] text-xs" onClick={() => toggleMutation.mutate({ questionId: q.id })} disabled={toggleMutation.isPending}>
                      {q.isPublic ? "Make Private" : "Make Public"}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-center gap-4 mt-6">
        <Button variant="outline" className="h-9 rounded-[var(--radius-lg)] text-xs" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Previous</Button>
        <span className="text-sm text-[var(--warm-charcoal)]">Page {page}</span>
        <Button variant="outline" className="h-9 rounded-[var(--radius-lg)] text-xs" onClick={() => setPage((p) => p + 1)} disabled={(questions.data?.questions?.length ?? 0) < limit}>Next</Button>
      </div>
    </div>
  );
}
