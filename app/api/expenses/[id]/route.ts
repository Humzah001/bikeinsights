import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import { requireTenantApi } from "@/lib/api-session";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTenantApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const expense = await db.getExpenseById(auth.tenantId, id);
  if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.deleteExpense(auth.tenantId, id);
  return NextResponse.json({ ok: true });
}
