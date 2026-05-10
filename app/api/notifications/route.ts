import { NextResponse } from "next/server";
import * as db from "@/lib/db";
import { requireTenantApi } from "@/lib/api-session";

export async function GET() {
  const auth = await requireTenantApi();
  if (!auth.ok) return auth.response;
  const data = await db.getNotifications(auth.tenantId);
  return NextResponse.json(data);
}
