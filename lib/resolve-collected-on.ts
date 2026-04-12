/** YYYY-MM-DD for rent payment log; prefer client (local calendar day), else UTC date. */
export function resolveCollectedOn(body: { collected_on?: unknown }): string {
  const s = typeof body.collected_on === "string" ? body.collected_on.trim() : "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return new Date().toISOString().slice(0, 10);
}
