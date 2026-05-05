import { useState, useRef, useEffect } from "react";
import { useRouterState, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@labas/ui/components/button";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { useGenerationJob } from "@/hooks/use-generation-job";
import { trpc, queryClient } from "@/utils/trpc";

interface LogEntry {
  step: string;
  message: string;
  status: "running" | "done" | "error";
  timestamp: string;
  details?: string;
}

const ACTIVE_JOB_STATUSES = new Set([
  "pending",
  "running",
  "running_fast",
  "partial_ready",
  "running_quality",
]);

const STEP_LABELS: Record<string, string> = {
  generate_passage: "Menulis Bacaan",
  validate_passage: "Memvalidasi Bacaan",
  generate_questions: "Membuat Soal",
  self_validate: "Self-Check Kualitas",
  save: "Menyimpan Hasil",
  cancel: "Dibatalkan",
  error: "Error",
};

function LogStatusIcon({ status }: { status: string }) {
  if (status === "done")
    return (
      <MaterialIcon
        name="check_circle"
        className="text-[var(--matcha-400)] text-xs shrink-0"
      />
    );
  if (status === "error")
    return (
      <MaterialIcon
        name="error"
        className="text-[var(--pomegranate-400)] text-xs shrink-0"
      />
    );
  return (
    <MaterialIcon
      name="sync"
      className="text-[var(--matcha-400)] text-xs shrink-0 animate-spin"
    />
  );
}

function TerminalLog({ logs, isRunning }: { logs: LogEntry[]; isRunning: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (!logs?.length) {
    return (
      <div className="mt-3 rounded-xl bg-black/40 p-3 border border-white/5">
        <div className="flex items-center gap-2 text-white/40 text-[11px] font-mono">
          <MaterialIcon name="psychology" className="text-xs animate-pulse" />
          AI sedang mempersiapkan...
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="mt-3 max-h-52 overflow-y-auto rounded-xl bg-black/40 p-3 font-mono text-[11px] leading-relaxed border border-white/5"
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
              <LogStatusIcon status={log.status} />
              <span className="text-white/30 shrink-0">
                {new Date(log.timestamp).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-semibold ${
                      log.status === "error"
                        ? "text-[var(--pomegranate-400)]"
                        : log.status === "done"
                          ? "text-[var(--matcha-400)]"
                          : "text-white/80"
                    }`}
                  >
                    {STEP_LABELS[log.step] ?? log.step}
                  </span>
                  {hasDetails && (
                    <MaterialIcon
                      name={isExpanded ? "expand_less" : "expand_more"}
                      className="text-white/30 text-xs"
                    />
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

export function GlobalGenerationProgress() {
  const { jobId, isGenerating, jobQuery, setJobId, setError } =
    useGenerationJob();
  const [minimized, setMinimized] = useState(false);

  const matches = useRouterState({ select: (s) => s.matches });
  const isGeneratePage = matches.some((m) => m.routeId === "/generate");
  const isTakePage = matches.some((m) => m.routeId === "/package/$id/take");

  const cancelJob = useMutation({
    ...trpc.ai.cancelJob.mutationOptions(),
    onSuccess: async () => {
      setJobId(null);
      setError(null);
      await queryClient.invalidateQueries({
        queryKey: trpc.ai.myJobs.queryKey(),
      });
    },
  });

  if (!isGenerating || isTakePage) return null;

  const progress = jobQuery.data?.progress ?? 0;
  const message = jobQuery.data?.progressMessage ?? "Sedang berjalan...";
  const logs = (jobQuery.data?.logs ?? []) as LogEntry[];
  const isAgentic = jobQuery.data?.mode === "agentic";

  // Minimized floating pill
  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-8 right-6 z-50 h-11 pl-4 pr-5 bg-[var(--clay-black)] rounded-full flex items-center gap-2.5 text-white text-sm font-semibold shadow-2xl border border-[var(--matcha-400)]/30 hover:border-[var(--matcha-400)]/60 transition-all"
      >
        <MaterialIcon
          name="psychology"
          className="text-[var(--matcha-400)] animate-pulse text-sm"
        />
        <span className="tabular-nums">{progress}%</span>
      </button>
    );
  }

  // Expanded floating card
  return (
    <div
      className={`fixed bottom-8 right-6 z-50 rounded-2xl shadow-2xl border p-5 text-white transition-all ${
        isGeneratePage
          ? "w-96 sm:w-[28rem] ring-2 ring-[var(--matcha-400)]/40 border-[var(--matcha-400)]/30 bg-[var(--clay-black)]"
          : "w-80 sm:w-96 border-white/10 bg-[var(--clay-black)]"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <MaterialIcon
            name="psychology"
            className="text-[var(--matcha-400)] animate-pulse text-base"
          />
          <div className="flex flex-col">
            <span className="text-sm font-semibold">AI Generation</span>
            {isAgentic && (
              <span className="text-[10px] text-[var(--matcha-400)] font-medium">
                Agentic Mode
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Link
            to="/generate"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            title="Buka halaman generate"
          >
            <MaterialIcon name="open_in_new" className="text-sm" />
          </Link>
          <button
            onClick={() => setMinimized(true)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            title="Minimize"
          >
            <MaterialIcon name="expand_more" className="text-sm" />
          </button>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-white/70 truncate pr-3 font-medium">
            {message}
          </span>
          <span className="text-sm font-bold tabular-nums shrink-0 text-[var(--matcha-400)]">
            {progress}%
          </span>
        </div>
        <div className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-[var(--matcha-600)] to-[var(--matcha-400)] transition-all duration-500 rounded-full shadow-[0_0_12px_rgba(134,194,122,0.5)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {isAgentic && (
        <TerminalLog logs={logs} isRunning={ACTIVE_JOB_STATUSES.has(jobQuery.data?.status ?? "")} />
      )}

      {jobId && (
        <Button
          type="button"
          size="sm"
          className="w-full mt-3 rounded-[var(--radius-lg)] bg-white/10 hover:bg-white/20 text-white border-0 text-xs font-semibold h-9"
          disabled={cancelJob.isPending}
          onClick={() => cancelJob.mutate({ jobId })}
        >
          <MaterialIcon name="cancel" className="text-sm mr-1.5" />
          Batal
        </Button>
      )}
    </div>
  );
}
