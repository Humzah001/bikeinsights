import { NextResponse } from "next/server";
import * as platformDb from "@/lib/db-platform";
import { hashPassword, verifyPassword } from "@/lib/password";
import { getSupabase } from "@/lib/supabase/server";
import { getTenantLoginBlockReason } from "@/lib/tenant-access";
import { loginSessionTenantUser } from "@/lib/session";
import { validateInviteAcceptProfile } from "@/lib/invite-profile";

function parseInvitePasswords(body: {
  password?: unknown;
  confirmPassword?: unknown;
}): { ok: true; password: string } | { ok: false; error: string } {
  const password = typeof body.password === "string" ? body.password : "";
  const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";
  if (!password || password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  if (password !== confirmPassword) {
    return { ok: false, error: "Password and confirmation must match." };
  }
  return { ok: true, password };
}

async function blockReasonForInviteTenant(tenantId: string, isPlatformAdmin: boolean): Promise<string | null> {
  const tenant = await platformDb.getTenantById(tenantId);
  if (!tenant) return "Workspace not found.";
  const msg = getTenantLoginBlockReason(tenant);
  if (msg && !isPlatformAdmin) return msg;
  return null;
}

async function completeInvitationMembership(
  invite: NonNullable<Awaited<ReturnType<typeof platformDb.getInvitationByTokenHash>>>,
  user: NonNullable<Awaited<ReturnType<typeof platformDb.getAppUserByEmail>>>
) {
  const existingMember = await platformDb.getMembership(invite.tenant_id, user.id);
  if (!existingMember) {
    await platformDb.addTenantMember(invite.tenant_id, user.id, invite.role);
  }

  await platformDb.markInvitationAccepted(invite.id);
}

async function establishInviteSession(
  invite: NonNullable<Awaited<ReturnType<typeof platformDb.getInvitationByTokenHash>>>,
  user: NonNullable<Awaited<ReturnType<typeof platformDb.getAppUserByEmail>>>
) {
  await loginSessionTenantUser({
    userId: user.id,
    email: user.email,
    tenantId: invite.tenant_id,
    role: invite.role,
    isPlatformAdmin: user.is_platform_admin,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const pwdParsed = parseInvitePasswords(body);
    if (!pwdParsed.ok) {
      return NextResponse.json({ error: pwdParsed.error }, { status: 400 });
    }
    const password = pwdParsed.password;

    const rawToken = typeof body.token === "string" ? body.token.trim() : "";
    const access_token = typeof body.access_token === "string" ? body.access_token.trim() : "";

    if (!rawToken) {
      return NextResponse.json({ error: "Invitation token required" }, { status: 400 });
    }

    const tokenHash = platformDb.hashInviteToken(rawToken);
    const invite = await platformDb.getInvitationByTokenHash(tokenHash);
    if (!invite) {
      return NextResponse.json({ error: "Invalid or used invitation" }, { status: 400 });
    }
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: "Invitation expired" }, { status: 400 });
    }

    const email = invite.email.trim().toLowerCase();
    const displayNameRaw = typeof body.displayName === "string" ? body.displayName.trim() : "";
    const phoneRaw = typeof body.phone === "string" ? body.phone : "";

    const profileErr = validateInviteAcceptProfile(displayNameRaw, phoneRaw);
    if (profileErr) {
      return NextResponse.json({ error: profileErr }, { status: 400 });
    }

    const phoneStored = phoneRaw.trim();

    if (invite.accepted_at) {
      if (!access_token) {
        return NextResponse.json(
          { error: "This invitation was already accepted. Sign in from the login page." },
          { status: 400 }
        );
      }
      const supabase = getSupabase();
      const { data: authData, error: authErr } = await supabase.auth.getUser(access_token);
      if (authErr || !authData.user?.email) {
        return NextResponse.json(
          { error: "Invalid or expired sign-in. Open the link from your invitation email again." },
          { status: 401 }
        );
      }
      const authEmail = authData.user.email.trim().toLowerCase();
      if (authEmail !== email) {
        return NextResponse.json({ error: "Signed-in account does not match this invitation." }, { status: 403 });
      }
      const user = await platformDb.getAppUserByEmail(email);
      if (!user) {
        return NextResponse.json({ error: "Invalid or used invitation" }, { status: 400 });
      }
      const member = await platformDb.getMembership(invite.tenant_id, user.id);
      if (!member) {
        return NextResponse.json({ error: "Invalid or used invitation" }, { status: 400 });
      }
      const block = await blockReasonForInviteTenant(invite.tenant_id, user.is_platform_admin);
      if (block) {
        return NextResponse.json({ error: block, code: "WORKSPACE_BLOCKED" }, { status: 402 });
      }

      await platformDb.updateAppUser(user.id, {
        password_hash: hashPassword(password),
        display_name: displayNameRaw,
        phone: phoneStored,
      });
      const fresh = await platformDb.getAppUserByEmail(email);
      if (!fresh) {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
      }
      await establishInviteSession(invite, fresh);

      return NextResponse.json({ ok: true, tenantId: invite.tenant_id });
    }

    if (access_token) {
      const supabase = getSupabase();
      const { data: authData, error: authErr } = await supabase.auth.getUser(access_token);
      if (authErr || !authData.user?.email) {
        return NextResponse.json(
          { error: "Invalid or expired sign-in. Open the link from your invitation email again." },
          { status: 401 }
        );
      }
      const authEmail = authData.user.email.trim().toLowerCase();
      if (authEmail !== email) {
        return NextResponse.json({ error: "Signed-in account does not match this invitation." }, { status: 403 });
      }

      const hashed = hashPassword(password);

      let user = await platformDb.getAppUserByEmail(email);
      if (!user) {
        user = await platformDb.createAppUser({
          email,
          password_hash: hashed,
          display_name: displayNameRaw,
          phone: phoneStored,
          is_platform_admin: false,
        });
      } else {
        await platformDb.updateAppUser(user.id, {
          password_hash: hashed,
          display_name: displayNameRaw,
          phone: phoneStored,
        });
        user = await platformDb.getAppUserByEmail(email);
        if (!user) {
          return NextResponse.json({ error: "Server error" }, { status: 500 });
        }
      }

      const block = await blockReasonForInviteTenant(invite.tenant_id, user.is_platform_admin);
      if (block) {
        return NextResponse.json({ error: block, code: "WORKSPACE_BLOCKED" }, { status: 402 });
      }

      await completeInvitationMembership(invite, user);
      await establishInviteSession(invite, user);

      return NextResponse.json({ ok: true, tenantId: invite.tenant_id });
    }

    let user = await platformDb.getAppUserByEmail(email);

    if (!user) {
      user = await platformDb.createAppUser({
        email,
        password_hash: hashPassword(password),
        display_name: displayNameRaw,
        phone: phoneStored,
        is_platform_admin: false,
      });
    } else {
      if (!user.password_hash) {
        await platformDb.updateAppUser(user.id, {
          password_hash: hashPassword(password),
          display_name: displayNameRaw,
          phone: phoneStored,
        });
        user = await platformDb.getAppUserByEmail(email);
        if (!user) {
          return NextResponse.json({ error: "Server error" }, { status: 500 });
        }
      } else {
        if (!verifyPassword(password, user.password_hash)) {
          return NextResponse.json(
            {
              error:
                "Invalid password for this email. Use the password you set previously or open the invitation email link again.",
            },
            { status: 401 }
          );
        }
        await platformDb.updateAppUser(user.id, {
          display_name: displayNameRaw,
          phone: phoneStored,
        });
        user = await platformDb.getAppUserByEmail(email);
        if (!user) {
          return NextResponse.json({ error: "Server error" }, { status: 500 });
        }
      }
    }

    const blockPwd = await blockReasonForInviteTenant(invite.tenant_id, user.is_platform_admin);
    if (blockPwd) {
      return NextResponse.json({ error: blockPwd, code: "WORKSPACE_BLOCKED" }, { status: 402 });
    }

    await completeInvitationMembership(invite, user);
    await establishInviteSession(invite, user);

    return NextResponse.json({ ok: true, tenantId: invite.tenant_id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
