import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  type CompletedResult,
  STORAGE_KEY,
  RESULTS_KEY,
  CLEARED_JOBS_KEY,
} from "./use-job-shared";

/* ── Pure storage helpers (testable seam) ── */

function readStoredIds(): string[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeStoredIds(ids: string[]) {
  if (ids.length === 0) sessionStorage.removeItem(STORAGE_KEY);
  else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
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
  if (results.length === 0) sessionStorage.removeItem(RESULTS_KEY);
  else sessionStorage.setItem(RESULTS_KEY, JSON.stringify(results));
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
  if (ids.length === 0) sessionStorage.removeItem(CLEARED_JOBS_KEY);
  else sessionStorage.setItem(CLEARED_JOBS_KEY, JSON.stringify(ids));
}

function broadcastJobs(ids: string[]) {
  window.dispatchEvent(
    new CustomEvent("labas:jobs-change", { detail: { ids } }),
  );
}

/* ── State shape ── */

interface State {
  jobIds: string[];
  completedResults: CompletedResult[];
  error: string | null;
  processedStates: Record<string, string>;
  removedIds: Set<string>;
}

type Action =
  | { type: "init"; jobIds: string[]; results: CompletedResult[]; clearedIds: string[] }
  | { type: "addJob"; id: string }
  | { type: "removeJob"; id: string }
  | { type: "reset" }
  | { type: "syncIds"; ids: string[] }
  | { type: "trackStatus"; jobId: string; status: string }
  | { type: "setResult"; result: CompletedResult }
  | { type: "clearResult"; jobId: string }
  | { type: "setError"; error: string | null };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "init": {
      const removed = new Set(action.clearedIds);
      return {
        ...state,
        jobIds: action.jobIds,
        completedResults: action.results,
        removedIds: removed,
      };
    }

    case "addJob": {
      if (state.jobIds.includes(action.id)) return state;
      const next = [...state.jobIds, action.id];
      writeStoredIds(next);
      broadcastJobs(next);
      return { ...state, jobIds: next };
    }

    case "removeJob": {
      const nextIds = state.jobIds.filter((j) => j !== action.id);
      const nextResults = state.completedResults.filter((r) => r.jobId !== action.id);
      const nextRemoved = new Set(state.removedIds).add(action.id);

      writeStoredIds(nextIds);
      writeStoredResults(nextResults);
      const cleared = readClearedJobIds();
      if (!cleared.includes(action.id)) writeClearedJobIds([...cleared, action.id]);

      return {
        ...state,
        jobIds: nextIds,
        completedResults: nextResults,
        removedIds: nextRemoved,
      };
    }

    case "reset": {
      const current = readStoredIds();
      const existing = readClearedJobIds();
      writeClearedJobIds([...new Set([...existing, ...current])]);
      sessionStorage.removeItem(RESULTS_KEY);
      sessionStorage.removeItem(STORAGE_KEY);

      const nextRemoved = new Set(state.removedIds);
      for (const id of current) nextRemoved.add(id);

      return {
        ...state,
        jobIds: [],
        completedResults: [],
        error: null,
        processedStates: {},
        removedIds: nextRemoved,
      };
    }

    case "syncIds": {
      return { ...state, jobIds: action.ids };
    }

    case "trackStatus": {
      return {
        ...state,
        processedStates: { ...state.processedStates, [action.jobId]: action.status },
      };
    }

    case "setResult": {
      const idx = state.completedResults.findIndex((r) => r.jobId === action.result.jobId);
      if (idx >= 0) {
        const updated = [...state.completedResults];
        updated[idx] = action.result;
        return { ...state, completedResults: updated };
      }
      return { ...state, completedResults: [...state.completedResults, action.result] };
    }

    case "clearResult": {
      return {
        ...state,
        completedResults: state.completedResults.filter((r) => r.jobId !== action.jobId),
      };
    }

    case "setError": {
      return { ...state, error: action.error };
    }

    default:
      return state;
  }
}

/* ── Hook ── */

export function useJobState() {
  const [state, dispatch] = useReducer(reducer, {
    jobIds: [],
    completedResults: [],
    error: null,
    processedStates: {},
    removedIds: new Set<string>(),
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  /* Recover from sessionStorage on mount */
  useEffect(() => {
    const saved = readStoredIds();
    const savedResults = readStoredResults();
    const clearedIds = readClearedJobIds();
    dispatch({ type: "init", jobIds: saved, results: savedResults, clearedIds });
  }, []);

  /* Persist completedResults */
  useEffect(() => {
    writeStoredResults(state.completedResults);
  }, [state.completedResults]);

  /* Sync across hook instances via custom event */
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { ids: string[] };
      dispatch({ type: "syncIds", ids: detail.ids });
    };
    window.addEventListener("labas:jobs-change", handler);
    return () => window.removeEventListener("labas:jobs-change", handler);
  }, []);

  const addJob = useCallback((id: string) => dispatch({ type: "addJob", id }), []);
  const removeJob = useCallback((id: string) => dispatch({ type: "removeJob", id }), []);
  const resetAll = useCallback(() => dispatch({ type: "reset" }), []);
  const setError = useCallback((error: string | null) => dispatch({ type: "setError", error }), []);
  const trackStatus = useCallback(
    (jobId: string, status: string) => dispatch({ type: "trackStatus", jobId, status }),
    [],
  );
  const setResult = useCallback(
    (result: CompletedResult) => dispatch({ type: "setResult", result }),
    [],
  );
  const clearResult = useCallback(
    (jobId: string) => dispatch({ type: "clearResult", jobId }),
    [],
  );

  return {
    jobIds: state.jobIds,
    completedResults: state.completedResults,
    error: state.error,
    processedStates: state.processedStates,
    removedIds: state.removedIds,
    addJob,
    removeJob,
    resetAll,
    setError,
    trackStatus,
    setResult,
    clearResult,
  };
}
