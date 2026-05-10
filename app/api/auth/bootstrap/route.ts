import { NextResponse } from "next/server";
import * as platformDb from "@/lib/db-platform";
import { hashPassword } from "@/lib/password";
import { BUILDIT4ME_TENANT_ID } from "@/lib/buildit4me-tenant";

/** One-time: create first platform admin when `app_users` is empty. Set SAAS_BOOTSTRAP_SECRET in env. */
export async function POST(request: Request) {
  try {
    const secret = process.env.SAAS_BOOTSTRAP_SECRET;
    if (!secret || secret.length < 16) {
      return NextResponse.json({ error: "Bootstrap not configured" }, { status: 503 });
    }

    const body = await request.json();
    if (body.bootstrapSecret !== secret) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password || password.length < 8) {
      return NextResponse.json({ error: "Valid email and password (8+ chars) required" }, { status: 400 });
    }

    const count = await platformDb.countAppUsers();
    if (count > 0) {
      return NextResponse.json({ error: "Bootstrap already completed" }, { status: 403 });
    }

    const user = await platformDb.createAppUser({
      email,
      password_hash: hashPassword(password),
      display_name: typeof body.displayName === "string" ? body.displayName : "",
      is_platform_admin: true,
    });

    await platformDb.addTenantMember(BUILDIT4ME_TENANT_ID, user.id, "owner");

    return NextResponse.json({ ok: true, userId: user.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
