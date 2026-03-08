import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import type { Rental, Notification } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import { calculateWeeks, calculateTotalAmount } from "@/lib/calculations";

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
      amount_paid: "0",
      weeks: String(weeks),
      status: body.status ?? "active",
      payment_status: body.payment_status ?? "pending",
      notes: body.notes ?? "",
      created_at: new Date().toISOString(),
    };
    const created = await db.createRental(row);

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
