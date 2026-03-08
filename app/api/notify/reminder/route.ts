import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import type { Rental } from "@/lib/types";
import { sendReminderEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { rental_id } = await request.json();
    if (!rental_id) {
      return NextResponse.json({ error: "rental_id required" }, { status: 400 });
    }
    const rental = await db.getRentalById(rental_id);
    if (!rental) {
      return NextResponse.json({ error: "Rental not found" }, { status: 404 });
    }
    if (!rental.customer_email) {
      return NextResponse.json(
        { error: "No customer email for this rental" },
        { status: 400 }
      );
    }
    const result = await sendReminderEmail({
      to: rental.customer_email,
      customerName: rental.customer_name,
      bikeName: rental.bike_name,
      amountOwed: `£${rental.total_amount}`,
      startDate: rental.start_date,
      endDate: rental.end_date,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || "Failed to send email" },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
