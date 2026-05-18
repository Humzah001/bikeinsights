import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { requireTenantApi } from "@/lib/api-session";
import * as db from "@/lib/db";
import { listBikeMediaGallery } from "@/lib/bike-media-urls";
import { mediaKindFromContentType } from "@/lib/bike-media-mime";
import { getBikeMediaStorageConfigHint, isBikeMediaStorageConfigured, storagePathBelongsToBike } from "@/lib/supabase-bike-media";

const completeBody = z.object({
  path: z.string().min(10).max(900),
  contentType: z.string().min(3).max(120),
});

export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireTenantApi();
  if (!auth.ok) return auth.response;
  const { id: bikeId } = await ctx.params;

  const bike = await db.getBikeById(auth.tenantId, bikeId);
  if (!bike) return NextResponse.json({ error: "Bike not found" }, { status: 404 });

  const items = await listBikeMediaGallery(auth.tenantId, bikeId);
  return NextResponse.json({ items });
}

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

  const parsed = completeBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const normalizedType = parsed.data.contentType.split(";")[0].trim();
  const kind = mediaKindFromContentType(normalizedType);
  if (!kind) {
    return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
  }
  if (!storagePathBelongsToBike(parsed.data.path, auth.tenantId, bikeId)) {
    return NextResponse.json({ error: "Invalid storage path." }, { status: 400 });
  }
  if (kind === "video") {
    const videoCount = await db.countBikeMediaVideos(auth.tenantId, bikeId);
    if (videoCount >= 1) {
      return NextResponse.json(
        { error: "This bike already has a video. Remove it before adding another." },
        { status: 400 }
      );
    }
  }
  const count = await db.countBikeMedia(auth.tenantId, bikeId);
  if (count >= db.MAX_MEDIA_PER_BIKE) {
    return NextResponse.json({ error: `Maximum ${db.MAX_MEDIA_PER_BIKE} files per bike.` }, { status: 400 });
  }
  const sort_order = await db.getNextBikeMediaSortOrder(auth.tenantId, bikeId);
  const created = await db.createBikeMedia(auth.tenantId, {
    id: `bm-${uuidv4().replace(/-/g, "").slice(0, 12)}`,
    bike_id: bikeId,
    storage_path: parsed.data.path,
    media_kind: kind,
    content_type: normalizedType,
    sort_order,
  });
  return NextResponse.json(created);
}
