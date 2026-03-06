import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId: string;
  isLoggedIn: boolean;
}

const defaultSession: SessionData = {
  userId: "",
  isLoggedIn: false,
};

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || "bikeinsights-secret-min-32-chars-long",
  cookieName: "bikeinsights-session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7, // 1 week
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function loginSession() {
  const session = await getSession();
  session.userId = "admin";
  session.isLoggedIn = true;
  await session.save();
}

export async function logoutSession() {
  const session = await getSession();
  session.destroy();
}
