import type { SessionOptions } from "iron-session";

export interface SessionData {
  userId: string;
  /** Logged-in user's email (omitted for Buildit4me ADMIN_PASSWORD-only login). */
  email?: string;
  /** Active workspace for fleet data (required when isLoggedIn except stale cookies). */
  tenantId?: string;
  role?: "owner" | "member";
  isPlatformAdmin?: boolean;
  isLoggedIn: boolean;
  /** Unix ms — last user activity (navigation or /api/auth/touch). */
  lastActivity?: number;
}

export const ironSessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || "bikeinsights-secret-min-32-chars-long",
  cookieName: "bikeinsights-session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24, // 24h cookie; idle enforced via lastActivity
  },
};
