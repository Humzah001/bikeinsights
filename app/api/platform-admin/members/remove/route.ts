import { NextResponse } from "next/server";
import { requirePlatformAdminApi } from "@/lib/api-session";
import * as platformDb from "@/lib/db-platform";
import { BUILDIT4ME_TENANT_ID } from "@/lib/buildit4me-tenant";

export async function POST(request: Request) {
  const auth = await requirePlatformAdminApi();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const tenantId = typeof body.tenantId === "string" ? body.tenantId.trim() : "";
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    if (!tenantId || !userId) {
      return NextResponse.json({ error: "tenantId and userId required" }, { status: 400 });
    }
    if (tenantId === BUILDIT4ME_TENANT_ID) {
      return NextResponse.json({ error: "Cannot modify the primary workspace from platform admin." }, { status: 403 });
    }
    if (userId === auth.userId && tenantId === auth.tenantId) {
      return NextResponse.json({ error: "Cannot remove yourself from your active session workspace here" }, { status: 400 });
    }
    await platformDb.removeTenantMember(tenantId, userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Remove failed" }, { status: 500 });
  }
}
