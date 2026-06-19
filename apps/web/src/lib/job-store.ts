import { create } from "zustand";
import type { CompletedResult } from "@/hooks/use-job-shared";

/* ── SessionStorage keys ── */

const NEW_STORE_KEY = "labas-job-store";

const OLD_JOBS_KEY = "labas_active_jobs";
const OLD_RESULTS_KEY = "labas_completed_results";
const OLD_CLEARED_KEY = "labas_cleared_jobs";

/* ── Read helpers (synchronous) ── */

function readStoredIds(): string[] {
  try {
    const raw = sessionStorage.getItem(OLD_JOBS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function readStoredResults(): CompletedResult[] {
  try {
    const raw = sessionStorage.getItem(OLD_RESULTS_KEY);
    return raw ? (JSON.parse(raw) as CompletedResult[]) : [];
  } catch {
    return [];
  }
}

function readClearedIds(): string[] {
  try {
    const raw = sessionStorage.getItem(OLD_CLEARED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function readNewStore(): null | { jobIds: string[]; completedResults: CompletedResult[]; removedIds: string[] } {
  try {
    const raw = sessionStorage.getItem(NEW_STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      jobIds: Array.isArray(parsed.jobIds) ? parsed.jobIds : [],
      completedResults: Array.isArray(parsed.completedResults) ? parsed.completedResults : [],
      removedIds: Array.isArray(parsed.removedIds) ? parsed.removedIds : [],
    };
  } catch {
    return null;
  }
}

function writeNewStore(jobIds: string[], completedResults: CompletedResult[], removedIds: string[]) {
  if (jobIds.length === 0 && completedResults.length === 0 && removedIds.length === 0) {
    sessionStorage.removeItem(NEW_STORE_KEY);
  } else {
    sessionStorage.setItem(
      NEW_STORE_KEY,
      JSON.stringify({ jobIds, completedResults, removedIds }),
    );
  }
}

/** Migrate from old keys → new key on first load, then clean old keys */
function migrateOldKeys() {
  const existing = readNewStore();
  if (existing) return existing;

  const jobIds = readStoredIds();
  const completedResults = readStoredResults();
  const removedIds = readClearedIds();

  if (jobIds.length > 0 || completedResults.length > 0 || removedIds.length > 0) {
    writeNewStore(jobIds, completedResults, removedIds);
    sessionStorage.removeItem(OLD_JOBS_KEY);
    sessionStorage.removeItem(OLD_RESULTS_KEY);
    sessionStorage.removeItem(OLD_CLEARED_KEY);
    return { jobIds, completedResults, removedIds };
  }

  return null;
}

/* ── Initial state (synchronous, no async hydration) ── */

function getInitialPersistedState() {
  const migrated = migrateOldKeys();
  if (migrated) return migrated;

  const stored = readNewStore();
  if (stored) return stored;

  return { jobIds: [] as string[], completedResults: [] as CompletedResult[], removedIds: [] as string[] };
}

/* ── Store ── */

export interface JobStoreState {
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

const initial = getInitialPersistedState();

export const useJobStore = create<JobStore>()((set, get) => ({
  jobIds: initial.jobIds,
  completedResults: initial.completedResults,
  error: null,
  processedStates: {},
  removedIds: initial.removedIds,

  addJob: (id) => {
    const { jobIds, completedResults, removedIds } = get();
    if (jobIds.includes(id)) return;
    const next = [...jobIds, id];
    set({ jobIds: next });
    writeNewStore(next, completedResults, removedIds);
  },

  removeJob: (id) => {
    set((s) => {
      const nextIds = s.jobIds.filter((j) => j !== id);
      const nextRemoved = s.removedIds.includes(id) ? s.removedIds : [...s.removedIds, id];
      writeNewStore(nextIds, s.completedResults, nextRemoved);
      return { jobIds: nextIds, removedIds: nextRemoved };
    });
  },

  resetAll: () => {
    set((s) => {
      const nextRemoved = [...new Set([...s.removedIds, ...s.jobIds])];
      writeNewStore([], [], nextRemoved);
      return { jobIds: [], completedResults: [], error: null, processedStates: {}, removedIds: nextRemoved };
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
      const idx = s.completedResults.findIndex((r) => r.jobId === result.jobId);
      const next = idx >= 0
        ? s.completedResults.map((r, i) => (i === idx ? result : r))
        : [...s.completedResults, result];
      writeNewStore(s.jobIds, next, s.removedIds);
      return { completedResults: next };
    });
  },

  clearResult: (jobId) => {
    set((s) => {
      const next = s.completedResults.filter((r) => r.jobId !== jobId);
      writeNewStore(s.jobIds, next, s.removedIds);
      return { completedResults: next };
    });
  },

  dismissResult: (jobId) => {
    set((s) => {
      const nextResults = s.completedResults.filter((r) => r.jobId !== jobId);
      const nextIds = s.jobIds.filter((j) => j !== jobId);
      const nextRemoved = s.removedIds.includes(jobId) ? s.removedIds : [...s.removedIds, jobId];
      writeNewStore(nextIds, nextResults, nextRemoved);
      return {
        completedResults: nextResults,
        jobIds: nextIds,
        removedIds: nextRemoved,
      };
    });
  },
}));
