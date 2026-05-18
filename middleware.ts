import { getIronSession } from "iron-session";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SessionData } from "@/lib/iron-session-config";
import { ironSessionOptions } from "@/lib/iron-session-config";
import { SESSION_IDLE_MS } from "@/lib/session-idle";
import { fetchTenantAccessSnapshot } from "@/lib/tenant-access-db";
import { getTenantLoginBlockReason } from "@/lib/tenant-access";

const AUTH_API = new Set([
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/touch",
  "/api/auth/accept-invite",
  "/api/auth/bootstrap",
]);

function isPublicAuthPath(path: string): boolean {
  return (
    path === "/invite/accept" ||
    path.startsWith("/invite/accept/") ||
    path === "/auth/callback"
  );
}

function isIdleExpired(session: SessionData): boolean {
  if (!session.isLoggedIn) return false;
  const last = session.lastActivity;
  if (last == null) return false;
  return Date.now() - last > SESSION_IDLE_MS;
}

function isBrokenSession(session: SessionData): boolean {
  return Boolean(session.isLoggedIn && (!session.tenantId || !session.userId));
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path === "/api/lead") {
    return NextResponse.next();
  }

  /** Public guest pages (e.g. tenant “available bikes” showcase). */
  if (path.startsWith("/p/")) {
    return NextResponse.next();
  }

  if (AUTH_API.has(path)) {
    return NextResponse.next();
  }

  if (isPublicAuthPath(path)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  const isLoginPage = path === "/login";

  if (path === "/") {
    const dashRedirect = NextResponse.redirect(new URL("/dashboard", request.url));
    const session = await getIronSession<SessionData>(request, dashRedirect, ironSessionOptions);
    if (!session.isLoggedIn) {
      /** Hash (#access_token) is never sent to the server. Supabase often redirects to Site URL `/` first,
       * so redirecting unauthenticated `/` → `/login` here drops tokens. Let the client forward fragments. */
      return NextResponse.next();
    }
    if (isBrokenSession(session)) {
      session.destroy();
      await session.save();
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
    if (!(session.isPlatformAdmin ?? false) && session.tenantId) {
      try {
        const tenantSnap = await fetchTenantAccessSnapshot(session.tenantId);
        if (tenantSnap) {
          const blockMsg = getTenantLoginBlockReason(tenantSnap);
          if (blockMsg) {
            session.destroy();
            await session.save();
            const blockedUrl = new URL("/login", request.url);
            blockedUrl.searchParams.set("reason", "workspace_blocked");
            blockedUrl.searchParams.set("detail", blockMsg.slice(0, 400));
            return NextResponse.redirect(blockedUrl);
          }
        }
      } catch (e) {
        console.error("[middleware] tenant access check failed:", e);
      }
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
    if (isBrokenSession(session)) {
      session.destroy();
      await session.save();
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

  if (isBrokenSession(session)) {
    session.destroy();
    await session.save();
    if (path.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(loginUrl);
  }

  if (!(session.isPlatformAdmin ?? false) && session.tenantId) {
    try {
      const tenantSnap = await fetchTenantAccessSnapshot(session.tenantId);
      if (tenantSnap) {
        const blockMsg = getTenantLoginBlockReason(tenantSnap);
        if (blockMsg) {
          session.destroy();
          await session.save();
          const blockedUrl = new URL("/login", request.url);
          blockedUrl.searchParams.set("reason", "workspace_blocked");
          blockedUrl.searchParams.set("detail", blockMsg.slice(0, 400));
          if (path.startsWith("/api")) {
            return NextResponse.json({ error: blockMsg, code: "WORKSPACE_BLOCKED" }, { status: 402 });
          }
          return NextResponse.redirect(blockedUrl);
        }
      }
    } catch (e) {
      console.error("[middleware] tenant access check failed:", e);
    }
  }

  if (path.startsWith("/platform-admin") && !(session.isPlatformAdmin ?? false)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
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
