import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import type { Rental } from "@/lib/types";
import {
  calculateWeeks,
  calculateTotalAmount,
  canRecordWeeklyRentPayment,
  formatRentWeekDueDate,
  getWeeksPaid,
} from "@/lib/calculations";
import { resolveCollectedOn } from "@/lib/resolve-collected-on";

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
    const collectedOn = resolveCollectedOn(body);
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
      const paidBefore = Number(updates.amount_paid || 0);
      const rate = Number(updates.weekly_rate) || 0;
      const weekNum = getWeeksPaid(paidBefore, rate) + 1;
      updates.amount_paid = String(paidBefore + rate);
      const dueForWeek = formatRentWeekDueDate(
        {
          start_date: updates.start_date,
          weeks: updates.weeks,
          weekly_rate: updates.weekly_rate,
          rent_collection_date: updates.rent_collection_date,
        },
        weekNum
      );
      await db.createRentalPayment({
        rental_id: id,
        amount: String(rate),
        ...(dueForWeek ? { due_on: dueForWeek } : {}),
        collected_on: collectedOn,
        week_number: weekNum,
        payment_type: "weekly",
      });
    }

    if (body.add_amount_paid != null) {
      const add = Number(body.add_amount_paid);
      if (!Number.isFinite(add) || add <= 0) {
        return NextResponse.json({ error: "add_amount_paid must be a positive number" }, { status: 400 });
      }
      const paidBeforeManual = Number(updates.amount_paid || 0);
      const rateManual = Number(updates.weekly_rate) || 0;
      const weekForManual =
        rateManual > 0 ? getWeeksPaid(paidBeforeManual, rateManual) + 1 : null;
      const dueManual =
        weekForManual != null
          ? formatRentWeekDueDate(
              {
                start_date: updates.start_date,
                weeks: updates.weeks,
                weekly_rate: updates.weekly_rate,
                rent_collection_date: updates.rent_collection_date,
              },
              weekForManual
            )
          : null;
      updates.amount_paid = String(paidBeforeManual + add);
      await db.createRentalPayment({
        rental_id: id,
        amount: String(add),
        ...(dueManual ? { due_on: dueManual } : {}),
        collected_on: collectedOn,
        week_number: null,
        payment_type: "manual",
      });
    }

    if (body.payment_status === "paid") {
      const beforeSettlement = Number(updates.amount_paid || 0);
      const totalStr = updates.total_amount;
      const totalNumForSettlement = Number(totalStr);
      updates.amount_paid = updates.total_amount;
      const delta = totalNumForSettlement - beforeSettlement;
      if (delta > 0.001) {
        const rateSettle = Number(updates.weekly_rate) || 0;
        const weekForSettle =
          rateSettle > 0 ? getWeeksPaid(beforeSettlement, rateSettle) + 1 : null;
        const dueSettle =
          weekForSettle != null
            ? formatRentWeekDueDate(
                {
                  start_date: updates.start_date,
                  weeks: updates.weeks,
                  weekly_rate: updates.weekly_rate,
                  rent_collection_date: updates.rent_collection_date,
                },
                weekForSettle
              )
            : null;
        await db.createRentalPayment({
          rental_id: id,
          amount: String(Math.round(delta * 100) / 100),
          ...(dueSettle ? { due_on: dueSettle } : {}),
          collected_on: collectedOn,
          week_number: null,
          payment_type: "settlement",
        });
      }
    }

    if (
      body.amount_paid != null &&
      body.record_weekly_payment !== true &&
      body.add_amount_paid == null &&
      body.payment_status !== "paid"
    ) {
      const beforeAdj = Number(updates.amount_paid || 0);
      const target = Number(body.amount_paid);
      if (Number.isFinite(target) && target > beforeAdj + 0.001) {
        const rateAdj = Number(updates.weekly_rate) || 0;
        const weekForAdj = rateAdj > 0 ? getWeeksPaid(beforeAdj, rateAdj) + 1 : null;
        const dueAdj =
          weekForAdj != null
            ? formatRentWeekDueDate(
                {
                  start_date: updates.start_date,
                  weeks: updates.weeks,
                  weekly_rate: updates.weekly_rate,
                  rent_collection_date: updates.rent_collection_date,
                },
                weekForAdj
              )
            : null;
        await db.createRentalPayment({
          rental_id: id,
          amount: String(Math.round((target - beforeAdj) * 100) / 100),
          ...(dueAdj ? { due_on: dueAdj } : {}),
          collected_on: collectedOn,
          week_number: null,
          payment_type: "adjustment",
        });
      }
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
