import type { BikeMediaKind } from "@/lib/types";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 120 * 1024 * 1024;

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

export function mediaKindFromContentType(contentType: string): BikeMediaKind | null {
  const ct = contentType.split(";")[0].trim().toLowerCase();
  if (IMAGE_TYPES.has(ct)) return "image";
  if (VIDEO_TYPES.has(ct)) return "video";
  return null;
}

export function maxBytesForKind(kind: BikeMediaKind): number {
  return kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
}

export function assertFileSizeAllowed(kind: BikeMediaKind, fileSize: number): string | null {
  const max = maxBytesForKind(kind);
  if (fileSize > max) {
    const mb = Math.round(max / (1024 * 1024));
    return kind === "image" ? `Image too large (max ${mb} MB).` : `Video too large (max ${mb} MB).`;
  }
  return null;
}
