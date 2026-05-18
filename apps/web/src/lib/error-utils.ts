/** Extract a human-readable message from an unknown error value.
 *  Safe to use in tRPC `onError` callbacks where the error type is `unknown`. */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (
    err &&
    typeof err === "object" &&
    "message" in err &&
    typeof (err as Record<string, unknown>).message === "string"
  ) {
    return (err as Record<string, unknown>).message as string;
  }
  return "An unexpected error occurred";
}
