/**
 * Custom error thrown when AI generation fails part-way through.
 * Carries `tokensUsed` so the caller can record consumed tokens even on failure.
 */
export class GenerationError extends Error {
  tokensUsed?: number;
  partialResult?: { questions: unknown[] };

  constructor(message: string, opts?: { tokensUsed?: number; partialResult?: { questions: unknown[] } }) {
    super(message);
    this.name = "GenerationError";
    this.tokensUsed = opts?.tokensUsed;
    this.partialResult = opts?.partialResult;
  }
}
