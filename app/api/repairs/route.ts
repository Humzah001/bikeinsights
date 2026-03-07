import { NextRequest, NextResponse } from "next/server";
import { readCSV, appendCSV, writeCSV } from "@/lib/csv";
import type { Repair, Bike } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const data = await readCSV<Repair>("repairs.csv");
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const id = body.id || `repair-${uuidv4().slice(0, 8)}`;
    const row: Repair = {
      id,
      bike_id: body.bike_id ?? "",
      bike_name: body.bike_name ?? "",
      description: body.description ?? "",
      repair_date: body.repair_date ?? "",
      cost: String(body.cost ?? 0),
      repair_shop: body.repair_shop ?? "",
      status: body.status ?? "pending",
      notes: body.notes ?? "",
      created_at: new Date().toISOString(),
    };
    await appendCSV("repairs.csv", row);

    if (row.status === "pending" || row.status === "in_progress") {
      const bikes = await readCSV<Bike>("bikes.csv");
      const bike = bikes.find((b) => b.id === row.bike_id);
      if (bike) {
        bike.status = "under_repair";
        await writeCSV("bikes.csv", bikes);
      }
    }

    return NextResponse.json(row);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
