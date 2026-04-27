import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import type { GenerationResult } from "@labas/ai";

const STORAGE_KEY = "labas_active_job";

export function useGenerationJob() {
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatedPackageId, setGeneratedPackageId] = useState<string | null>(null);
  const [jobId, setJobIdState] = useState<string | null>(null);

  const setJobId = useCallback((id: string | null) => {
    setJobIdState(id);
    if (id) {
      sessionStorage.setItem(STORAGE_KEY, id);
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Recover from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) setJobIdState(saved);
  }, []);

  // Fallback: check myJobs for active jobs
  const myJobsQuery = useQuery(trpc.ai.myJobs.queryOptions({ limit: 10, offset: 0 }));

  useEffect(() => {
    if (!jobId && myJobsQuery.data) {
      const active = myJobsQuery.data.find(
        (j: any) => j.status === "pending" || j.status === "running",
      );
      if (active) setJobId(active.id);
    }
  }, [myJobsQuery.data, jobId, setJobId]);

  // Poll job status
  const jobQuery = useQuery({
    ...trpc.ai.getJobStatus.queryOptions({ jobId: jobId! }, { enabled: !!jobId }),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 1000;
      if (data.status === "completed" || data.status === "failed" || data.status === "cancelled")
        return false;
      return 1000;
    },
  });

  const isGenerating =
    jobId !== null &&
    (!jobQuery.data ||
      (jobQuery.data.status !== "completed" &&
        jobQuery.data.status !== "failed" &&
        jobQuery.data.status !== "cancelled"));

  // Handle completion / failure
  useEffect(() => {
    if (jobQuery.data?.status === "completed" && jobQuery.data.resultJson) {
      const res = jobQuery.data.resultJson as GenerationResult & { generatedPackageId?: string | null };
      setResult(res);
      setGeneratedPackageId(res.generatedPackageId ?? null);
      setJobId(null);
    }
    if (jobQuery.data?.status === "failed") {
      setError(jobQuery.data.errorMessage ?? "Generation failed");
      setJobId(null);
    }
    if (jobQuery.data?.status === "cancelled") {
      setError(jobQuery.data.errorMessage ?? "Generasi dibatalkan");
      setJobId(null);
    }
  }, [jobQuery.data, setJobId]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setGeneratedPackageId(null);
    setJobId(null);
  }, [setJobId]);

  return {
    result,
    error,
    generatedPackageId,
    jobId,
    isGenerating,
    jobQuery,
    setError,
    setJobId,
    reset,
  };
}
