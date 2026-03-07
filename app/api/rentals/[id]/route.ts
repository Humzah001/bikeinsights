import { NextRequest, NextResponse } from "next/server";
import { readCSV, writeCSV } from "@/lib/csv";
import type { Rental, Bike, Notification } from "@/lib/types";
import { calculateWeeks, calculateTotalAmount } from "@/lib/calculations";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rentals = await readCSV<Rental>("rentals.csv");
  const rental = rentals.find((r) => r.id === id);
  if (!rental) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(rental);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rentals = await readCSV<Rental>("rentals.csv");
  const index = rentals.findIndex((r) => r.id === id);
  if (index === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const r = rentals[index];

  if (body.start_date != null) r.start_date = body.start_date;
  if (body.end_date != null) r.end_date = body.end_date;
  if (body.weekly_rate != null) r.weekly_rate = String(body.weekly_rate);
  if (body.customer_name != null) r.customer_name = body.customer_name;
  if (body.customer_phone != null) r.customer_phone = body.customer_phone;
  if (body.customer_email != null) r.customer_email = body.customer_email;
  if (body.payment_status != null) r.payment_status = body.payment_status;
  if (body.status != null) r.status = body.status;
  if (body.notes != null) r.notes = body.notes;

  const weeks = calculateWeeks(r.start_date, r.end_date);
  const totalAmount = calculateTotalAmount(
    r.start_date,
    r.end_date,
    Number(r.weekly_rate)
  );
  r.weeks = String(weeks);
  r.total_amount = String(totalAmount);

  // Weekly payment: record one week's payment
  if (body.record_weekly_payment === true) {
    const paid = Number(r.amount_paid || 0);
    const rate = Number(r.weekly_rate) || 0;
    r.amount_paid = String(paid + rate);
    if (Number(r.amount_paid) >= Number(r.total_amount)) {
      r.payment_status = "paid";
      const notifications = await readCSV<Notification>("notifications.csv");
      for (const n of notifications) {
        if (n.rental_id === id) n.is_read = "true";
      }
      await writeCSV("notifications.csv", notifications);
    } else {
      r.payment_status = "partial";
    }
  }

  if (body.amount_paid != null) r.amount_paid = String(body.amount_paid);
  if (body.payment_status === "paid") {
    r.amount_paid = r.total_amount;
    const notifications = await readCSV<Notification>("notifications.csv");
    for (const n of notifications) {
      if (n.rental_id === id) n.is_read = "true";
    }
    await writeCSV("notifications.csv", notifications);
  }

  if (body.status === "completed") {
    const bikes = await readCSV<Bike>("bikes.csv");
    const bike = bikes.find((b) => b.id === r.bike_id);
    if (bike) {
      bike.status = "available";
      await writeCSV("bikes.csv", bikes);
    }
  }

  await writeCSV("rentals.csv", rentals);
  return NextResponse.json(r);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rentals = await readCSV<Rental>("rentals.csv");
  const rental = rentals.find((r) => r.id === id);
  if (!rental) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const filtered = rentals.filter((r) => r.id !== id);
  await writeCSV("rentals.csv", filtered);

  // If rental was active/overdue, set bike back to available
  if (rental.status === "active" || rental.status === "overdue") {
    const bikes = await readCSV<Bike>("bikes.csv");
    const bike = bikes.find((b) => b.id === rental.bike_id);
    if (bike) {
      bike.status = "available";
      await writeCSV("bikes.csv", bikes);
    }
  }

  return NextResponse.json({ ok: true });
}
