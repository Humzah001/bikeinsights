import { NextResponse } from "next/server";
import { requireTenantApi } from "@/lib/api-session";
import * as platformDb from "@/lib/db-platform";
import { normalizeTenantCurrencySymbol } from "@/lib/tenant-currency";

function isValidEmail(s: string): boolean {
  const t = s.trim();
  if (!t) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

export async function GET() {
  const auth = await requireTenantApi();
  if (!auth.ok) return auth.response;

  try {
    const tenant = await platformDb.getTenantById(auth.tenantId);
    if (!tenant) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }
    return NextResponse.json({
      businessName: tenant.name,
      ownerName: tenant.owner_display_name,
      currencySymbol: tenant.currency_symbol,
      defaultWeeklyRate: tenant.default_weekly_rate,
      notificationEmail: tenant.notification_email,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireTenantApi();
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const patch: Parameters<typeof platformDb.updateTenantUiPreferences>[1] = {};

    if (typeof body.businessName === "string") {
      patch.name = body.businessName.trim().slice(0, 200);
    }
    if (typeof body.ownerName === "string") {
      patch.owner_display_name = body.ownerName.trim().slice(0, 200);
    }
    if (typeof body.currencySymbol === "string") {
      patch.currency_symbol = normalizeTenantCurrencySymbol(body.currencySymbol);
    }
    if (body.defaultWeeklyRate !== undefined) {
      const n = Number(body.defaultWeeklyRate);
      if (!Number.isFinite(n) || n < 0 || n > 999_999) {
        return NextResponse.json({ error: "defaultWeeklyRate must be between 0 and 999999" }, { status: 400 });
      }
      patch.default_weekly_rate = n;
    }
    if (typeof body.notificationEmail === "string") {
      const em = body.notificationEmail.trim().slice(0, 320);
      if (!isValidEmail(em)) {
        return NextResponse.json({ error: "Invalid notification email" }, { status: 400 });
      }
      patch.notification_email = em;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const tenant = await platformDb.updateTenantUiPreferences(auth.tenantId, patch);
    return NextResponse.json({
      businessName: tenant.name,
      ownerName: tenant.owner_display_name,
      currencySymbol: tenant.currency_symbol,
      defaultWeeklyRate: tenant.default_weekly_rate,
      notificationEmail: tenant.notification_email,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
