/** Primary ops workspace id (matches `tenants.id` after migrations). Override with BUILDIT4ME_TENANT_ID. */
export const BUILDIT4ME_TENANT_ID = process.env.BUILDIT4ME_TENANT_ID ?? "tenant-buildit4me";

/** Default trial length when inviting with billing “trial”. */
export const DEFAULT_TRIAL_DAYS = Number(process.env.TRIAL_DAYS ?? "15") || 15;
