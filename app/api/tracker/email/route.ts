import { NextRequest, NextResponse } from "next/server";
import { readCSV } from "@/lib/csv";
import type { Bike } from "@/lib/types";
import { sendTrackerLocationsEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { to } = await request.json();
    const toEmail = to || process.env.NOTIFICATION_FROM_EMAIL;
    if (!toEmail) {
      return NextResponse.json(
        { error: "Email address required (to or NOTIFICATION_FROM_EMAIL)" },
        { status: 400 }
      );
    }
    const bikes = await readCSV<Bike>("bikes.csv");
    const bikeLinks = bikes
      .filter((b) => b.tracker_share_url)
      .map((b) => ({ name: b.name, url: b.tracker_share_url }));
    if (bikeLinks.length === 0) {
      return NextResponse.json(
        { error: "No bikes with tracker links" },
        { status: 400 }
      );
    }
    const result = await sendTrackerLocationsEmail({ to: toEmail, bikeLinks });
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
