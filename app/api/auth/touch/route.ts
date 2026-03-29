import { NextResponse } from "next/server";
import { getSession, logoutSession } from "@/lib/session";
import { SESSION_IDLE_MS } from "@/lib/session-idle";

export async function POST() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const last = session.lastActivity ?? Date.now();
  if (Date.now() - last > SESSION_IDLE_MS) {
    await logoutSession();
    return NextResponse.json({ error: "Session expired", expired: true }, { status: 401 });
  }

  session.lastActivity = Date.now();
  await session.save();
  return NextResponse.json({ ok: true });
}
