import { NextRequest, NextResponse } from "next/server";
import { readCSV, writeCSV, CSVWriteError } from "@/lib/csv";
import type { Notification } from "@/lib/types";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const notifications = await readCSV<Notification>("notifications.csv");
  const n = notifications.find((x) => x.id === id);
  if (!n) return NextResponse.json({ error: "Not found" }, { status: 404 });
  n.is_read = "true";
  try {
    await writeCSV("notifications.csv", notifications);
    return NextResponse.json(n);
  } catch (e) {
    if (e instanceof CSVWriteError) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    throw e;
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const notifications = await readCSV<Notification>("notifications.csv");
  const filtered = notifications.filter((n) => n.id !== id);
  if (filtered.length === notifications.length)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    await writeCSV("notifications.csv", filtered);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof CSVWriteError) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    throw e;
  }
}
