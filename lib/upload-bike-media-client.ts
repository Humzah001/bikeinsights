/** Keep in sync with `MAX_MEDIA_PER_BIKE` in `lib/db.ts`. */
export const MAX_BIKE_MEDIA_FILES_PER_BIKE = 24;

export type UploadBikeMediaResult =
  | { ok: true; uploaded: number }
  | { ok: false; error: string; uploaded: number };

function fileKey(f: File): string {
  return `${f.name}|${f.size}|${f.lastModified}`;
}

/** Merge new picker result with existing queue; later picks override same name/size/mtime. */
export function mergePendingMediaFiles(existing: File[], picked: File[]): File[] {
  const map = new Map<string, File>();
  for (const f of existing) map.set(fileKey(f), f);
  for (const f of picked) map.set(fileKey(f), f);
  return Array.from(map.values());
}

/** At most one video file per bike; extra videos are dropped (server also enforces). */
export function capToSingleVideoTotal(files: File[]): { files: File[]; droppedExtraVideos: number } {
  let videosKept = 0;
  const out: File[] = [];
  let droppedExtraVideos = 0;
  for (const f of files) {
    if (f.type.startsWith("video/")) {
      if (videosKept >= 1) {
        droppedExtraVideos += 1;
        continue;
      }
      videosKept += 1;
    }
    out.push(f);
  }
  return { files: out, droppedExtraVideos };
}

/**
 * Supabase signed upload: PUT multipart body (matches storage-js uploadToSignedUrl).
 * Presign → PUT → register row. Call after the bike exists.
 */
export async function uploadBikeMediaFiles(bikeId: string, files: File[]): Promise<UploadBikeMediaResult> {
  if (files.length === 0) return { ok: true, uploaded: 0 };

  let uploaded = 0;
  for (const file of files) {
    const contentType = file.type || "application/octet-stream";
    const presignRes = await fetch(`/api/bikes/${bikeId}/media/presign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType, fileSize: file.size }),
    });
    const presignJson = (await presignRes.json().catch(() => ({}))) as {
      error?: string;
      uploadUrl?: string;
      path?: string;
      contentType?: string;
    };
    if (!presignRes.ok) {
      return {
        ok: false,
        uploaded,
        error: typeof presignJson.error === "string" ? presignJson.error : "Could not start upload.",
      };
    }
    const { uploadUrl, path, contentType: ct } = presignJson;
    if (!uploadUrl || !path || !ct) {
      return { ok: false, uploaded, error: "Invalid upload response." };
    }

    const formData = new FormData();
    formData.append("cacheControl", "3600");
    formData.append("", file, file.name);

    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      body: formData,
    });
    if (!putRes.ok) {
      return { ok: false, uploaded, error: "Could not upload file to Supabase Storage." };
    }
    const done = await fetch(`/api/bikes/${bikeId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, contentType: ct }),
    });
    const doneJson = (await done.json().catch(() => ({}))) as { error?: string };
    if (!done.ok) {
      return {
        ok: false,
        uploaded,
        error: typeof doneJson.error === "string" ? doneJson.error : "Could not save file metadata.",
      };
    }
    uploaded += 1;
  }
  return { ok: true, uploaded };
}
