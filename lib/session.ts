import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import type { SessionData } from "@/lib/iron-session-config";
import { ironSessionOptions } from "@/lib/iron-session-config";
import { BUILDIT4ME_TENANT_ID } from "@/lib/buildit4me-tenant";

export type { SessionData } from "@/lib/iron-session-config";
export { ironSessionOptions } from "@/lib/iron-session-config";

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, ironSessionOptions);
}

/** Buildit4me ops: shared ADMIN_PASSWORD (no email). Full platform admin + primary tenant workspace. */
export async function loginSessionBuildit4meEnvPassword() {
  const session = await getSession();
  session.userId = "buildit4me-env-admin";
  session.tenantId = BUILDIT4ME_TENANT_ID;
  session.role = "owner";
  session.isPlatformAdmin = true;
  session.isLoggedIn = true;
  session.lastActivity = Date.now();
  session.email = undefined;
  await session.save();
}

export async function loginSessionTenantUser(opts: {
  userId: string;
  email: string;
  tenantId: string;
  role: "owner" | "member";
  isPlatformAdmin: boolean;
}) {
  const session = await getSession();
  session.userId = opts.userId;
  session.email = opts.email;
  session.tenantId = opts.tenantId;
  session.role = opts.role;
  session.isPlatformAdmin = opts.isPlatformAdmin;
  session.isLoggedIn = true;
  session.lastActivity = Date.now();
  await session.save();
}

export async function logoutSession() {
  const session = await getSession();
  session.destroy();
  await session.save();
}
