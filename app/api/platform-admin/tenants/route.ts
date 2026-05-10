import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { addDays, format } from "date-fns";
import { requirePlatformAdminApi } from "@/lib/api-session";
import * as platformDb from "@/lib/db-platform";
import type { TenantBillingStatus } from "@/lib/db-platform";
import { inviteAuthUserByEmail } from "@/lib/supabase-invite";
import { normalizePhoneDigits } from "@/lib/phone-normalize";
import { BUILDIT4ME_TENANT_ID } from "@/lib/buildit4me-tenant";
import { resolveInviteEmailLogoUrl } from "@/lib/invite-email-logo";

/** Prefer NEXT_PUBLIC_APP_URL; otherwise use the incoming request so dev ports match (e.g. :3001 vs default :3000). */
function resolveAppOrigin(request: NextRequest): string {
  const trimmed = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (trimmed) return trimmed;

  const xfHost = request.headers.get("x-forwarded-host");
  const xfProto = request.headers.get("x-forwarded-proto");
  if (xfHost) {
    const host = xfHost.split(",")[0].trim();
    const proto = (xfProto ?? "https").split(",")[0].trim();
    return `${proto}://${host}`;
  }

  return request.nextUrl.origin;
}

function inviteErrorHint(message: string): string | undefined {
  const m = message.toLowerCase();
  if (m.includes("error sending invite email") || m.includes("sending invite email")) {
    return "Mail failed at Supabase: Authentication → set up custom SMTP (recommended on Pro/production). Check Email Templates for invalid HTML/Go syntax. Dashboard → Logs → Postgres & Edge Functions for Auth mail errors.";
  }
  if (m.includes("redirect") || m.includes("redirect_to")) {
    return "Supabase → Authentication → URL Configuration → Redirect URLs must include /auth/callback on each origin (e.g. http://localhost:3001/auth/callback and https://your-domain/auth/callback). Wildcards like http://localhost:3001/** also work.";
  }
  if (m.includes("already registered") || m.includes("already been registered") || m.includes("user already exists")) {
    return "Authentication → Users: remove this email or use another address.";
  }
  if (m.includes("rate limit") || m.includes("email rate")) {
    return "Wait a few minutes or adjust Auth rate limits in Supabase.";
  }
  return undefined;
}

export async function GET() {
  const auth = await requirePlatformAdminApi();
  if (!auth.ok) return auth.response;

  try {
    const tenants = (await platformDb.listTenants()).filter((t) => t.id !== BUILDIT4ME_TENANT_ID);
    const withMembers = await Promise.all(
      tenants.map(async (t) => ({
        ...t,
        members: await platformDb.listMembersWithEmails(t.id),
        invitations: await platformDb.listInvitationsForTenant(t.id),
      }))
    );
    return NextResponse.json(withMembers);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to list workspaces" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePlatformAdminApi();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const tenantName = typeof body.tenantName === "string" ? body.tenantName.trim() : "";
    const inviteeName = typeof body.inviteeName === "string" ? body.inviteeName.trim() : "";
    const inviteePhone = typeof body.inviteePhone === "string" ? body.inviteePhone.trim() : "";
    if (!email || !tenantName) {
      return NextResponse.json({ error: "email and tenantName required" }, { status: 400 });
    }
    if (!inviteeName || inviteeName.length < 2) {
      return NextResponse.json({ error: "inviteeName required (full name, at least 2 characters)" }, { status: 400 });
    }
    if (!inviteePhone) {
      return NextResponse.json({ error: "inviteePhone required" }, { status: 400 });
    }
    if (normalizePhoneDigits(inviteePhone).length < 8) {
      return NextResponse.json({ error: "inviteePhone must contain at least 8 digits" }, { status: 400 });
    }

    const billingRaw = typeof body.billing_status === "string" ? body.billing_status.trim().toLowerCase() : "trial";
    const billing_status: TenantBillingStatus =
      billingRaw === "active" ? "active" : billingRaw === "trial" ? "trial" : "trial";

    function parsePositiveDays(key: string): number | undefined {
      const v = body[key];
      if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
      const n = Math.floor(v);
      return n > 0 ? n : undefined;
    }

    const trialDaysOpt = parsePositiveDays("trial_days");
    const paidAccessDaysOpt = parsePositiveDays("paid_access_days");

    const tenant = await platformDb.createTenant({
      name: tenantName,
      billing_status,
      ...(billing_status === "trial" && trialDaysOpt != null ? { trial_days: trialDaysOpt } : {}),
      ...(billing_status === "active" && paidAccessDaysOpt != null ? { paid_access_days: paidAccessDaysOpt } : {}),
    });
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = platformDb.hashInviteToken(rawToken);
    const expiresAt = addDays(new Date(), 14).toISOString();

    await platformDb.createInvitation({
      tenant_id: tenant.id,
      email,
      token_hash: tokenHash,
      role: "owner",
      expires_at: expiresAt,
      invitee_name: inviteeName,
      invitee_phone: inviteePhone,
    });

    const appOrigin = resolveAppOrigin(request);
    const inviteLink = `${appOrigin}/invite/accept?token=${encodeURIComponent(rawToken)}`;
    const supabaseAuthRedirect = `${appOrigin}/auth/callback`;

    let trial_summary = "";
    if (tenant.billing_status === "trial" && tenant.trial_ends_at) {
      const until = format(new Date(tenant.trial_ends_at), "PPP");
      trial_summary = `Your workspace trial runs until ${until}. After that you need an active subscription to sign in.`;
    } else if (tenant.billing_status === "active") {
      if (tenant.paid_access_ends_at) {
        const until = format(new Date(tenant.paid_access_ends_at), "PPP");
        trial_summary = `Your workspace access is paid until ${until}. Contact us to renew before then.`;
      } else {
        trial_summary = "Your workspace is active — full access (renewal managed manually).";
      }
    }

    const email_logo_url = resolveInviteEmailLogoUrl();

    const authInvite = await inviteAuthUserByEmail({
      email,
      redirectTo: supabaseAuthRedirect,
      userMetadata: {
        tenant_name: tenantName,
        tenant_id: tenant.id,
        billing_status: tenant.billing_status,
        invitee_name: inviteeName,
        invitee_phone: inviteePhone,
        /** Fallback when Supabase redirect_to is truncated to Site URL only — login page forwards using this + hash. */
        app_invite_token: rawToken,
        /** Supabase Storage public URL (see migration 012 + npm run storage:upload-email-logo). */
        ...(email_logo_url ? { email_logo_url } : {}),
        /** Fallback: logo served from app origin if bucket URL unavailable. */
        email_logo_origin: appOrigin,
        ...(trial_summary ? { trial_summary } : {}),
      },
    });

    if (!authInvite.ok) {
      console.warn(
        "[platform-admin invite] Supabase inviteUserByEmail failed:",
        authInvite.message,
        authInvite.status != null ? `status=${authInvite.status}` : "",
        authInvite.code ? `code=${authInvite.code}` : "",
        "redirectTo:",
        supabaseAuthRedirect,
        "manual:",
        inviteLink
      );
    }

    return NextResponse.json({
      ok: true,
      tenant,
      inviteLink,
      emailSent: authInvite.ok,
      emailError: authInvite.ok ? undefined : authInvite.message,
      emailHint: authInvite.ok ? undefined : inviteErrorHint(authInvite.message),
      emailStatus: authInvite.ok ? undefined : authInvite.status,
      emailCode: authInvite.ok ? undefined : authInvite.code,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Invite failed" }, { status: 500 });
  }
}
