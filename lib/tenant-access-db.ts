import { getSupabase } from "@/lib/supabase/server";
import type { TenantAccessSnapshot } from "@/lib/tenant-access";

/** Minimal tenant row for access checks (safe for Edge middleware; no Node-only deps). */
export async function fetchTenantAccessSnapshot(tenantId: string): Promise<TenantAccessSnapshot | null> {
  const { data, error } = await getSupabase()
    .from("tenants")
    .select("billing_status, trial_ends_at, access_paused, paid_access_ends_at")
    .eq("id", tenantId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as Record<string, unknown>;
  const trialRaw = row.trial_ends_at;
  const paidRaw = row.paid_access_ends_at;
  const br = String(row.billing_status ?? "trial");
  const allowed = ["trial", "active", "past_due", "canceled"] as const;
  const billing_status: TenantAccessSnapshot["billing_status"] = allowed.includes(br as (typeof allowed)[number])
    ? (br as TenantAccessSnapshot["billing_status"])
    : "trial";

  return {
    billing_status,
    trial_ends_at:
      trialRaw != null && trialRaw !== "" ? new Date(String(trialRaw)).toISOString() : null,
    access_paused: Boolean(row.access_paused),
    paid_access_ends_at:
      paidRaw != null && paidRaw !== "" ? new Date(String(paidRaw)).toISOString() : null,
  };
}
