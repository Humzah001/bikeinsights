import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import { attachBikeListGallery } from "@/lib/bike-media-urls";
import type { Bike } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import { requireTenantApi } from "@/lib/api-session";
import { normalizeRentPackagesForSave, primaryWeeklyRateFromPackages } from "@/lib/rent-packages";

export async function GET() {
  const auth = await requireTenantApi();
  if (!auth.ok) return auth.response;
  const data = await db.getBikes(auth.tenantId);
  const withCovers = await attachBikeListGallery(auth.tenantId, data);
  return NextResponse.json(withCovers);
}

export async function POST(request: NextRequest) {
  const auth = await requireTenantApi();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const id = body.id || `bike-${uuidv4().slice(0, 8)}`;
    const rent_packages = normalizeRentPackagesForSave(body.rent_packages);
    const weekly_rate = primaryWeeklyRateFromPackages(rent_packages);
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
      weekly_rate,
      rent_packages,
      image_filename: body.image_filename ?? "",
      notes: body.notes ?? "",
      created_at: new Date().toISOString(),
      tyre_size: String(body.tyre_size ?? ""),
      frame_height_cm: String(body.frame_height_cm ?? ""),
      motor_power_w: String(body.motor_power_w ?? ""),
    };
    const created = await db.createBike(auth.tenantId, row);
    return NextResponse.json(created);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
