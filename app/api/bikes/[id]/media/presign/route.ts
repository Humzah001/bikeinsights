import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantApi } from "@/lib/api-session";
import * as db from "@/lib/db";
import { assertFileSizeAllowed, mediaKindFromContentType } from "@/lib/bike-media-mime";
import {
  buildBikeMediaStoragePath,
  createSignedUploadForBikeMedia,
  getBikeMediaStorageConfigHint,
  isBikeMediaStorageConfigured,
} from "@/lib/supabase-bike-media";

const bodySchema = z.object({
  filename: z.string().min(1).max(200),
  contentType: z.string().min(3).max(120),
  fileSize: z.number().int().positive().max(200 * 1024 * 1024),
});

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireTenantApi();
  if (!auth.ok) return auth.response;
  const { id: bikeId } = await ctx.params;

  const bike = await db.getBikeById(auth.tenantId, bikeId);
  if (!bike) return NextResponse.json({ error: "Bike not found" }, { status: 404 });

  if (!isBikeMediaStorageConfigured()) {
    const hint = getBikeMediaStorageConfigHint();
    return NextResponse.json(
      {
        error: hint
          ? `Bike media uploads are not configured. ${hint}`
          : "Bike media uploads are not configured.",
        code: "STORAGE_NOT_CONFIGURED",
      },
      { status: 503 }
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { filename, contentType, fileSize } = parsed.data;
  const normalizedType = contentType.split(";")[0].trim();
  const kind = mediaKindFromContentType(normalizedType);
  if (!kind) {
    return NextResponse.json(
      { error: "Unsupported file type. Use JPEG, PNG, WebP, MP4, WebM, or QuickTime." },
      { status: 400 }
    );
  }
  const sizeErr = assertFileSizeAllowed(kind, fileSize);
  if (sizeErr) return NextResponse.json({ error: sizeErr }, { status: 400 });

  if (kind === "video") {
    const videoCount = await db.countBikeMediaVideos(auth.tenantId, bikeId);
    if (videoCount >= 1) {
      return NextResponse.json(
        {
          error:
            "This bike already has a video. Remove it on the bike’s edit page before uploading another.",
        },
        { status: 400 }
      );
    }
  }

  const count = await db.countBikeMedia(auth.tenantId, bikeId);
  if (count >= db.MAX_MEDIA_PER_BIKE) {
    return NextResponse.json({ error: `Maximum ${db.MAX_MEDIA_PER_BIKE} files per bike.` }, { status: 400 });
  }

  const storagePath = buildBikeMediaStoragePath(auth.tenantId, bikeId, filename);
  const signed = await createSignedUploadForBikeMedia(storagePath);
  if (!signed) {
    return NextResponse.json(
      {
        error:
          "Could not create Supabase upload URL. Ensure migration 014 ran (bucket `bike-media`) and Storage is enabled for your project.",
        code: "PRESIGN_FAILED",
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    uploadUrl: signed.signedUrl,
    path: storagePath,
    contentType: normalizedType,
  });
}
