import * as db from "@/lib/db";
import { createSignedDownloadUrl, isBikeMediaStorageConfigured } from "@/lib/supabase-bike-media";
import type { Bike } from "@/lib/types";

/** Signed URL lifetime for anonymous public fleet pages (each full page load refreshes URLs). */
export const PUBLIC_FLEET_GALLERY_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;

export type BikeListGallerySlide = { url: string; media_kind: "image" | "video" };

export type BikeWithListGallery = Bike & {
  /** Ordered Supabase media with signed URLs (images and videos). */
  gallerySlides: BikeListGallerySlide[];
  /** First gallery image URL if any (convenience). */
  coverImageUrl: string | null;
};

/** @deprecated Use BikeWithListGallery */
export type BikeWithCover = BikeWithListGallery;

export async function attachBikeListGallery(
  tenantId: string,
  bikes: Bike[],
  opts?: { signedUrlExpiresInSeconds?: number }
): Promise<BikeWithListGallery[]> {
  const ttl = opts?.signedUrlExpiresInSeconds ?? 3600;

  if (!isBikeMediaStorageConfigured() || bikes.length === 0) {
    return bikes.map((b) => ({ ...b, gallerySlides: [], coverImageUrl: null }));
  }

  const bikeIds = bikes.map((b) => b.id);
  const allMedia = await db.listBikeMediaForBikeIds(tenantId, bikeIds);
  const byBike = new Map<string, typeof allMedia>();
  for (const row of allMedia) {
    const list = byBike.get(row.bike_id) ?? [];
    list.push(row);
    byBike.set(row.bike_id, list);
  }

  const out: BikeWithListGallery[] = [];
  for (const b of bikes) {
    const rows = (byBike.get(b.id) ?? []).slice(0, db.MAX_MEDIA_PER_BIKE);
    const gallerySlides: BikeListGallerySlide[] = [];
    for (const row of rows) {
      const url = await createSignedDownloadUrl(row.storage_path, ttl);
      if (url) gallerySlides.push({ url, media_kind: row.media_kind });
    }
    const coverImageUrl = gallerySlides.find((s) => s.media_kind === "image")?.url ?? null;
    out.push({ ...b, gallerySlides, coverImageUrl });
  }
  return out;
}

export type BikeGalleryItem = {
  id: string;
  media_kind: "image" | "video";
  content_type: string;
  sort_order: number;
  url: string | null;
};

export async function listBikeMediaGallery(
  tenantId: string,
  bikeId: string,
  opts?: { signedUrlExpiresInSeconds?: number }
): Promise<BikeGalleryItem[]> {
  const ttl = opts?.signedUrlExpiresInSeconds ?? 3600;
  const items = await db.listBikeMediaForBike(tenantId, bikeId);
  if (!isBikeMediaStorageConfigured()) {
    return items.map((i) => ({
      id: i.id,
      media_kind: i.media_kind,
      content_type: i.content_type,
      sort_order: i.sort_order,
      url: null,
    }));
  }
  const result: BikeGalleryItem[] = [];
  for (const item of items) {
    const url = await createSignedDownloadUrl(item.storage_path, ttl);
    result.push({
      id: item.id,
      media_kind: item.media_kind,
      content_type: item.content_type,
      sort_order: item.sort_order,
      url,
    });
  }
  return result;
}
