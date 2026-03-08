import { NextResponse } from "next/server";
import * as db from "@/lib/db";

export async function GET() {
  const data = await db.getNotifications();
  return NextResponse.json(data);
}
