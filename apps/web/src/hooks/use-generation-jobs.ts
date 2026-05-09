import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { trpc, trpcClient } from "@/utils/trpc";
import type { GenerationResult } from "@labas/ai";
import { authClient } from "@/lib/auth-client";

const STORAGE_KEY = "labas_active_jobs";
const RESULTS_KEY = "labas_completed_results";
const CLEARED_JOBS_KEY = "labas_cleared_jobs";
const MAX_PARALLEL = 3;

export interface ActiveJob {
  id: string;
  status: string;
  progress: number;
  progressMessage: string;
  mode: string;
  logs: unknown[];
  resultJson: unknown;
  errorMessage?: string;
  examTypeId?: string;
  sectionTypeId?: string;
  questionCount?: number;
}

export interface CompletedResult {
  jobId: string;
  result: GenerationResult;
  generatedPackageId: string | null;
  examType?: string;
  section?: string;
  mode: string;
  timestamp: number;
}

const ACTIVE_STATUSES = new Set([
  "pending",
  "running",
  "running_fast",
  "partial_ready",
  "running_quality",
]);

const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);

function isTerminal(status: string): boolean {
  return TERMINAL_STATUSES.has(status);
}

function readStoredIds(): string[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeStoredIds(ids: string[]) {
  if (ids.length === 0) {
    sessionStorage.removeItem(STORAGE_KEY);
  } else {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }
}

function readStoredResults(): CompletedResult[] {
  try {
    const raw = sessionStorage.getItem(RESULTS_KEY);
    return raw ? (JSON.parse(raw) as CompletedResult[]) : [];
  } catch {
    return [];
  }
}

function writeStoredResults(results: CompletedResult[]) {
  if (results.length === 0) {
    sessionStorage.removeItem(RESULTS_KEY);
  } else {
    sessionStorage.setItem(RESULTS_KEY, JSON.stringify(results));
  }
}

function readClearedJobIds(): string[] {
  try {
    const raw = sessionStorage.getItem(CLEARED_JOBS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeClearedJobIds(ids: string[]) {
  if (ids.length === 0) {
    sessionStorage.removeItem(CLEARED_JOBS_KEY);
  } else {
    sessionStorage.setItem(CLEARED_JOBS_KEY, JSON.stringify(ids));
  }
}

function broadcastJobs(ids: string[]) {
  window.dispatchEvent(
    new CustomEvent("labas:jobs-change", { detail: { ids } }),
  );
}

export function useGenerationJobs() {
  const { data: session } = authClient.useSession();
  const isAuthenticated = !!session;

  const [error, setError] = useState<string | null>(null);
  const [jobIds, setJobIdsState] = useState<string[]>([]);
  const [completedResults, setCompletedResults] = useState<CompletedResult[]>(
    [],
  );

  const processedJobStates = useRef<Record<string, string>>({});
  const removedJobIdsRef = useRef<Set<string>>(new Set());

  const setJobIds = useCallback(
    (updater: string[] | ((prev: string[]) => string[])) => {
      setJobIdsState((prev) => {
        const ids =
          typeof updater === "function" ? updater(prev) : updater;
        writeStoredIds(ids);
        broadcastJobs(ids);
        return ids;
      });
    },
    [],
  );

  const addJob = useCallback(
    (id: string) => {
      setJobIds((prev) => {
        if (prev.includes(id)) return prev;
        return [...prev, id];
      });
    },
    [setJobIds],
  );

  const removeJob = useCallback(
    (id: string) => {
      removedJobIdsRef.current.add(id);
      setJobIds((prev) => prev.filter((j) => j !== id));
      setCompletedResults((prev) => prev.filter((r) => r.jobId !== id));
      trpcClient.ai.cancelJob.mutate({ jobId: id }).catch(() => {});
    },
    [setJobIds],
  );

  const resetAll = useCallback(() => {
    setError(null);
    setCompletedResults([]);
    setJobIds((prev) => {
      writeClearedJobIds(prev);
      removedJobIdsRef.current.clear();
      return [];
    });
    processedJobStates.current = {};
    sessionStorage.removeItem(RESULTS_KEY);
  }, [setJobIds]);

  // Recover from sessionStorage on mount
  useEffect(() => {
    const saved = readStoredIds();
    if (saved.length > 0) setJobIdsState(saved);
    const savedResults = readStoredResults();
    if (savedResults.length > 0) setCompletedResults(savedResults);

    const clearedIds = readClearedJobIds();
    for (const id of clearedIds) {
      removedJobIdsRef.current.add(id);
    }
  }, []);

  // Persist completedResults to sessionStorage
  useEffect(() => {
    writeStoredResults(completedResults);
  }, [completedResults]);

  // Sync across hook instances via custom event
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { ids: string[] };
      setJobIdsState(detail.ids);
    };
    window.addEventListener("labas:jobs-change", handler);
    return () => window.removeEventListener("labas:jobs-change", handler);
  }, []);

  // Fallback: check myJobs for active jobs
  const myJobsQuery = useQuery({
    ...trpc.ai.myJobs.queryOptions({ limit: 20, offset: 0 }),
    enabled: isAuthenticated,
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (!myJobsQuery.data) return;

    const clearedIds = readClearedJobIds();

    const activeIds = myJobsQuery.data
      .filter(
        (j) =>
          ACTIVE_STATUSES.has(j.status) &&
          !removedJobIdsRef.current.has(j.id) &&
          !clearedIds.includes(j.id),
      )
      .map((j) => j.id);
    if (activeIds.length === 0) return;

    setJobIds((prev) => {
      const newIds = activeIds.filter((id: string) => !prev.includes(id));
      if (newIds.length === 0) return prev;
      return [...prev, ...newIds];
    });
  }, [myJobsQuery.data, setJobIds]);

  // Poll each active job individually
  const jobQueries = useQueries({
    queries: jobIds.map((jobId) => ({
      ...trpc.ai.getJobStatus.queryOptions({ jobId }),
      enabled: !!jobId && isAuthenticated,
      refetchInterval: (query: any) => {
        const data = query.state.data;
        if (!data) return 1000;
        if (isTerminal(data.status as string)) return false;
        return 1000;
      },
    })),
  });

  const activeJobs = useMemo(() => {
    return jobQueries
      .filter((q) => q.data && !isTerminal((q.data as { status: string }).status))
      .map((q) => q.data as unknown as ActiveJob);
  }, [jobQueries]);

  const isGenerating = activeJobs.length > 0;
  const activeCount = activeJobs.length;
  const canAddMore = activeCount < MAX_PARALLEL;

  // Track completed results
  useEffect(() => {
    for (let i = 0; i < jobQueries.length; i++) {
      const query = jobQueries[i];
      const jobId = jobIds[i];
      if (!jobId || !query.data) continue;

      const data = query.data as Record<string, unknown>;
      const status = data.status as string;

      const prevStatus = processedJobStates.current[jobId];
      if (prevStatus === status) continue;
      processedJobStates.current[jobId] = status;

      const extractPkgId = (): string | null => {
        const rj = data.resultJson as Record<string, unknown> | null | undefined;
        if (!rj || typeof rj !== "object") return null;
        const id = rj.generatedPackageId;
        return typeof id === "string" ? id : null;
      };

      // Skip if already tracked as completed
      if (completedResults.some((r) => r.jobId === jobId && r.timestamp > 0)) {
        // Update if status changed to completed with better data
        if (status === "completed" && data.resultJson) {
          setCompletedResults((prev) =>
            prev.map((r) =>
              r.jobId === jobId
                ? {
                    jobId,
                    result: data.resultJson as GenerationResult,
                    generatedPackageId: extractPkgId(),
                    mode: (data.mode as string) ?? "quick",
                    timestamp: Date.now(),
                  }
                : r,
            ),
          );
        }
        continue;
      }

      // Partial ready or completed → capture result
      if (status === "partial_ready" && data.resultJson) {
        setCompletedResults((prev) => {
          if (prev.some((r) => r.jobId === jobId)) return prev;
          return [
            ...prev,
            {
              jobId,
              result: data.resultJson as GenerationResult,
              generatedPackageId: extractPkgId(),
              mode: (data.mode as string) ?? "quick",
              timestamp: Date.now(),
            },
          ];
        });
      }

      if (status === "completed" && data.resultJson) {
        setCompletedResults((prev) => {
          const exists = prev.findIndex((r) => r.jobId === jobId);
          const entry: CompletedResult = {
            jobId,
            result: data.resultJson as GenerationResult,
            generatedPackageId: extractPkgId(),
            mode: (data.mode as string) ?? "quick",
            timestamp: Date.now(),
          };
          if (exists >= 0) {
            const updated = [...prev];
            updated[exists] = entry;
            return updated;
          }
          return [...prev, entry];
        });
      }

      if (status === "failed") {
        setError((data.errorMessage as string) ?? "Generation failed");
        setCompletedResults((prev) =>
          prev.filter((r) => r.jobId !== jobId),
        );
      }

      if (status === "cancelled") {
        setCompletedResults((prev) =>
          prev.filter((r) => r.jobId !== jobId),
        );
      }
    }
  }, [jobQueries, jobIds]);

  // Auto-remove terminal jobs from tracking after a delay
  useEffect(() => {
    const terminalIds = jobQueries
      .filter(
        (q) =>
          q.data && isTerminal((q.data as { status: string }).status),
      )
      .map((_q, i) => jobIds[i])
      .filter(Boolean);

    if (terminalIds.length === 0) return;

    const timers = terminalIds.map((id) =>
      setTimeout(() => {
        setJobIds((prev) => prev.filter((j) => j !== id));
      }, 5000),
    );

    return () => timers.forEach(clearTimeout);
  }, [jobQueries, jobIds, setJobIds]);

  return {
    jobIds,
    activeJobs,
    completedResults,
    activeCount,
    isGenerating,
    canAddMore,
    error,
    addJob,
    removeJob,
    resetAll,
    setError,
    myJobsQuery,
  };
}
