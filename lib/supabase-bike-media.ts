import { randomUUID } from "crypto";
import { getSupabase } from "@/lib/supabase/server";

export const BIKE_MEDIA_BUCKET = "bike-media";

export function isBikeMediaStorageConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return Boolean(url && key);
}

/** Non-secret hint for 503 responses (which env vars are unset). */
export function getBikeMediaStorageConfigHint(): string {
  const url = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim());
  const key = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  const missing: string[] = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!key) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length === 0) return "";
  return `Set ${missing.join(" and ")} (same as the rest of the app).`;
}

export function buildBikeMediaStoragePath(tenantId: string, bikeId: string, originalFilename: string): string {
  const safe = originalFilename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  const suffix = safe || "upload";
  return `tenants/${tenantId}/bikes/${bikeId}/${randomUUID()}-${suffix}`;
}

export function storagePathBelongsToBike(path: string, tenantId: string, bikeId: string): boolean {
  const prefix = `tenants/${tenantId}/bikes/${bikeId}/`;
  return path.startsWith(prefix);
}

export async function createSignedUploadForBikeMedia(
  storagePath: string
): Promise<{ signedUrl: string; path: string; token: string } | null> {
  const { data, error } = await getSupabase().storage.from(BIKE_MEDIA_BUCKET).createSignedUploadUrl(storagePath);
  if (error || !data) {
    console.error("[bike-media] createSignedUploadUrl:", error?.message ?? error);
    return null;
  }
  return {
    signedUrl: data.signedUrl,
    path: data.path,
    token: data.token,
  };
}

export async function createSignedDownloadUrl(storagePath: string, expiresInSeconds = 3600): Promise<string | null> {
  const { data, error } = await getSupabase()
    .storage.from(BIKE_MEDIA_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error || !data?.signedUrl) {
    console.error("[bike-media] createSignedUrl:", error?.message ?? error);
    return null;
  }
  return data.signedUrl;
}

export async function removeBikeMediaFromStorage(storagePaths: string[]): Promise<void> {
  if (storagePaths.length === 0) return;
  const { error } = await getSupabase().storage.from(BIKE_MEDIA_BUCKET).remove(storagePaths);
  if (error) console.error("[bike-media] storage.remove:", error.message);
}
