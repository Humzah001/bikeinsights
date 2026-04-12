import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import type { Rental, PaymentStatus, RentalStatus } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import { calculateWeeks, calculateTotalAmount, formatRentWeekDueDate } from "@/lib/calculations";
import { resolveCollectedOn } from "@/lib/resolve-collected-on";

export async function GET() {
  const data = await db.getRentals();
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const startDate = body.start_date ?? "";
    const endDate = body.end_date ?? "";
    const weeklyRate = Number(body.weekly_rate) || 0;
    const weeks = calculateWeeks(startDate, endDate);
    const totalAmount = calculateTotalAmount(startDate, endDate, weeklyRate);
    const paymentStatus = body.payment_status ?? "pending";
    const depositAmount = String(Number(body.deposit_amount) || 0);
    const initialRent = Math.max(0, Number(body.initial_rent_collected) || 0);
    const rentCollectionDate =
      typeof body.rent_collection_date === "string" ? body.rent_collection_date.trim() : "";

    let amountPaidNum =
      paymentStatus === "paid" ? totalAmount : Math.min(totalAmount, initialRent);

    let finalPaymentStatus: PaymentStatus;
    let status: RentalStatus;

    if (totalAmount > 0 && amountPaidNum >= totalAmount) {
      finalPaymentStatus = "paid";
      status = "inactive";
      amountPaidNum = totalAmount;
    } else if (amountPaidNum > 0) {
      finalPaymentStatus = "partial";
      status = (body.status as RentalStatus | undefined) ?? "active";
    } else if (paymentStatus === "paid") {
      finalPaymentStatus = "paid";
      status = "inactive";
    } else {
      finalPaymentStatus = paymentStatus === "partial" ? "partial" : "pending";
      status = (body.status as RentalStatus | undefined) ?? "active";
    }

    const id = body.id || `rent-${uuidv4().slice(0, 8)}`;
    const row: Rental = {
      id,
      bike_id: body.bike_id ?? "",
      bike_name: body.bike_name ?? "",
      customer_name: body.customer_name ?? "",
      customer_phone: body.customer_phone ?? "",
      customer_email: body.customer_email ?? "",
      start_date: startDate,
      end_date: endDate,
      weekly_rate: String(weeklyRate),
      total_amount: String(totalAmount),
      amount_paid: String(amountPaidNum),
      weeks: String(weeks),
      status,
      payment_status: finalPaymentStatus,
      deposit_amount: depositAmount,
      deposit_refunded: "false",
      rent_collection_date: rentCollectionDate,
      notes: body.notes ?? "",
      created_at: new Date().toISOString(),
    };
    const created = await db.createRental(row);

    if (amountPaidNum > 0.001) {
      try {
        const dueInitial = formatRentWeekDueDate(
          {
            start_date: row.start_date,
            weeks: row.weeks,
            weekly_rate: row.weekly_rate,
            rent_collection_date: row.rent_collection_date,
          },
          1
        );
        await db.createRentalPayment({
          rental_id: row.id,
          amount: String(amountPaidNum),
          ...(dueInitial ? { due_on: dueInitial } : {}),
          collected_on: resolveCollectedOn(body),
          week_number: 1,
          payment_type: "initial",
        });
      } catch (e) {
        if (db.isRentalPaymentsSetupError(e)) {
          console.warn("[bikeinsights] Skipped initial payment log:", e);
        } else {
          throw e;
        }
      }
    }

    const bike = await db.getBikeById(row.bike_id);
    if (bike) {
      await db.updateBike(row.bike_id, { status: "rented" });
    }

    if (row.payment_status === "pending") {
      await db.createNotification({
        id: `notif-${uuidv4().slice(0, 8)}`,
        type: "payment_pending",
        bike_id: row.bike_id,
        bike_name: row.bike_name,
        rental_id: row.id,
        customer_name: row.customer_name,
        customer_phone: row.customer_phone,
        message: `Payment pending for rental ${row.id}. Customer: ${row.customer_name}`,
        is_read: "false",
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json(created);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
