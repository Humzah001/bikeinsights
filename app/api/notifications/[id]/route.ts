import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import { requireTenantApi } from "@/lib/api-session";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTenantApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const notifications = await db.getNotifications(auth.tenantId);
  const n = notifications.find((x) => x.id === id);
  if (!n) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const updated = await db.updateNotification(auth.tenantId, id, { is_read: "true" });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTenantApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const n = (await db.getNotifications(auth.tenantId)).find((x) => x.id === id);
  if (!n) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.deleteNotification(auth.tenantId, id);
  return NextResponse.json({ ok: true });
}
