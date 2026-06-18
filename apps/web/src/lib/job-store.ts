import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CompletedResult } from "@/hooks/use-job-shared";

interface JobStoreState {
  jobIds: string[];
  completedResults: CompletedResult[];
  error: string | null;
  processedStates: Record<string, string>;
  removedIds: string[];
}

interface JobStoreActions {
  addJob: (id: string) => void;
  removeJob: (id: string) => void;
  resetAll: () => void;
  setError: (error: string | null) => void;
  trackStatus: (jobId: string, status: string) => void;
  setResult: (result: CompletedResult) => void;
  clearResult: (jobId: string) => void;
  dismissResult: (jobId: string) => void;
}

export type JobStore = JobStoreState & JobStoreActions;

export const useJobStore = create<JobStore>()(
  persist(
    (set, get) => ({
      jobIds: [],
      completedResults: [],
      error: null,
      processedStates: {},
      removedIds: [],

      addJob: (id) => {
        const { jobIds } = get();
        if (jobIds.includes(id)) return;
        set({ jobIds: [...jobIds, id] });
      },

      removeJob: (id) => {
        set((s) => ({
          jobIds: s.jobIds.filter((j) => j !== id),
          removedIds: s.removedIds.includes(id)
            ? s.removedIds
            : [...s.removedIds, id],
        }));
      },

      resetAll: () => {
        const current = get().jobIds;
        set({
          jobIds: [],
          completedResults: [],
          error: null,
          processedStates: {},
          removedIds: [...new Set([...get().removedIds, ...current])],
        });
      },

      setError: (error) => set({ error }),

      trackStatus: (jobId, status) => {
        set((s) => ({
          processedStates: { ...s.processedStates, [jobId]: status },
        }));
      },

      setResult: (result) => {
        set((s) => {
          const idx = s.completedResults.findIndex(
            (r) => r.jobId === result.jobId,
          );
          const next =
            idx >= 0
              ? s.completedResults.map((r, i) => (i === idx ? result : r))
              : [...s.completedResults, result];
          return { completedResults: next };
        });
      },

      clearResult: (jobId) => {
        set((s) => ({
          completedResults: s.completedResults.filter(
            (r) => r.jobId !== jobId,
          ),
        }));
      },

      dismissResult: (jobId) => {
        set((s) => ({
          completedResults: s.completedResults.filter(
            (r) => r.jobId !== jobId,
          ),
          jobIds: s.jobIds.filter((j) => j !== jobId),
          removedIds: s.removedIds.includes(jobId)
            ? s.removedIds
            : [...s.removedIds, jobId],
        }));
      },
    }),
    {
      name: "labas-job-store",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        jobIds: state.jobIds,
        completedResults: state.completedResults,
        removedIds: state.removedIds,
      }),
    },
  ),
);
