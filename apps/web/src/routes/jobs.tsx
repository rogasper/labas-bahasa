import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@labas/ui/components/card";
import { Button } from "@labas/ui/components/button";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import type { GenerationResult } from "@labas/ai";

export const Route = createFileRoute("/jobs")({
  component: RouteComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({ to: "/login", throw: true });
    }
    return { session };
  },
});

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-[var(--badge-blue-bg)] text-[var(--badge-blue-text)]",
  running: "bg-[var(--matcha-300)] text-[var(--matcha-800)]",
  completed: "bg-[var(--lemon-300)] text-[var(--lemon-800)]",
  failed: "bg-[var(--pomegranate-400)]/20 text-[var(--pomegranate-400)]",
  cancelled: "bg-[var(--warm-silver)] text-[var(--warm-charcoal)]",
};

const STATUS_ICONS: Record<string, string> = {
  pending: "hourglass_empty",
  running: "sync",
  completed: "check_circle",
  failed: "error",
  cancelled: "block",
};

function formatDate(d: string | Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RouteComponent() {
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const jobsQuery = useQuery(trpc.ai.myJobs.queryOptions({ limit: 50, offset: 0 }));

  const cancelJob = useMutation({
    ...trpc.ai.cancelJob.mutationOptions(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: trpc.ai.myJobs.queryKey() });
      await queryClient.invalidateQueries({ queryKey: trpc.ai.getJobStatus.queryKey() });
    },
  });

  const toggleExpand = (id: string) => {
    setExpandedJobId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="min-h-screen pt-8 pb-32 px-6 md:px-12 lg:px-16 max-w-6xl mx-auto bg-[var(--warm-cream)]">
      <section className="mb-10">
        <h1 className="text-4xl font-headline font-extrabold text-[var(--clay-black)] tracking-tight">
          Riwayat Generasi
        </h1>
        <p className="text-lg text-[var(--warm-charcoal)] mt-2">
          Pantau dan kelola proses generate soal AI-mu.
        </p>
      </section>

      {jobsQuery.isLoading ? (
        <div className="flex items-center gap-3 text-[var(--warm-charcoal)]">
          <MaterialIcon name="sync" className="animate-spin" />
          Memuat riwayat...
        </div>
      ) : jobsQuery.isError ? (
        <div className="p-4 rounded-[var(--radius-md)] bg-[var(--pomegranate-400)]/10 text-[var(--pomegranate-400)] border-2 border-[var(--pomegranate-400)]/20">
          Gagal memuat riwayat: {jobsQuery.error.message}
        </div>
      ) : !jobsQuery.data?.length ? (
        <Card className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
          <CardContent className="py-16 text-center">
            <MaterialIcon name="schedule" className="text-5xl text-[var(--oat-border)] mb-4" />
            <p className="text-[var(--warm-charcoal)] text-lg">Belum ada riwayat generasi.</p>
            <p className="text-sm text-[var(--warm-charcoal)] mt-1">
              Mulai generate soal di{" "}
              <Link to="/generate" className="text-[var(--matcha-600)] font-semibold underline">
                AI Lab
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {jobsQuery.data.map((job) => {
            const isExpanded = expandedJobId === job.id;
            const result = job.resultJson as GenerationResult | null;

            return (
              <Card
                key={job.id}
                className={`clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)] transition-all ${
                  isExpanded ? "ring-2 ring-[var(--matcha-300)]" : ""
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
                          STATUS_COLORS[job.status] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        <MaterialIcon name={STATUS_ICONS[job.status] ?? "help"} className="text-sm" />
                        {job.status.toUpperCase()}
                      </div>
                      <div className="text-sm text-[var(--warm-charcoal)]">
                        {job.examTypeId} · {job.sectionTypeId} · {job.questionCount} soal ·{" "}
                        {job.mode === "agentic" ? "Agentic" : "Quick"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(job.status === "pending" || job.status === "running") && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] text-xs shrink-0"
                          disabled={cancelJob.isPending}
                          onClick={() => cancelJob.mutate({ jobId: job.id })}
                        >
                          <MaterialIcon name="cancel" className="text-sm mr-1" />
                          Batalkan
                        </Button>
                      )}
                      <div className="text-xs text-[var(--warm-charcoal)]">
                        {formatDate(job.createdAt)}
                      </div>
                    </div>
                  </div>

                  {job.status === "running" && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-[var(--warm-charcoal)] mb-1">
                        <span>{job.progressMessage ?? "Processing..."}</span>
                        <span>{job.progress}%</span>
                      </div>
                      <div className="w-full h-2 bg-[var(--oat-border)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--matcha-600)] transition-all duration-500"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </CardHeader>

                {job.status === "completed" && result && (
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm text-[var(--warm-charcoal)]">
                        {result.questions.length} soal dihasilkan · {result.meta.model}
                        {result.meta.tokensUsed ? ` · ${result.meta.tokensUsed} tokens` : ""}
                        {result.meta.durationMs ? ` · ${(result.meta.durationMs / 1000).toFixed(1)}s` : ""}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleExpand(job.id)}
                        className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] text-xs"
                      >
                        <MaterialIcon name={isExpanded ? "expand_less" : "expand_more"} className="text-sm mr-1" />
                        {isExpanded ? "Tutup" : "Lihat Soal"}
                      </Button>
                    </div>

                    {isExpanded && (
                      <div className="space-y-3 mt-4 border-t-2 border-[var(--oat-border)] pt-4">
                        {result.questions.map((q, i) => (
                          <div
                            key={i}
                            className="p-4 rounded-[var(--radius-lg)] bg-[var(--warm-cream)] border-2 border-[var(--oat-border)]"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-bold px-2 py-0.5 rounded bg-[var(--matcha-300)] text-[var(--matcha-800)]">
                                {q.format.replace(/_/g, " ")}
                              </span>
                              <span className="text-xs text-[var(--warm-charcoal)]">
                                Difficulty {q.difficulty}/5
                              </span>
                            </div>
                            <p className="text-sm font-medium text-[var(--clay-black)] mb-2">
                              {i + 1}. {q.questionText}
                            </p>
                            {"options" in q && Array.isArray(q.options) && q.options.length > 0 && (
                              <div className="space-y-1 mb-2">
                                {q.options.map((opt: any) => (
                                  <div
                                    key={opt.key}
                                    className={`text-sm px-3 py-1.5 rounded-[var(--radius-md)] border ${
                                      // opt.key === q.correctAnswer
                                      //   ? "bg-[var(--matcha-300)]/30 border-[var(--matcha-300)] text-[var(--matcha-800)] font-medium"
                                      //   : "border-[var(--oat-border)] text-[var(--warm-charcoal)]"
                                      "border-[var(--oat-border)] text-[var(--warm-charcoal)]"
                                    }`}
                                  >
                                    {opt.key}. {opt.text}
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* <p className="text-xs text-[var(--warm-charcoal)]">
                              <span className="font-semibold">Jawaban:</span> {q.correctAnswer}
                            </p>
                            <p className="text-xs text-[var(--warm-charcoal)] mt-1">
                              <span className="font-semibold">Penjelasan:</span> {q.explanation}
                            </p> */}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}

                {job.status === "failed" && (
                  <CardContent className="pt-0">
                    <div className="p-3 rounded-[var(--radius-md)] bg-[var(--pomegranate-400)]/10 text-[var(--pomegranate-400)] text-sm border-2 border-[var(--pomegranate-400)]/20">
                      <MaterialIcon name="error" className="text-sm mr-1" />
                      {job.errorMessage ?? "Generation failed"}
                    </div>
                  </CardContent>
                )}

                {job.status === "cancelled" && (
                  <CardContent className="pt-0">
                    <div className="p-3 rounded-[var(--radius-md)] bg-[var(--warm-silver)]/40 text-[var(--warm-charcoal)] text-sm border-2 border-[var(--oat-border)]">
                      <MaterialIcon name="block" className="text-sm mr-1" />
                      {job.errorMessage ?? "Job dibatalkan"}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
