import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import type { Bike } from "@/lib/types";
import { requireTenantApi } from "@/lib/api-session";
import { normalizeRentPackagesForSave, primaryWeeklyRateFromPackages } from "@/lib/rent-packages";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTenantApi();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const bike = await db.getBikeById(auth.tenantId, id);
  if (!bike) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(bike);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTenantApi();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const bike = await db.getBikeById(auth.tenantId, id);
  if (!bike) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await request.json();
  const updates: Partial<Bike> = {};
  if (body.name != null) updates.name = body.name;
  if (body.brand != null) updates.brand = body.brand;
  if (body.model != null) updates.model = body.model;
  if (body.color != null) updates.color = body.color;
  if (body.serial_number != null) updates.serial_number = body.serial_number;
  if (body.status != null) updates.status = body.status;
  if (body.purchase_date != null) updates.purchase_date = body.purchase_date;
  if (body.purchase_price != null) updates.purchase_price = String(body.purchase_price);
  if (body.rent_packages != null) {
    const rent_packages = normalizeRentPackagesForSave(body.rent_packages);
    updates.rent_packages = rent_packages;
    updates.weekly_rate = primaryWeeklyRateFromPackages(rent_packages);
  } else if (body.weekly_rate != null) {
    updates.weekly_rate = String(body.weekly_rate);
  }
  if (body.image_filename != null) updates.image_filename = body.image_filename;
  if (body.notes != null) updates.notes = body.notes;
  if (body.tyre_size != null) updates.tyre_size = String(body.tyre_size);
  if (body.frame_height_cm != null) updates.frame_height_cm = String(body.frame_height_cm);
  if (body.motor_power_w != null) updates.motor_power_w = String(body.motor_power_w);
  const updated = await db.updateBike(auth.tenantId, id, updates);
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTenantApi();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const bike = await db.getBikeById(auth.tenantId, id);
  if (!bike) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    await db.deleteBike(auth.tenantId, id);
  } catch (e: unknown) {
    const code =
      typeof e === "object" && e !== null && "code" in e ? String((e as { code?: string }).code) : "";
    if (code === "23503") {
      return NextResponse.json(
        {
          error:
            "Cannot delete this bike while rentals, repairs, or expenses still reference it. Remove or reassign those records first.",
        },
        { status: 409 }
      );
    }
    throw e;
  }
  return NextResponse.json({ ok: true });
}
