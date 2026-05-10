import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import type { Expense } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import { requireTenantApi } from "@/lib/api-session";

export async function GET() {
  const auth = await requireTenantApi();
  if (!auth.ok) return auth.response;
  const data = await db.getExpenses(auth.tenantId);
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const auth = await requireTenantApi();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const id = body.id || `exp-${uuidv4().slice(0, 8)}`;
    const row: Expense = {
      id,
      bike_id: body.bike_id ?? "",
      bike_name: body.bike_name ?? "",
      category: body.category ?? "other",
      description: body.description ?? "",
      amount: String(body.amount ?? 0),
      date: body.date ?? "",
      receipt_filename: body.receipt_filename ?? "",
      notes: body.notes ?? "",
      created_at: new Date().toISOString(),
    };
    const created = await db.createExpense(auth.tenantId, row);
    return NextResponse.json(created);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
