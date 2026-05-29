/** Better Auth signup error shape from authClient.signUp.email onError */
type SignUpErrorPayload = {
  error?: {
    message?: string;
    statusText?: string;
    status?: number;
    code?: string;
  };
};

/**
 * Heuristic for duplicate-email signup failures.
 * Used only to choose UX path — never show raw message to users (enumeration risk).
 */
export function isSignUpDuplicateError(error: SignUpErrorPayload): boolean {
  const msg = `${error.error?.message ?? ""} ${error.error?.statusText ?? ""} ${error.error?.code ?? ""}`.toLowerCase();
  if (error.error?.status === 409 || error.error?.status === 422) return true;
  return (
    msg.includes("already") ||
    msg.includes("exists") ||
    msg.includes("unique") ||
    msg.includes("duplicate") ||
    msg.includes("user_already")
  );
}
