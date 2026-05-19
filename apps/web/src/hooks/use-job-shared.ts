/** Shared types and constants for job management hooks. */

export const STORAGE_KEY = "labas_active_jobs";
export const RESULTS_KEY = "labas_completed_results";
export const CLEARED_JOBS_KEY = "labas_cleared_jobs";
export const MAX_PARALLEL = 3;

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
  result: import("@labas/ai").GenerationResult;
  generatedPackageId: string | null;
  examType?: string;
  section?: string;
  mode: string;
  timestamp: number;
}

/** Event emitted by a JobTransport when a job's status changes. */
export interface JobTransportEvent {
  jobId: string;
  status: string;
  data: Record<string, unknown>;
}

/** Abstract transport for receiving real-time job updates.
 *  Concrete adapters: PollingTransport (now), WebSocketTransport (future). */
export interface JobTransport {
  /** Start listening for updates on the given job IDs. */
  subscribe(jobIds: string[]): void;
  /** Stop listening for updates. */
  unsubscribe(): void;
  /** Register a callback for status-change events. */
  onUpdate(callback: (event: JobTransportEvent) => void): void;
  /** Register a callback for transport-level errors. */
  onError(callback: (error: Error) => void): void;
  /** Active jobs derived from latest events. */
  readonly activeJobs: ActiveJob[];
}

export const ACTIVE_STATUSES = new Set([
  "pending",
  "running",
  "running_fast",
  "partial_ready",
  "running_quality",
]);

export const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);

export function isTerminal(status: string): boolean {
  return TERMINAL_STATUSES.has(status);
}
