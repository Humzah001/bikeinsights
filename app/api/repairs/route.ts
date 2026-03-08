import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import type { Repair } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const data = await db.getRepairs();
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
    const created = await db.createRepair(row);

    if (row.status === "pending" || row.status === "in_progress") {
      const bike = await db.getBikeById(row.bike_id);
      if (bike) await db.updateBike(row.bike_id, { status: "under_repair" });
    }

    return NextResponse.json(created);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
