import { NextResponse } from "next/server";
import { requireTenantApi } from "@/lib/api-session";
import * as db from "@/lib/db";
import { removeBikeMediaFromStorage } from "@/lib/supabase-bike-media";

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string; mediaId: string }> }) {
  const auth = await requireTenantApi();
  if (!auth.ok) return auth.response;
  const { id: bikeId, mediaId } = await ctx.params;

  const deleted = await db.deleteBikeMediaRecord(auth.tenantId, bikeId, mediaId);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await removeBikeMediaFromStorage([deleted.storage_path]);
  } catch (e) {
    console.error("[bike media] storage delete failed:", e);
  }

  return NextResponse.json({ ok: true });
}
