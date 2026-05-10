import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdminApi } from "@/lib/api-session";
import * as platformDb from "@/lib/db-platform";
import type { TenantBillingStatus } from "@/lib/db-platform";
import { BUILDIT4ME_TENANT_ID } from "@/lib/buildit4me-tenant";
import { deleteWorkspaceCascade } from "@/lib/delete-workspace";

const ALLOWED: TenantBillingStatus[] = ["trial", "active", "past_due", "canceled"];

function parseGrantDays(body: unknown): number | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const v = (body as Record<string, unknown>).grant_paid_access_days;
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  const n = Math.floor(v);
  return n > 0 ? n : undefined;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePlatformAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (id === BUILDIT4ME_TENANT_ID) {
    return NextResponse.json(
      { error: "The primary workspace cannot be modified from platform admin." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const billing_status = typeof body.billing_status === "string" ? body.billing_status.trim().toLowerCase() : undefined;
    const grantDays = parseGrantDays(body);
    const access_paused =
      typeof body.access_paused === "boolean" ? (body.access_paused as boolean) : undefined;

    if (billing_status !== undefined && !ALLOWED.includes(billing_status as TenantBillingStatus)) {
      return NextResponse.json({ error: "Invalid billing_status" }, { status: 400 });
    }

    if (billing_status !== undefined) {
      await platformDb.updateTenantBilling(id, billing_status as TenantBillingStatus);
    }

    if (grantDays !== undefined) {
      await platformDb.extendTenantPaidAccess(id, grantDays);
    }

    if (access_paused !== undefined) {
      await platformDb.setTenantAccessPaused(id, access_paused);
    }

    const tenant = await platformDb.getTenantById(id);
    if (!tenant) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    return NextResponse.json(tenant);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePlatformAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (id === BUILDIT4ME_TENANT_ID) {
    return NextResponse.json({ error: "Cannot delete the primary workspace." }, { status: 403 });
  }

  try {
    const tenant = await platformDb.getTenantById(id);
    if (!tenant) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }
    await deleteWorkspaceCascade(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
