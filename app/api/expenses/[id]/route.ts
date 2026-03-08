import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const expense = await db.getExpenseById(id);
  if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.deleteExpense(id);
  return NextResponse.json({ ok: true });
}
