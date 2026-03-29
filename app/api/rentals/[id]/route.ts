import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import type { Rental } from "@/lib/types";
import { calculateWeeks, calculateTotalAmount, canRecordWeeklyRentPayment } from "@/lib/calculations";

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
    const updates: Rental = {
      ...rental,
      deposit_amount: rental.deposit_amount ?? "0",
      deposit_refunded: rental.deposit_refunded ?? "false",
      rent_collection_date: rental.rent_collection_date ?? "",
    };

    if (body.start_date != null) updates.start_date = body.start_date;
    if (body.end_date != null) updates.end_date = body.end_date;
    if (body.weekly_rate != null) updates.weekly_rate = String(body.weekly_rate);
    if (body.customer_name != null) updates.customer_name = body.customer_name;
    if (body.customer_phone != null) updates.customer_phone = body.customer_phone;
    if (body.customer_email != null) updates.customer_email = body.customer_email;
    if (body.notes != null) updates.notes = body.notes;
    if (body.deposit_amount != null) updates.deposit_amount = String(Number(body.deposit_amount) || 0);
    if (body.deposit_refunded === true || body.deposit_refunded === "true") updates.deposit_refunded = "true";
    if (body.deposit_refunded === false || body.deposit_refunded === "false") updates.deposit_refunded = "false";
    if (body.payment_status != null) updates.payment_status = body.payment_status;
    if (body.rent_collection_date != null) {
      updates.rent_collection_date = String(body.rent_collection_date).trim();
    }

    updates.weeks = String(calculateWeeks(updates.start_date, updates.end_date));
    updates.total_amount = String(
      calculateTotalAmount(updates.start_date, updates.end_date, Number(updates.weekly_rate))
    );

    if (body.record_weekly_payment === true) {
      const gate = canRecordWeeklyRentPayment(
        {
          start_date: updates.start_date,
          weeks: updates.weeks,
          weekly_rate: updates.weekly_rate,
          amount_paid: updates.amount_paid,
          rent_collection_date: updates.rent_collection_date,
        },
        new Date()
      );
      if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 400 });
      const paid = Number(updates.amount_paid || 0);
      const rate = Number(updates.weekly_rate) || 0;
      updates.amount_paid = String(paid + rate);
    }

    if (body.add_amount_paid != null) {
      const add = Number(body.add_amount_paid);
      if (!Number.isFinite(add) || add <= 0) {
        return NextResponse.json({ error: "add_amount_paid must be a positive number" }, { status: 400 });
      }
      const paid = Number(updates.amount_paid || 0);
      updates.amount_paid = String(paid + add);
    }

    if (body.payment_status === "paid") {
      updates.amount_paid = updates.total_amount;
    }

    if (
      body.amount_paid != null &&
      body.record_weekly_payment !== true &&
      body.add_amount_paid == null &&
      body.payment_status !== "paid"
    ) {
      updates.amount_paid = String(body.amount_paid);
    }

    const totalNum = Number(updates.total_amount);
    let paidNum = Math.max(0, Number(updates.amount_paid || 0));
    if (totalNum >= 0 && paidNum > totalNum) paidNum = totalNum;
    updates.amount_paid = String(paidNum);

    const isFullyPaid = totalNum > 0 && paidNum >= totalNum;

    if (isFullyPaid) {
      updates.payment_status = "paid";
      updates.amount_paid = String(totalNum);
      await db.deleteNotificationsByRentalId(id);
    } else {
      if (body.payment_status != null) {
        updates.payment_status = body.payment_status;
      } else if (paidNum > 0) {
        updates.payment_status = "partial";
      } else {
        updates.payment_status = "pending";
      }
    }

    if (body.status === "completed") {
      updates.status = "completed";
      const bike = await db.getBikeById(rental.bike_id);
      if (bike) await db.updateBike(rental.bike_id, { status: "available" });
    } else if (isFullyPaid) {
      updates.status = "inactive";
    } else if (body.status != null) {
      updates.status = body.status;
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

  if (rental.status === "active" || rental.status === "overdue" || rental.status === "inactive") {
    const bike = await db.getBikeById(rental.bike_id);
    if (bike) await db.updateBike(rental.bike_id, { status: "available" });
  }

  return NextResponse.json({ ok: true });
}
