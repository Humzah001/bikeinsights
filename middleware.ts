import { getIronSession } from "iron-session";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SessionData } from "@/lib/iron-session-config";
import { ironSessionOptions } from "@/lib/iron-session-config";
import { SESSION_IDLE_MS } from "@/lib/session-idle";

const AUTH_API = new Set(["/api/auth/login", "/api/auth/logout", "/api/auth/touch"]);

function isIdleExpired(session: SessionData): boolean {
  if (!session.isLoggedIn) return false;
  const last = session.lastActivity;
  if (last == null) return false;
  return Date.now() - last > SESSION_IDLE_MS;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (AUTH_API.has(path)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  const isLoginPage = path === "/login";

  if (path === "/") {
    const dashRedirect = NextResponse.redirect(new URL("/dashboard", request.url));
    const session = await getIronSession<SessionData>(request, dashRedirect, ironSessionOptions);
    if (!session.isLoggedIn) {
      return NextResponse.redirect(loginUrl);
    }
    if (session.lastActivity == null) {
      session.lastActivity = Date.now();
    }
    if (isIdleExpired(session)) {
      session.destroy();
      await session.save();
      return NextResponse.redirect(new URL("/login?reason=timeout", request.url));
    }
    session.lastActivity = Date.now();
    await session.save();
    return dashRedirect;
  }

  if (isLoginPage) {
    const res = NextResponse.next();
    let session = await getIronSession<SessionData>(request, res, ironSessionOptions);
    if (!session.isLoggedIn) {
      return res;
    }
    if (session.lastActivity == null) {
      session.lastActivity = Date.now();
    }
    if (isIdleExpired(session)) {
      session.destroy();
      await session.save();
      return res;
    }
    const dash = NextResponse.redirect(new URL("/dashboard", request.url));
    session = await getIronSession<SessionData>(request, dash, ironSessionOptions);
    session.lastActivity = Date.now();
    await session.save();
    return dash;
  }

  const res = NextResponse.next();
  const session = await getIronSession<SessionData>(request, res, ironSessionOptions);

  if (!session.isLoggedIn) {
    if (path.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    loginUrl.searchParams.set("from", path);
    return NextResponse.redirect(loginUrl);
  }

  if (session.lastActivity == null) {
    session.lastActivity = Date.now();
    await session.save();
    return res;
  }

  if (isIdleExpired(session)) {
    session.destroy();
    await session.save();
    if (path.startsWith("/api")) {
      return NextResponse.json({ error: "Session expired", code: "IDLE_TIMEOUT" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login?reason=timeout", request.url));
  }

  session.lastActivity = Date.now();
  await session.save();
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads).*)"],
};
