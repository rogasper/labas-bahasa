import { useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { trpc, trpcClient } from "@/utils/trpc";
import { authClient } from "@/lib/auth-client";
import { useJobState } from "./use-job-state";
import { usePollingTransport } from "./use-polling-transport";
import { MAX_PARALLEL, ACTIVE_STATUSES, isTerminal } from "./use-job-shared";
import type { GenerationResult } from "@labas/ai";

export type { ActiveJob, CompletedResult } from "./use-job-shared";

export function useGenerationJobs() {
  const { data: session } = authClient.useSession();
  const isAuthenticated = !!session;

  const {
    jobIds,
    completedResults,
    error,
    processedStates,
    removedIds,
    addJob,
    removeJob,
    resetAll,
    setError,
    trackStatus,
    setResult,
    clearResult,
  } = useJobState();

  /* Fallback: discover active jobs from myJobs endpoint */
  const myJobsQuery = useQuery({
    ...trpc.ai.myJobs.queryOptions({ limit: 20, offset: 0 }),
    enabled: isAuthenticated,
    refetchInterval: 3000,
  });

  /* Transport layer — polling now, swappable for WebSocket later */
  const transport = usePollingTransport({ isAuthenticated });

  useEffect(() => {
    transport.subscribe(jobIds);
    return () => transport.unsubscribe();
  }, [jobIds, transport]);

  useEffect(() => {
    transport.onUpdate((event) => {
      const { jobId, status, data } = event;
      const prevStatus = processedStates[jobId];
      if (prevStatus === status) return;
      trackStatus(jobId, status);

      const extractPkgId = (): string | null => {
        const rj = data.resultJson as Record<string, unknown> | null | undefined;
        if (!rj || typeof rj !== "object") return null;
        const id = rj.generatedPackageId;
        return typeof id === "string" ? id : null;
      };

      const baseResult = {
        jobId,
        result: data.resultJson as GenerationResult,
        generatedPackageId: extractPkgId(),
        mode: (data.mode as string) ?? "quick",
        timestamp: Date.now(),
      };

      const alreadyCompleted = completedResults.some(
        (r) => r.jobId === jobId && r.timestamp > 0,
      );

      if (alreadyCompleted) {
        if (status === "completed" && data.resultJson) {
          setResult(baseResult);
        }
        return;
      }

      if (status === "partial_ready" && data.resultJson) {
        if (!completedResults.some((r) => r.jobId === jobId)) {
          setResult(baseResult);
        }
      }

      if (status === "completed" && data.resultJson) {
        setResult(baseResult);
      }

      if (status === "failed") {
        setError((data.errorMessage as string) ?? "Generation failed");
        clearResult(jobId);
      }

      if (status === "cancelled") {
        clearResult(jobId);
      }
    });
  }, [transport, processedStates, completedResults, trackStatus, setResult, setError, clearResult]);

  /* Merge discovered jobs from myJobs fallback */
  useEffect(() => {
    if (!myJobsQuery.data) return;
    const clearedIds = new Set<string>();
    const discovered = myJobsQuery.data
      .filter(
        (j) =>
          ACTIVE_STATUSES.has(j.status) &&
          !removedIds.has(j.id) &&
          !clearedIds.has(j.id),
      )
      .map((j) => j.id);
    for (const id of discovered) {
      if (!jobIds.includes(id)) addJob(id);
    }
  }, [myJobsQuery.data, removedIds, jobIds, addJob]);

  /* Auto-remove terminal jobs after delay */
  useEffect(() => {
    const timers = jobIds
      .filter((id) => {
        const ev = processedStates[id];
        return ev && isTerminal(ev);
      })
      .map((id) =>
        setTimeout(() => removeJob(id), 5000),
      );
    return () => timers.forEach(clearTimeout);
  }, [processedStates, jobIds, removeJob]);

  const activeJobs = transport.activeJobs;
  const activeCount = activeJobs.length;
  const canAddMore = activeCount < MAX_PARALLEL;
  const isGenerating = activeCount > 0;

  const wrappedRemoveJob = useCallback(
    (id: string) => {
      trpcClient.ai.cancelJob.mutate({ jobId: id }).catch(() => {});
      removeJob(id);
    },
    [removeJob],
  );

  return {
    jobIds,
    activeJobs,
    completedResults,
    activeCount,
    isGenerating,
    canAddMore,
    error,
    addJob,
    removeJob: wrappedRemoveJob,
    resetAll,
    setError,
    myJobsQuery,
  };
}
