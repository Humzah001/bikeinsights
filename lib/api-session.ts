import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export type ApiTenantAuth =
  | { ok: true; tenantId: string; userId: string; isPlatformAdmin: boolean; role: "owner" | "member" }
  | { ok: false; response: NextResponse };

export async function requireTenantApi(): Promise<ApiTenantAuth> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.tenantId || !session.userId) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return {
    ok: true,
    tenantId: session.tenantId,
    userId: session.userId,
    isPlatformAdmin: session.isPlatformAdmin ?? false,
    role: session.role ?? "member",
  };
}

export async function requirePlatformAdminApi(): Promise<ApiTenantAuth> {
  const base = await requireTenantApi();
  if (!base.ok) return base;
  if (!base.isPlatformAdmin) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return base;
}
