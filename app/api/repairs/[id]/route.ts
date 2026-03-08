import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import type { Repair } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const repair = await db.getRepairById(id);
  if (!repair) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(repair);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const repair = await db.getRepairById(id);
  if (!repair) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const prevStatus = repair.status;
  const updates: Partial<Repair> = {};
  if (body.description != null) updates.description = body.description;
  if (body.repair_date != null) updates.repair_date = body.repair_date;
  if (body.cost != null) updates.cost = String(body.cost);
  if (body.repair_shop != null) updates.repair_shop = body.repair_shop;
  if (body.status != null) updates.status = body.status;
  if (body.notes != null) updates.notes = body.notes;

  const updated = await db.updateRepair(id, updates);
  const bike = await db.getBikeById(repair.bike_id);
  const repairs = await db.getRepairs();
  const otherPending = repairs.filter(
    (x) => x.bike_id === repair.bike_id && x.id !== id && (x.status === "pending" || x.status === "in_progress")
  );

  if (updated.status === "completed" && (prevStatus === "pending" || prevStatus === "in_progress")) {
    if (bike && bike.status === "under_repair" && otherPending.length === 0) {
      await db.updateBike(repair.bike_id, { status: "available" });
    }
  } else if ((updated.status === "pending" || updated.status === "in_progress") && prevStatus === "completed") {
    if (bike) await db.updateBike(repair.bike_id, { status: "under_repair" });
  } else if (updated.status === "pending" || updated.status === "in_progress") {
    if (bike && bike.status !== "under_repair") {
      await db.updateBike(repair.bike_id, { status: "under_repair" });
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const repair = await db.getRepairById(id);
  if (!repair) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.deleteRepair(id);

  if (repair.status === "pending" || repair.status === "in_progress") {
    const repairs = await db.getRepairs();
    const otherForBike = repairs.filter(
      (r) => r.bike_id === repair.bike_id && (r.status === "pending" || r.status === "in_progress")
    );
    if (otherForBike.length === 0) {
      const bike = await db.getBikeById(repair.bike_id);
      if (bike && bike.status === "under_repair") {
        await db.updateBike(repair.bike_id, { status: "available" });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
