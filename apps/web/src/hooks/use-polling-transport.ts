import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQueries } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { type ActiveJob, type JobTransport, type JobTransportEvent, isTerminal } from "./use-job-shared";

/** useQueries + .map() breaks contextual typing for refetchInterval; accept `unknown` so the callback is a valid supertype of TanStack's `Query` parameter. */
function jobStatusRefetchInterval(query: unknown): number | false {
  const data = (query as { state: { data: { status: string } | null | undefined } }).state.data;
  if (data == null) return 1000;
  if (isTerminal(data.status)) return false;
  return 1000;
}

/** Track job snapshots so progress/message/log updates propagate without ID churn. */
function serializeJobSnapshot(jobs: ActiveJob[]): string {
  return jobs
    .map((j) => {
      const logsLen = Array.isArray(j.logs) ? j.logs.length : 0;
      return [j.id, j.status, j.progress ?? 0, j.progressMessage ?? "", logsLen].join(":");
    })
    .sort()
    .join("|");
}

/** Polling-based implementation of JobTransport.
 *  Uses tRPC useQueries to poll each tracked job individually. */
export function usePollingTransport({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}): JobTransport {
  const [jobIds, setJobIds] = useState<string[]>([]);
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const activeJobsRef = useRef(activeJobs);
  activeJobsRef.current = activeJobs;
  const onUpdateRef = useRef<(event: JobTransportEvent) => void>(undefined);
  const onErrorRef = useRef<(error: Error) => void>(undefined);

  const prevSnapshotRef = useRef("");
  const prevStatusesRef = useRef<Record<string, string>>({});

  const jobQueries = useQueries({
    queries: jobIds.map((jobId) => ({
      ...trpc.ai.getJobStatus.queryOptions({ jobId }),
      enabled: !!jobId && isAuthenticated,
      refetchInterval: jobStatusRefetchInterval,
    })),
  });

  useEffect(() => {
    const nextActive = jobQueries
      .filter((q) => q.data && !isTerminal((q.data as { status: string }).status))
      .map((q) => q.data as unknown as ActiveJob);

    const nextIds = serializeJobSnapshot(nextActive);
    if (nextIds !== prevSnapshotRef.current) {
      prevSnapshotRef.current = nextIds;
      setActiveJobs(nextActive);
    }

    for (let i = 0; i < jobQueries.length; i++) {
      const query = jobQueries[i];
      const jobId = jobIds[i];
      if (!jobId || !query.data) continue;
      const data = query.data as Record<string, unknown>;
      const status = data.status as string;
      if (prevStatusesRef.current[jobId] === status) continue;
      prevStatusesRef.current[jobId] = status;
      onUpdateRef.current?.({
        jobId,
        status,
        data,
      });
    }
  }, [jobQueries, jobIds]);

  const subscribe = useCallback((ids: string[]) => {
    setJobIds((prev) => {
      if (prev.length === ids.length && prev.every((id, i) => id === ids[i])) {
        return prev;
      }
      return ids;
    });
  }, []);

  const unsubscribe = useCallback(() => {
    setJobIds([]);
    setActiveJobs([]);
  }, []);

  const onUpdate = useCallback((callback: (event: JobTransportEvent) => void) => {
    onUpdateRef.current = callback;
  }, []);

  const onError = useCallback((callback: (error: Error) => void) => {
    onErrorRef.current = callback;
  }, []);

  return useMemo(
    () => ({
      subscribe,
      unsubscribe,
      onUpdate,
      onError,
      get activeJobs() {
        return activeJobsRef.current;
      },
    }),
    [subscribe, unsubscribe, onUpdate, onError],
  );
}
