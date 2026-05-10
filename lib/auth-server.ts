import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export interface TenantAuthContext {
  userId: string;
  email?: string;
  tenantId: string;
  role: "owner" | "member";
  isPlatformAdmin: boolean;
}

export async function getTenantAuthOrRedirect(): Promise<TenantAuthContext> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.tenantId || !session.userId) {
    redirect("/login");
  }
  return {
    userId: session.userId,
    email: session.email,
    tenantId: session.tenantId,
    role: session.role ?? "member",
    isPlatformAdmin: session.isPlatformAdmin ?? false,
  };
}

export async function requirePlatformAdminOrRedirect(): Promise<TenantAuthContext> {
  const ctx = await getTenantAuthOrRedirect();
  if (!ctx.isPlatformAdmin) {
    redirect("/dashboard");
  }
  return ctx;
}
