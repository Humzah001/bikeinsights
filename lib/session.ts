import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import type { SessionData } from "@/lib/iron-session-config";
import { ironSessionOptions } from "@/lib/iron-session-config";

export type { SessionData } from "@/lib/iron-session-config";
export { ironSessionOptions } from "@/lib/iron-session-config";

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, ironSessionOptions);
}

export async function loginSession() {
  const session = await getSession();
  session.userId = "admin";
  session.isLoggedIn = true;
  session.lastActivity = Date.now();
  await session.save();
}

export async function logoutSession() {
  const session = await getSession();
  session.destroy();
  await session.save();
}
