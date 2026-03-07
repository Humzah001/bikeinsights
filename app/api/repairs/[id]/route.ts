import { NextRequest, NextResponse } from "next/server";
import { readCSV, writeCSV } from "@/lib/csv";
import type { Repair, Bike } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const repairs = await readCSV<Repair>("repairs.csv");
  const repair = repairs.find((r) => r.id === id);
  if (!repair) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(repair);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const repairs = await readCSV<Repair>("repairs.csv");
  const index = repairs.findIndex((r) => r.id === id);
  if (index === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const r = repairs[index];
  const prevStatus = r.status;

  if (body.description != null) r.description = body.description;
  if (body.repair_date != null) r.repair_date = body.repair_date;
  if (body.cost != null) r.cost = String(body.cost);
  if (body.repair_shop != null) r.repair_shop = body.repair_shop;
  if (body.status != null) r.status = body.status;
  if (body.notes != null) r.notes = body.notes;

  const bikes = await readCSV<Bike>("bikes.csv");
  const bike = bikes.find((b) => b.id === r.bike_id);

  if (r.status === "completed" && (prevStatus === "pending" || prevStatus === "in_progress")) {
    if (bike && bike.status === "under_repair") {
      const otherPending = repairs.filter(
        (x) => x.bike_id === r.bike_id && x.id !== id && (x.status === "pending" || x.status === "in_progress")
      );
      if (otherPending.length === 0) {
        bike.status = "available";
        await writeCSV("bikes.csv", bikes);
      }
    }
  } else if ((r.status === "pending" || r.status === "in_progress") && prevStatus === "completed") {
    if (bike) {
      bike.status = "under_repair";
      await writeCSV("bikes.csv", bikes);
    }
  } else if (r.status === "pending" || r.status === "in_progress") {
    if (bike && bike.status !== "under_repair") {
      bike.status = "under_repair";
      await writeCSV("bikes.csv", bikes);
    }
  }

  await writeCSV("repairs.csv", repairs);
  return NextResponse.json(r);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const repairs = await readCSV<Repair>("repairs.csv");
  const repair = repairs.find((r) => r.id === id);
  if (!repair) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const filtered = repairs.filter((r) => r.id !== id);
  await writeCSV("repairs.csv", filtered);

  // If bike was under_repair and no other pending/in_progress repairs for this bike, set available
  if (repair.status === "pending" || repair.status === "in_progress") {
    const otherForBike = filtered.filter(
      (r) => r.bike_id === repair.bike_id && (r.status === "pending" || r.status === "in_progress")
    );
    if (otherForBike.length === 0) {
      const bikes = await readCSV<Bike>("bikes.csv");
      const bike = bikes.find((b) => b.id === repair.bike_id);
      if (bike && bike.status === "under_repair") {
        bike.status = "available";
        await writeCSV("bikes.csv", bikes);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
