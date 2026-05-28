/**
 * Strips sensitive fields (correctAnswer, explanation) from a row object.
 * Used to prevent leaking answer data in API responses.
 */
export function stripAnswer<T extends { correctAnswer?: unknown; explanation?: unknown }>(
  row: T,
): Omit<T, "correctAnswer" | "explanation"> {
  const { correctAnswer, explanation, ...rest } = row;
  return rest as Omit<T, "correctAnswer" | "explanation">;
}
