import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import type { Bike } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const bike = await db.getBikeById(id);
  if (!bike) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(bike);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const bike = await db.getBikeById(id);
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
  if (body.weekly_rate != null) updates.weekly_rate = String(body.weekly_rate);
  if (body.tracker_share_url != null) updates.tracker_share_url = body.tracker_share_url;
  if (body.image_filename != null) updates.image_filename = body.image_filename;
  if (body.notes != null) updates.notes = body.notes;
  if (body.last_latitude != null) updates.last_latitude = body.last_latitude;
  if (body.last_longitude != null) updates.last_longitude = body.last_longitude;
  const updated = await db.updateBike(id, updates);
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const bike = await db.getBikeById(id);
  if (!bike) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.deleteBike(id);
  return NextResponse.json({ ok: true });
}
