/**
 * Keeps normal validation messages from our APIs; strips technical hints before showing in toasts or alerts.
 */
export function userFacingApiError(error: unknown, fallback: string): string {
  if (typeof error !== "string") return fallback;
  const msg = error.trim();
  if (!msg || msg.length > 240) return fallback;
  const lower = msg.toLowerCase();
  if (
    lower.includes("supabase") ||
    lower.includes("postgres") ||
    lower.includes("postgresql") ||
    lower.includes("sqlstate") ||
    lower.includes("prisma") ||
    lower.includes("undefined") ||
    lower.includes("trace") ||
    lower.includes("stack") ||
    lower.includes(".env") ||
    lower.includes("next_public") ||
    lower.includes("service_role") ||
    lower.includes("econn") ||
    lower.includes("fetch failed") ||
    lower.includes("jwt") ||
    lower.includes("oauth") ||
    msg.includes("\n") ||
    msg.includes("  at ") ||
    msg.includes("\tat ")
  ) {
    return fallback;
  }
  return msg;
}

export function userFacingThrownError(err: unknown, fallback: string): string {
  if (err instanceof Error && typeof err.message === "string") {
    return userFacingApiError(err.message, fallback);
  }
  return fallback;
}
