import { NextRequest, NextResponse } from "next/server";
import { readCSV, writeCSV } from "@/lib/csv";
import type { Bike } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const bikes = await readCSV<Bike>("bikes.csv");
  const bike = bikes.find((b) => b.id === id);
  if (!bike) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(bike);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const bikes = await readCSV<Bike>("bikes.csv");
  const index = bikes.findIndex((b) => b.id === id);
  if (index === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await request.json();
  const b = bikes[index];
  if (body.name != null) b.name = body.name;
  if (body.brand != null) b.brand = body.brand;
  if (body.model != null) b.model = body.model;
  if (body.color != null) b.color = body.color;
  if (body.serial_number != null) b.serial_number = body.serial_number;
  if (body.status != null) b.status = body.status;
  if (body.purchase_date != null) b.purchase_date = body.purchase_date;
  if (body.purchase_price != null) b.purchase_price = String(body.purchase_price);
  if (body.weekly_rate != null) b.weekly_rate = String(body.weekly_rate);
  if (body.tracker_share_url != null) b.tracker_share_url = body.tracker_share_url;
  if (body.image_filename != null) b.image_filename = body.image_filename;
  if (body.notes != null) b.notes = body.notes;
  if (body.last_latitude != null) b.last_latitude = body.last_latitude;
  if (body.last_longitude != null) b.last_longitude = body.last_longitude;
  await writeCSV("bikes.csv", bikes);
  return NextResponse.json(b);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const bikes = await readCSV<Bike>("bikes.csv");
  const filtered = bikes.filter((b) => b.id !== id);
  if (filtered.length === bikes.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await writeCSV("bikes.csv", filtered);
  return NextResponse.json({ ok: true });
}
