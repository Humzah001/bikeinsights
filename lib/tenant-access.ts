import type { TenantBillingStatus } from "@/lib/db-platform";

export type TenantAccessSnapshot = {
  billing_status: TenantBillingStatus;
  trial_ends_at: string | null;
  access_paused: boolean;
  /** When billing_status is active and set, blocks login after this instant. */
  paid_access_ends_at: string | null;
};

/** If non-null, login should be blocked with this message (unless ops bypass). */
export function getTenantLoginBlockReason(tenant: TenantAccessSnapshot): string | null {
  if (tenant.access_paused) {
    return "This workspace is paused. Contact your administrator to renew or restore access.";
  }

  if (tenant.billing_status === "active") {
    if (tenant.paid_access_ends_at) {
      const end = new Date(tenant.paid_access_ends_at);
      if (!Number.isNaN(end.getTime()) && Date.now() > end.getTime()) {
        return "Your subscription period has ended. Please renew to continue using BikeInsights.";
      }
    }
    return null;
  }

  if (tenant.billing_status === "trial") {
    if (tenant.trial_ends_at) {
      const end = new Date(tenant.trial_ends_at);
      if (!Number.isNaN(end.getTime()) && Date.now() > end.getTime()) {
        return "Your trial has ended. Please subscribe or contact us to continue using BikeInsights.";
      }
    }
    return null;
  }

  if (tenant.billing_status === "past_due") {
    return "Your subscription payment is overdue. Please pay to restore access.";
  }

  if (tenant.billing_status === "canceled") {
    return "This workspace has been canceled. Contact support if you need access again.";
  }

  return null;
}
