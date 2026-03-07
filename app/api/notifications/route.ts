import { NextResponse } from "next/server";
import { readCSV } from "@/lib/csv";
import type { Notification } from "@/lib/types";

export async function GET() {
  const data = await readCSV<Notification>("notifications.csv");
  return NextResponse.json(data);
}
