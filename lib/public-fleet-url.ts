/**
 * Absolute URL for the public “available bikes” page for a workspace.
 * Uses proxy headers when present (e.g. Vercel).
 */
export function absolutePublicFleetPageUrl(headersList: Headers, tenantId: string): string {
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "localhost:3000";
  const forwardedProto = headersList.get("x-forwarded-proto");
  const isLocal =
    host.startsWith("localhost") || host.startsWith("127.") || host.includes(".local");
  const proto = forwardedProto ?? (isLocal ? "http" : "https");
  return `${proto}://${host}/p/fleet/${encodeURIComponent(tenantId)}`;
}
