import { createHash } from "crypto";
import { addDays } from "date-fns";
import { getSupabase } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";
import { BUILDIT4ME_TENANT_ID, DEFAULT_TRIAL_DAYS } from "@/lib/buildit4me-tenant";
import { normalizeTenantCurrencySymbol } from "@/lib/tenant-currency";

export type TenantBillingStatus = "trial" | "active" | "past_due" | "canceled";

export interface TenantRow {
  id: string;
  name: string;
  slug: string;
  billing_status: TenantBillingStatus;
  notes: string;
  /** When set and billing_status is trial, login blocked after this instant. */
  trial_ends_at: string | null;
  /** Admin pause — blocks all workspace access until cleared. */
  access_paused: boolean;
  /** When billing_status is active and set, login blocked after this instant; null = no fixed end. */
  paid_access_ends_at: string | null;
  owner_display_name: string;
  currency_symbol: string;
  default_weekly_rate: number;
  notification_email: string;
  created_at: string;
}

export interface AppUserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  phone: string;
  is_platform_admin: boolean;
  created_at: string;
}

export interface InvitationRow {
  id: string;
  tenant_id: string;
  email: string;
  token_hash: string;
  role: "owner" | "member";
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  invitee_name: string;
  invitee_phone: string;
}

export function hashInviteToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export async function countAppUsers(): Promise<number> {
  const { count, error } = await getSupabase()
    .from("app_users")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function getAppUserByEmail(email: string): Promise<AppUserRow | null> {
  const normalized = email.trim().toLowerCase();
  const { data, error } = await getSupabase().from("app_users").select("*").eq("email", normalized).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToAppUser(data as Record<string, unknown>);
}

export async function getAppUserById(id: string): Promise<AppUserRow | null> {
  const { data, error } = await getSupabase().from("app_users").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToAppUser(data as Record<string, unknown>);
}

export async function createAppUser(row: {
  id?: string;
  email: string;
  password_hash: string;
  display_name?: string;
  phone?: string;
  is_platform_admin?: boolean;
}): Promise<AppUserRow> {
  const id = row.id ?? `usr-${uuidv4().slice(0, 12)}`;
  const payload = {
    id,
    email: row.email.trim().toLowerCase(),
    password_hash: row.password_hash,
    display_name: row.display_name ?? "",
    phone: row.phone ?? "",
    is_platform_admin: row.is_platform_admin ?? false,
  };
  const { data, error } = await getSupabase().from("app_users").insert(payload).select().single();
  if (error) throw error;
  return rowToAppUser(data as Record<string, unknown>);
}

export async function deleteAppUser(id: string): Promise<void> {
  const { error } = await getSupabase().from("app_users").delete().eq("id", id);
  if (error) throw error;
}

export async function updateAppUser(
  userId: string,
  patch: { password_hash?: string; display_name?: string; phone?: string }
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (patch.password_hash !== undefined) payload.password_hash = patch.password_hash;
  if (patch.display_name !== undefined) payload.display_name = patch.display_name;
  if (patch.phone !== undefined) payload.phone = patch.phone;
  if (Object.keys(payload).length === 0) return;
  const { error } = await getSupabase().from("app_users").update(payload).eq("id", userId);
  if (error) throw error;
}

export async function addTenantMember(tenantId: string, userId: string, role: "owner" | "member"): Promise<void> {
  const { error } = await getSupabase().from("tenant_members").insert({ tenant_id: tenantId, user_id: userId, role });
  if (error) throw error;
}

export async function removeTenantMember(tenantId: string, userId: string): Promise<void> {
  const { error } = await getSupabase().from("tenant_members").delete().eq("tenant_id", tenantId).eq("user_id", userId);
  if (error) throw error;
}

export async function getMembership(tenantId: string, userId: string): Promise<{ role: "owner" | "member" } | null> {
  const { data, error } = await getSupabase()
    .from("tenant_members")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { role: (data as { role: string }).role as "owner" | "member" };
}

/** All workspaces this user belongs to. */
export async function listTenantMembershipsForUser(
  userId: string
): Promise<{ tenant_id: string; role: "owner" | "member" }[]> {
  const { data, error } = await getSupabase().from("tenant_members").select("tenant_id, role").eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((row: { tenant_id: string; role: string }) => ({
    tenant_id: row.tenant_id,
    role: row.role as "owner" | "member",
  }));
}

/** Prefer default workspace when present (e.g. platform admin). */
export async function getPrimaryTenantForUser(userId: string): Promise<{ tenant_id: string; role: "owner" | "member" } | null> {
  const rows = await listTenantMembershipsForUser(userId);
  if (rows.length === 0) return null;
  const def = rows.find((r) => r.tenant_id === BUILDIT4ME_TENANT_ID);
  return def ?? rows[0];
}

export async function listTenants(): Promise<TenantRow[]> {
  const { data, error } = await getSupabase().from("tenants").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => rowToTenant(r as Record<string, unknown>));
}

export async function getTenantById(id: string): Promise<TenantRow | null> {
  const { data, error } = await getSupabase().from("tenants").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToTenant(data as Record<string, unknown>);
}

export async function createTenant(row: {
  id?: string;
  name: string;
  slug?: string;
  billing_status?: TenantBillingStatus;
  /** Used when billing_status is trial (default TRIAL_DAYS env or 15). */
  trial_days?: number;
  /** When billing_status is active: paid access ends after this many days from now; omit for unlimited. */
  paid_access_days?: number | null;
}): Promise<TenantRow> {
  const id = row.id ?? `tenant-${uuidv4().slice(0, 12)}`;
  const slug = (row.slug ?? row.name).toLowerCase().replace(/\s+/g, "-").slice(0, 80) || id;
  const billing_status = row.billing_status ?? "trial";
  const trial_days = row.trial_days ?? DEFAULT_TRIAL_DAYS;
  let trial_ends_at: string | null = null;
  let paid_access_ends_at: string | null = null;
  if (billing_status === "trial") {
    trial_ends_at = addDays(new Date(), trial_days).toISOString();
  }
  if (billing_status === "active" && row.paid_access_days != null && row.paid_access_days > 0) {
    paid_access_ends_at = addDays(new Date(), Math.floor(row.paid_access_days)).toISOString();
  }
  const payload = {
    id,
    name: row.name,
    slug,
    billing_status,
    notes: "",
    trial_ends_at,
    access_paused: false,
    paid_access_ends_at,
    owner_display_name: "",
    currency_symbol: "£",
    default_weekly_rate: 80,
    notification_email: "",
  };
  const { data, error } = await getSupabase().from("tenants").insert(payload).select().single();
  if (error) throw error;
  return rowToTenant(data as Record<string, unknown>);
}

export async function updateTenantBilling(id: string, billing_status: TenantBillingStatus): Promise<TenantRow> {
  const patch: Record<string, unknown> = { billing_status };
  if (billing_status === "active") {
    patch.trial_ends_at = null;
  } else if (billing_status === "trial") {
    patch.trial_ends_at = addDays(new Date(), DEFAULT_TRIAL_DAYS).toISOString();
    patch.paid_access_ends_at = null;
  } else {
    patch.trial_ends_at = null;
  }
  const { data, error } = await getSupabase().from("tenants").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return rowToTenant(data as Record<string, unknown>);
}

export async function setTenantAccessPaused(id: string, access_paused: boolean): Promise<TenantRow> {
  const { data, error } = await getSupabase()
    .from("tenants")
    .update({ access_paused })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToTenant(data as Record<string, unknown>);
}

/** Extend paid access by `days` from max(now, current paid_access_ends_at). Sets billing to active and clears pause. */
export async function extendTenantPaidAccess(id: string, days: number): Promise<TenantRow> {
  const n = Math.floor(days);
  if (!(n > 0)) throw new Error("grant days must be a positive integer");
  const tenant = await getTenantById(id);
  if (!tenant) throw new Error("Workspace not found");
  const base =
    tenant.paid_access_ends_at && new Date(tenant.paid_access_ends_at).getTime() > Date.now()
      ? new Date(tenant.paid_access_ends_at)
      : new Date();
  const paid_access_ends_at = addDays(base, n).toISOString();
  const { data, error } = await getSupabase()
    .from("tenants")
    .update({
      paid_access_ends_at,
      billing_status: "active",
      access_paused: false,
      trial_ends_at: null,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToTenant(data as Record<string, unknown>);
}

export async function updateTenantUiPreferences(
  id: string,
  patch: {
    name?: string;
    owner_display_name?: string;
    currency_symbol?: string;
    default_weekly_rate?: number;
    notification_email?: string;
  }
): Promise<TenantRow> {
  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.owner_display_name !== undefined) payload.owner_display_name = patch.owner_display_name;
  if (patch.currency_symbol !== undefined) payload.currency_symbol = patch.currency_symbol;
  if (patch.default_weekly_rate !== undefined) payload.default_weekly_rate = patch.default_weekly_rate;
  if (patch.notification_email !== undefined) payload.notification_email = patch.notification_email;
  const { data, error } = await getSupabase().from("tenants").update(payload).eq("id", id).select().single();
  if (error) throw error;
  return rowToTenant(data as Record<string, unknown>);
}

export async function deleteTenant(id: string): Promise<void> {
  const { error } = await getSupabase().from("tenants").delete().eq("id", id);
  if (error) throw error;
}

export async function createInvitation(row: {
  tenant_id: string;
  email: string;
  token_hash: string;
  role?: "owner" | "member";
  expires_at: string;
  invitee_name?: string;
  invitee_phone?: string;
}): Promise<InvitationRow> {
  const id = `inv-${uuidv4().slice(0, 12)}`;
  const payload = {
    id,
    tenant_id: row.tenant_id,
    email: row.email.trim().toLowerCase(),
    token_hash: row.token_hash,
    role: row.role ?? "owner",
    expires_at: row.expires_at,
    invitee_name: row.invitee_name?.trim() ?? "",
    invitee_phone: row.invitee_phone?.trim() ?? "",
  };
  const { data, error } = await getSupabase().from("invitations").insert(payload).select().single();
  if (error) throw error;
  return rowToInvitation(data as Record<string, unknown>);
}

export async function getInvitationByTokenHash(tokenHash: string): Promise<InvitationRow | null> {
  const { data, error } = await getSupabase().from("invitations").select("*").eq("token_hash", tokenHash).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToInvitation(data as Record<string, unknown>);
}

export async function markInvitationAccepted(id: string): Promise<void> {
  const { error } = await getSupabase().from("invitations").update({ accepted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function listInvitationsForTenant(tenantId: string): Promise<InvitationRow[]> {
  const { data, error } = await getSupabase()
    .from("invitations")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => rowToInvitation(r as Record<string, unknown>));
}

export async function deleteInvitation(id: string): Promise<void> {
  const { error } = await getSupabase().from("invitations").delete().eq("id", id);
  if (error) throw error;
}

export async function getInvitationById(id: string): Promise<InvitationRow | null> {
  const { data, error } = await getSupabase().from("invitations").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToInvitation(data as Record<string, unknown>);
}

export async function listMembersWithEmails(tenantId: string): Promise<
  { user_id: string; email: string; display_name: string; phone: string; role: string }[]
> {
  const { data: members, error: e1 } = await getSupabase().from("tenant_members").select("user_id, role").eq("tenant_id", tenantId);
  if (e1) throw e1;
  const ids = (members ?? []).map((m: { user_id: string }) => m.user_id);
  if (ids.length === 0) return [];
  const { data: users, error: e2 } = await getSupabase().from("app_users").select("id, email, display_name, phone").in("id", ids);
  if (e2) throw e2;
  const byId = new Map(
    (users ?? []).map((u: { id: string; email: string; display_name: string; phone: string }) => [u.id, u])
  );
  return (members ?? []).map((m: { user_id: string; role: string }) => {
    const u = byId.get(m.user_id);
    return {
      user_id: m.user_id,
      role: m.role,
      email: u?.email ?? "",
      display_name: u?.display_name ?? "",
      phone: u?.phone ?? "",
    };
  });
}

function rowToTenant(r: Record<string, unknown>): TenantRow {
  const trialRaw = r.trial_ends_at;
  const paidRaw = r.paid_access_ends_at;
  const billingRaw = r.billing_status;
  const allowed: TenantBillingStatus[] = ["trial", "active", "past_due", "canceled"];
  const billing_status = allowed.includes(billingRaw as TenantBillingStatus)
    ? (billingRaw as TenantBillingStatus)
    : "trial";
  return {
    id: String(r.id ?? ""),
    name: String(r.name ?? ""),
    slug: String(r.slug ?? ""),
    billing_status,
    notes: String(r.notes ?? ""),
    trial_ends_at:
      trialRaw != null && trialRaw !== ""
        ? new Date(trialRaw as string).toISOString()
        : null,
    access_paused: Boolean(r.access_paused),
    paid_access_ends_at:
      paidRaw != null && paidRaw !== ""
        ? new Date(paidRaw as string).toISOString()
        : null,
    owner_display_name: String(r.owner_display_name ?? ""),
    currency_symbol: normalizeCurrencySymbol(r.currency_symbol),
    default_weekly_rate: normalizeWeeklyRate(r.default_weekly_rate),
    notification_email: String(r.notification_email ?? ""),
    created_at: r.created_at ? new Date(r.created_at as string).toISOString() : new Date().toISOString(),
  };
}

function normalizeCurrencySymbol(raw: unknown): string {
  return normalizeTenantCurrencySymbol(raw);
}

function normalizeWeeklyRate(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 80;
  return Math.min(n, 999_999);
}

function rowToAppUser(r: Record<string, unknown>): AppUserRow {
  return {
    id: String(r.id ?? ""),
    email: String(r.email ?? ""),
    password_hash: String(r.password_hash ?? ""),
    display_name: String(r.display_name ?? ""),
    phone: String(r.phone ?? ""),
    is_platform_admin: Boolean(r.is_platform_admin),
    created_at: r.created_at ? new Date(r.created_at as string).toISOString() : new Date().toISOString(),
  };
}

function rowToInvitation(r: Record<string, unknown>): InvitationRow {
  return {
    id: String(r.id ?? ""),
    tenant_id: String(r.tenant_id ?? ""),
    email: String(r.email ?? ""),
    token_hash: String(r.token_hash ?? ""),
    role: (r.role as "owner" | "member") ?? "owner",
    expires_at: r.expires_at ? new Date(r.expires_at as string).toISOString() : "",
    accepted_at: r.accepted_at ? new Date(r.accepted_at as string).toISOString() : null,
    created_at: r.created_at ? new Date(r.created_at as string).toISOString() : new Date().toISOString(),
    invitee_name: String(r.invitee_name ?? ""),
    invitee_phone: String(r.invitee_phone ?? ""),
  };
}
