import { NextRequest, NextResponse } from "next/server";
import { readCSV, appendCSV, writeCSV, CSVWriteError } from "@/lib/csv";
import type { Bike } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const data = await readCSV<Bike>("bikes.csv");
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const id = body.id || `bike-${uuidv4().slice(0, 8)}`;
    const row: Bike = {
      id,
      name: body.name ?? "",
      brand: body.brand ?? "",
      model: body.model ?? "",
      color: body.color ?? "",
      serial_number: body.serial_number ?? "",
      status: body.status ?? "available",
      purchase_date: body.purchase_date ?? "",
      purchase_price: String(body.purchase_price ?? 0),
      weekly_rate: String(body.weekly_rate ?? 0),
      tracker_share_url: body.tracker_share_url ?? "",
      image_filename: body.image_filename ?? "",
      notes: body.notes ?? "",
      created_at: new Date().toISOString(),
      last_latitude: body.last_latitude,
      last_longitude: body.last_longitude,
    };
    await appendCSV("bikes.csv", row);
    return NextResponse.json(row);
  } catch (e) {
    if (e instanceof CSVWriteError) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    console.error(e);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
