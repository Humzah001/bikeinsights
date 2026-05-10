import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import type { Bike } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import { requireTenantApi } from "@/lib/api-session";

export async function GET() {
  const auth = await requireTenantApi();
  if (!auth.ok) return auth.response;
  const data = await db.getBikes(auth.tenantId);
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const auth = await requireTenantApi();
  if (!auth.ok) return auth.response;

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
      image_filename: body.image_filename ?? "",
      notes: body.notes ?? "",
      created_at: new Date().toISOString(),
    };
    const created = await db.createBike(auth.tenantId, row);
    return NextResponse.json(created);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
