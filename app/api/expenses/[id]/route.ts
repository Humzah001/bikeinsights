import { NextRequest, NextResponse } from "next/server";
import { readCSV, writeCSV, CSVWriteError } from "@/lib/csv";
import type { Expense } from "@/lib/types";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const expenses = await readCSV<Expense>("expenses.csv");
  const expense = expenses.find((e) => e.id === id);
  if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const filtered = expenses.filter((e) => e.id !== id);
  try {
    await writeCSV("expenses.csv", filtered);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof CSVWriteError) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    throw e;
  }
}
