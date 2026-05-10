/**
 * Public URL for the invite email logo. Prefer Supabase Storage so Gmail/clients can load it
 * without hitting your app origin (localhost or firewalled hosts).
 *
 * Override completely: INVITE_EMAIL_LOGO_URL
 * Or tune bucket/key: INVITE_EMAIL_LOGO_BUCKET (default email-assets), INVITE_EMAIL_LOGO_OBJECT_PATH (default bikeinsights-logo.svg)
 */
export function resolveInviteEmailLogoUrl(): string | undefined {
  const full = process.env.INVITE_EMAIL_LOGO_URL?.trim();
  if (full) return full;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
  if (!supabaseUrl) return undefined;

  const bucket = process.env.INVITE_EMAIL_LOGO_BUCKET?.trim() || "email-assets";
  const objectPath = (process.env.INVITE_EMAIL_LOGO_OBJECT_PATH?.trim() || "bikeinsights-logo.svg").replace(/^\/+/, "");
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
}
