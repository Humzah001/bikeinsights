import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import type { Repair } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import { requireTenantApi } from "@/lib/api-session";

export async function GET() {
  const auth = await requireTenantApi();
  if (!auth.ok) return auth.response;
  const data = await db.getRepairs(auth.tenantId);
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const auth = await requireTenantApi();
  if (!auth.ok) return auth.response;

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
    const created = await db.createRepair(auth.tenantId, row);

    if (row.status === "pending" || row.status === "in_progress") {
      const bike = await db.getBikeById(auth.tenantId, row.bike_id);
      if (bike) await db.updateBike(auth.tenantId, row.bike_id, { status: "under_repair" });
    }

    return NextResponse.json(created);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
