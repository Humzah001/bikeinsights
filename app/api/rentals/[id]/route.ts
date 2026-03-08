import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import type { Rental } from "@/lib/types";
import { calculateWeeks, calculateTotalAmount } from "@/lib/calculations";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rental = await db.getRentalById(id);
  if (!rental) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(rental);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rental = await db.getRentalById(id);
    if (!rental) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const updates: Partial<Rental> = { ...rental };

    if (body.start_date != null) updates.start_date = body.start_date;
    if (body.end_date != null) updates.end_date = body.end_date;
    if (body.weekly_rate != null) updates.weekly_rate = String(body.weekly_rate);
    if (body.customer_name != null) updates.customer_name = body.customer_name;
    if (body.customer_phone != null) updates.customer_phone = body.customer_phone;
    if (body.customer_email != null) updates.customer_email = body.customer_email;
    if (body.payment_status != null) updates.payment_status = body.payment_status;
    if (body.status != null) updates.status = body.status;
    if (body.notes != null) updates.notes = body.notes;

    const weeks = calculateWeeks(updates.start_date!, updates.end_date!);
    const totalAmount = calculateTotalAmount(
      updates.start_date!,
      updates.end_date!,
      Number(updates.weekly_rate)
    );
    updates.weeks = String(weeks);
    updates.total_amount = String(totalAmount);

    if (body.record_weekly_payment === true) {
      const paid = Number(rental.amount_paid || 0);
      const rate = Number(rental.weekly_rate) || 0;
      updates.amount_paid = String(paid + rate);
      if (Number(updates.amount_paid) >= Number(updates.total_amount)) {
        updates.payment_status = "paid";
        await db.updateNotificationsByRentalId(id, { is_read: "true" });
      } else {
        updates.payment_status = "partial";
      }
    }

    if (body.amount_paid != null) updates.amount_paid = String(body.amount_paid);
    if (body.payment_status === "paid") {
      updates.amount_paid = updates.total_amount;
      await db.updateNotificationsByRentalId(id, { is_read: "true" });
    }

    if (body.status === "completed") {
      const bike = await db.getBikeById(rental.bike_id);
      if (bike) await db.updateBike(rental.bike_id, { status: "available" });
    }

    const updated = await db.updateRental(id, updates);
    return NextResponse.json(updated);
  } catch (err) {
    throw err;
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rental = await db.getRentalById(id);
  if (!rental) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.deleteRental(id);

  if (rental.status === "active" || rental.status === "overdue") {
    const bike = await db.getBikeById(rental.bike_id);
    if (bike) await db.updateBike(rental.bike_id, { status: "available" });
  }

  return NextResponse.json({ ok: true });
}
