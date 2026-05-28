import { useState, useRef, useEffect } from "react";
import { useRouterState, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@labas/ui/components/button";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { useGenerationJobs, type ActiveJob } from "@/hooks/use-generation-jobs";
import { isTerminal } from "@/hooks/use-job-shared";
import { trpc, queryClient } from "@/utils/trpc";

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
      <div className="mt-2 rounded-lg bg-black/40 p-2 border border-white/5">
        <div className="flex items-center gap-2 text-white/40 text-[10px] font-mono">
          <MaterialIcon name="psychology" className="text-[10px] animate-pulse" />
          AI sedang mempersiapkan...
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="mt-2 max-h-32 overflow-y-auto rounded-lg bg-black/40 p-2 font-mono text-[10px] leading-relaxed border border-white/5"
    >
      {logs.map((log, i) => {
        const isExpanded = expandedIdx === i;
        const hasDetails = !!log.details && log.details.length > 0;
        const isLast = i === logs.length - 1;
        const isCurrentRunning = isLast && log.status === "running" && isRunning;

        return (
          <div key={i} className="flex flex-col">
            <div
              className={`flex items-start gap-1.5 py-0.5 ${hasDetails ? "cursor-pointer hover:bg-white/5 rounded px-1 -mx-1 transition-colors" : ""}`}
              onClick={() => hasDetails && setExpandedIdx(isExpanded ? null : i)}
            >
              <LogStatusIcon status={log.status} />
              <span className="text-white/30 shrink-0">
                {new Date(log.timestamp).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span
                className={`font-semibold truncate ${
                  log.status === "error"
                    ? "text-[var(--pomegranate-400)]"
                    : log.status === "done"
                      ? "text-[var(--matcha-400)]"
                      : "text-white/80"
                }`}
              >
                {STEP_LABELS[log.step] ?? log.step}
              </span>
              {isCurrentRunning && (
                <span className="w-1 h-1 bg-[var(--matcha-400)] rounded-full animate-pulse shrink-0 mt-1" />
              )}
            </div>
            {isExpanded && hasDetails && (
              <div className="ml-5 mt-0.5 mb-1 p-2 rounded bg-black/60 border border-white/10 text-white/70 whitespace-pre-wrap text-[9px] leading-relaxed max-h-24 overflow-y-auto">
                {log.details}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SingleJobCard({
  job,
  onCancel,
  cancelPending,
}: {
  job: ActiveJob;
  onCancel: (jobId: string) => void;
  cancelPending: boolean;
}) {
  const [minimized, setMinimized] = useState(false);
  const progress = job.progress ?? 0;
  const message = job.progressMessage ?? "Sedang berjalan...";
  const logs = (job.logs ?? []) as LogEntry[];
  const isAgentic = job.mode === "agentic";
  const isAudio = job.mode === "batch" && job.sectionTypeId === "LISTENING";

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="flex items-center gap-2 py-1.5 px-3 bg-[var(--clay-black)]/90 rounded-lg text-white text-xs font-semibold border border-[var(--slushie-500)]/30 hover:border-[var(--slushie-500)]/60 transition-all w-full"
      >
        <MaterialIcon
          name={isAudio ? "headphones" : "psychology"}
          className={isAudio ? "text-[var(--slushie-500)] text-xs" : "text-[var(--matcha-400)] animate-pulse text-xs"}
        />
        <span className="truncate flex-1 text-left">{message}</span>
        <span className="tabular-nums text-[var(--slushie-500)]">{progress}%</span>
      </button>
    );
  }

  return (
    <div className={`rounded-xl bg-[var(--clay-black)] border p-3 transition-all ${isAudio ? "border-[var(--slushie-500)]/20" : "border-white/10"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <MaterialIcon
            name={isAudio ? "headphones" : "psychology"}
            className={`${isAudio ? "text-[var(--slushie-500)]" : "text-[var(--matcha-400)] animate-pulse"} text-sm shrink-0`}
          />
          <div className="min-w-0">
            <span className="text-xs font-semibold block truncate">{message}</span>
            {isAudio && (
              <span className="text-[10px] text-[var(--slushie-500)]">Audio</span>
            )}
            {isAgentic && (
              <span className="text-[10px] text-[var(--matcha-400)]">Agentic</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setMinimized(true)}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >
            <MaterialIcon name="expand_less" className="text-xs" />
          </button>
          {!isAudio && (
            <button
              onClick={() => onCancel(job.id)}
              disabled={cancelPending}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[var(--pomegranate-400)]/20 text-white/50 hover:text-[var(--pomegranate-400)] transition-colors disabled:opacity-30"
            >
              <MaterialIcon name="close" className="text-xs" />
            </button>
          )}
        </div>
      </div>

      <div className="mb-2">
        <div className="flex justify-between items-center mb-1">
          <span className={`tabular-nums text-xs font-bold ${isAudio ? "text-[var(--slushie-500)]" : "text-[var(--matcha-400)]"}`}>
            {progress}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isAudio
                ? "bg-gradient-to-r from-[var(--slushie-600)] to-[var(--slushie-500)]"
                : "bg-gradient-to-r from-[var(--matcha-600)] to-[var(--matcha-400)]"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {isAgentic && <TerminalLog logs={logs} isRunning={!isTerminal(job.status)} />}
    </div>
  );
}

export function GlobalGenerationProgress() {
  const { activeJobs, isGenerating, removeJob, setError } = useGenerationJobs();
  const [collapsed, setCollapsed] = useState(false);

  const matches = useRouterState({ select: (s) => s.matches });
  const isGeneratePage = matches.some((m) => m.routeId === "/generate");
  const isTakePage = matches.some((m) => m.routeId === "/package/$id/take");

  const hasAudioJobs = activeJobs.some((j) => j.mode === "batch" && j.sectionTypeId === "LISTENING");
  const hasAiJobs = activeJobs.some((j) => j.mode !== "batch");

  const cancelMutation = useMutation({
    ...trpc.ai.cancelJob.mutationOptions(),
    onSuccess: async (_data, variables) => {
      removeJob(variables.jobId);
      setError(null);
      await queryClient.invalidateQueries({
        queryKey: trpc.ai.myJobs.queryKey(),
      });
    },
  });

  if (!isGenerating || isTakePage) return null;

  const handleCancel = (jobId: string) => {
    cancelMutation.mutate({ jobId });
  };

  // Collapsed floating pill showing count (audio or ai)
  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed bottom-8 right-6 z-50 h-11 pl-4 pr-5 bg-[var(--clay-black)] rounded-full flex items-center gap-2.5 text-white text-sm font-semibold shadow-2xl border border-[var(--slushie-500)]/30 hover:border-[var(--slushie-500)]/60 transition-all"
      >
        <MaterialIcon
          name={hasAudioJobs ? "headphones" : "psychology"}
          className={hasAudioJobs ? "text-[var(--slushie-500)] text-sm" : "text-[var(--matcha-400)] animate-pulse text-sm"}
        />
        <span>{activeJobs.length} active</span>
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-8 right-6 z-50 rounded-2xl shadow-2xl border p-4 text-white transition-all ${
        isGeneratePage
          ? "w-80 sm:w-[26rem] ring-2 ring-[var(--matcha-400)]/40 border-[var(--matcha-400)]/30 bg-[var(--clay-black)]"
          : "w-72 sm:w-80 border-white/10 bg-[var(--clay-black)]"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {hasAiJobs && (
            <MaterialIcon name="psychology" className="text-[var(--matcha-400)] animate-pulse text-base" />
          )}
          {hasAudioJobs && (
            <MaterialIcon name="headphones" className="text-[var(--slushie-500)] text-base" />
          )}
          <span className="text-sm font-semibold">
            {hasAiJobs && hasAudioJobs ? "AI & Audio"
              : hasAudioJobs ? "Audio"
              : "AI Generation"}
            {activeJobs.length > 1 ? ` (${activeJobs.length})` : ""}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Link
            to="/generate"
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            title="Buka halaman generate"
          >
            <MaterialIcon name="open_in_new" className="text-sm" />
          </Link>
          <button
            onClick={() => setCollapsed(true)}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            title="Minimize"
          >
            <MaterialIcon name="expand_more" className="text-sm" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
        {activeJobs.map((job) => (
          <SingleJobCard
            key={job.id}
            job={job}
            onCancel={handleCancel}
            cancelPending={cancelMutation.isPending}
          />
        ))}
      </div>
    </div>
  );
}
