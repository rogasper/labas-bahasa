import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@labas/ui/components/card";
import { Button } from "@labas/ui/components/button";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import type { GenerationResult } from "@labas/ai";

interface LogEntry {
  step: string;
  message: string;
  status: "running" | "done" | "error";
  timestamp: string;
  details?: string;
}

const STEP_LABELS: Record<string, string> = {
  generate_passage: "Menulis Bacaan",
  validate_passage: "Memvalidasi Bacaan",
  generate_questions: "Membuat Soal",
  self_validate: "Self-Check Kualitas",
  save: "Menyimpan Hasil",
  cancel: "Dibatalkan",
  error: "Error",
};

function LogIcon({ status }: { status: string }) {
  if (status === "done") return <MaterialIcon name="check_circle" className="text-[var(--matcha-400)] text-xs shrink-0" />;
  if (status === "error") return <MaterialIcon name="error" className="text-[var(--pomegranate-400)] text-xs shrink-0" />;
  return <MaterialIcon name="sync" className="text-[var(--matcha-400)] text-xs shrink-0 animate-spin" />;
}

function JobLogPanel({ logs, isRunning }: { logs: LogEntry[]; isRunning?: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs]);

  return (
    <div
      ref={scrollRef}
      className="mt-3 max-h-52 overflow-y-auto rounded-xl bg-[var(--clay-black)] p-3 font-mono text-[11px] leading-relaxed"
    >
      {logs.map((log, i) => {
        const isExpanded = expandedIdx === i;
        const hasDetails = !!log.details && log.details.length > 0;
        const isLast = i === logs.length - 1;
        const isCurrentRunning = isLast && log.status === "running" && isRunning;

        return (
          <div key={i} className="flex flex-col">
            <div
              className={`flex items-start gap-2 py-1 ${hasDetails ? "cursor-pointer hover:bg-white/5 rounded px-1 -mx-1 transition-colors" : ""}`}
              onClick={() => hasDetails && setExpandedIdx(isExpanded ? null : i)}
            >
              <LogIcon status={log.status} />
              <span className="text-white/30 shrink-0">
                {new Date(log.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className={`font-semibold ${
                    log.status === "error" ? "text-[var(--pomegranate-400)]" : log.status === "done" ? "text-[var(--matcha-400)]" : "text-white/80"
                  }`}>
                    {STEP_LABELS[log.step] ?? log.step}
                  </span>
                  {hasDetails && (
                    <MaterialIcon name={isExpanded ? "expand_less" : "expand_more"} className="text-white/30 text-xs" />
                  )}
                </div>
                {log.message && (
                  <span className="text-white/50 truncate">{log.message}</span>
                )}
                {isCurrentRunning && (
                  <span className="text-[var(--matcha-400)]/70 mt-0.5 flex items-center gap-1">
                    <span className="w-1 h-1 bg-[var(--matcha-400)] rounded-full animate-pulse" />
                    AI sedang memproses...
                  </span>
                )}
              </div>
            </div>

            {isExpanded && hasDetails && (
              <div className="ml-6 mt-1 mb-2 p-2.5 rounded-lg bg-black/60 border border-white/10 text-white/70 whitespace-pre-wrap text-[10px] leading-relaxed max-h-32 overflow-y-auto">
                {log.details}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

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
  running_fast: "bg-[var(--matcha-300)] text-[var(--matcha-800)]",
  partial_ready: "bg-[var(--lemon-300)] text-[var(--lemon-800)]",
  running_quality: "bg-[var(--matcha-300)] text-[var(--matcha-800)]",
  completed: "bg-[var(--lemon-300)] text-[var(--lemon-800)]",
  failed: "bg-[var(--pomegranate-400)]/20 text-[var(--pomegranate-400)]",
  cancelled: "bg-[var(--warm-silver)] text-[var(--warm-charcoal)]",
};

const STATUS_ICONS: Record<string, string> = {
  pending: "hourglass_empty",
  running: "sync",
  running_fast: "bolt",
  partial_ready: "auto_awesome",
  running_quality: "tune",
  completed: "check_circle",
  failed: "error",
  cancelled: "block",
};

const ACTIVE_STATUSES = new Set([
  "pending",
  "running",
  "running_fast",
  "partial_ready",
  "running_quality",
]);

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
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const jobsQuery = useQuery({
    ...trpc.ai.myJobs.queryOptions({ limit: 50, offset: 0 }),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const hasRunning = data.some((j: any) => ACTIVE_STATUSES.has(j.status));
      return hasRunning ? 1000 : false;
    },
  });

  const cancelJob = useMutation({
    ...trpc.ai.cancelJob.mutationOptions(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: trpc.ai.myJobs.queryKey() });
      await queryClient.invalidateQueries({ queryKey: trpc.ai.getJobStatus.queryKey() });
    },
  });

  const retryJob = useMutation({
    ...trpc.ai.retryJob.mutationOptions(),
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
            const isLogExpanded = expandedLogId === job.id;
            const result = job.resultJson as GenerationResult | null;
            const logs = (job.logs ?? []) as LogEntry[];
            const isAgentic = job.mode === "agentic";

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
                        {isAgentic ? "Agentic" : "Quick"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {ACTIVE_STATUSES.has(job.status) && (
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
                      {(job.status === "failed" || job.status === "cancelled") && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-[var(--radius-lg)] border-2 border-[var(--matcha-400)] text-xs shrink-0 text-[var(--matcha-800)]"
                          disabled={retryJob.isPending}
                          onClick={() => retryJob.mutate({ jobId: job.id })}
                        >
                          <MaterialIcon name="refresh" className="text-sm mr-1" />
                          Retry
                        </Button>
                      )}
                      <div className="text-xs text-[var(--warm-charcoal)]">
                        {formatDate(job.createdAt)}
                      </div>
                    </div>
                  </div>

                  {ACTIVE_STATUSES.has(job.status) && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-[var(--warm-charcoal)] mb-1.5">
                        <span className="truncate mr-2">{job.progressMessage ?? "Processing..."}</span>
                        <span className="shrink-0 font-semibold">{job.progress}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-[var(--oat-light)] rounded-full overflow-hidden border border-[var(--oat-border)]">
                        <div
                          className="h-full bg-[var(--matcha-600)] transition-all duration-500 rounded-full"
                          style={{ width: `${Math.max(2, job.progress ?? 0)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {isAgentic && logs.length > 0 && (
                    <div className="mt-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs text-[var(--warm-charcoal)] hover:text-[var(--clay-black)] px-0 h-auto"
                        onClick={() => setExpandedLogId((prev) => (prev === job.id ? null : job.id))}
                      >
                        <MaterialIcon name={isLogExpanded ? "expand_less" : "expand_more"} className="text-sm mr-1" />
                        {isLogExpanded ? "Sembunyikan Log" : "Lihat Log"}
                      </Button>
                      {isLogExpanded && <JobLogPanel logs={logs} isRunning={ACTIVE_STATUSES.has(job.status)} />}
                    </div>
                  )}
                </CardHeader>

                {job.status === "completed" && result && (
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm text-[var(--warm-charcoal)]">
                        {(() => {
                          const splits = (result as any).sectionSplits as { section: string; count: number }[] | undefined;
                          if (splits && splits.length > 1) {
                            return (
                              <span>
                                {result.questions.length} soal · {splits.length} section{" "}
                                {splits.map((s) => `${s.section} ${s.count}`).join(", ")} · {result.meta.model}
                                {job.tokensUsed ? ` · ${job.tokensUsed} tokens` : ""}
                                {result.meta.durationMs ? ` · ${(result.meta.durationMs / 1000).toFixed(1)}s` : ""}
                              </span>
                            );
                          }
                          return (
                            <span>
                              {result.questions.length} soal dihasilkan · {result.meta.model}
                              {job.tokensUsed ? ` · ${job.tokensUsed} tokens` : ""}
                              {result.meta.durationMs ? ` · ${(result.meta.durationMs / 1000).toFixed(1)}s` : ""}
                            </span>
                          );
                        })()}
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
