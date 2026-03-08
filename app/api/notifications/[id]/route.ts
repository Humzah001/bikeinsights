import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const notifications = await db.getNotifications();
  const n = notifications.find((x) => x.id === id);
  if (!n) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const updated = await db.updateNotification(id, { is_read: "true" });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const n = (await db.getNotifications()).find((x) => x.id === id);
  if (!n) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.deleteNotification(id);
  return NextResponse.json({ ok: true });
}
