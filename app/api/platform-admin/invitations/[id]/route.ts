import { NextResponse } from "next/server";
import { requirePlatformAdminApi } from "@/lib/api-session";
import * as platformDb from "@/lib/db-platform";
import { BUILDIT4ME_TENANT_ID } from "@/lib/buildit4me-tenant";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const inv = await platformDb.getInvitationById(id);
    if (!inv) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }
    if (inv.tenant_id === BUILDIT4ME_TENANT_ID) {
      return NextResponse.json({ error: "Cannot modify invitations for the primary workspace." }, { status: 403 });
    }
    if (inv.accepted_at) {
      return NextResponse.json({ error: "Cannot revoke an invitation that was already accepted." }, { status: 400 });
    }
    await platformDb.deleteInvitation(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Revoke failed" }, { status: 500 });
  }
}
