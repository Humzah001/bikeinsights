import { NextResponse } from "next/server";
import { markAllNotificationsRead } from "@/lib/notifications";
import { requireTenantApi } from "@/lib/api-session";

export async function POST() {
  const auth = await requireTenantApi();
  if (!auth.ok) return auth.response;
  await markAllNotificationsRead(auth.tenantId);
  return NextResponse.json({ ok: true });
}
