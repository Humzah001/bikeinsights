import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  loginSessionBuildit4meEnvPassword,
  loginSessionTenantUser,
} from "@/lib/session";
import * as platformDb from "@/lib/db-platform";
import { verifyPassword } from "@/lib/password";
import { BUILDIT4ME_TENANT_ID } from "@/lib/buildit4me-tenant";
import { getTenantLoginBlockReason } from "@/lib/tenant-access";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!password) {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminPassword && password === adminPassword && (!email || email === "")) {
      await loginSessionBuildit4meEnvPassword();
      return NextResponse.json({ ok: true, mode: "buildit4me-env" });
    }

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const user = await platformDb.getAppUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (user.password_hash) {
      if (!verifyPassword(password, user.password_hash)) {
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
      }
    } else {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !anon) {
        console.error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY for Supabase-backed users");
        return NextResponse.json(
          { error: "Sign-in is not configured for this account. Contact support." },
          { status: 503 }
        );
      }
      const sb = createClient(url, anon, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: authData, error: authErr } = await sb.auth.signInWithPassword({ email, password });
      if (authErr || !authData.user?.email || authData.user.email.trim().toLowerCase() !== email) {
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
      }
    }

    const memberships = await platformDb.listTenantMembershipsForUser(user.id);
    if (memberships.length === 0) {
      return NextResponse.json({ error: "No workspace assigned. Contact support." }, { status: 403 });
    }

    let picked = memberships.find((m) => m.tenant_id === BUILDIT4ME_TENANT_ID) ?? memberships[0];
    if (user.is_platform_admin) {
      const def = memberships.find((m) => m.tenant_id === BUILDIT4ME_TENANT_ID);
      if (def) picked = def;
    }

    const tenant = await platformDb.getTenantById(picked.tenant_id);
    if (!tenant) {
      return NextResponse.json({ error: "Workspace not found. Contact support." }, { status: 403 });
    }

    const blockMsg = getTenantLoginBlockReason(tenant);
    if (blockMsg && !user.is_platform_admin) {
      return NextResponse.json(
        { error: blockMsg, code: "PAYMENT_REQUIRED" },
        { status: 402 }
      );
    }

    await loginSessionTenantUser({
      userId: user.id,
      email: user.email,
      tenantId: picked.tenant_id,
      role: picked.role,
      isPlatformAdmin: user.is_platform_admin,
    });

    return NextResponse.json({ ok: true, mode: "user" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
