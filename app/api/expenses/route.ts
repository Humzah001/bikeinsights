import { NextRequest, NextResponse } from "next/server";
import { readCSV, appendCSV, CSVWriteError } from "@/lib/csv";
import type { Expense } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const data = await readCSV<Expense>("expenses.csv");
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
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
    await appendCSV("expenses.csv", row);
    return NextResponse.json(row);
  } catch (e) {
    if (e instanceof CSVWriteError) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    console.error(e);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
