/** Allowed currency symbols for tenant dashboards (settings dropdown only). */
export const TENANT_CURRENCY_OPTIONS = [
  { value: "£", label: "Pound (£)" },
  { value: "€", label: "Euro (€)" },
  { value: "$", label: "Dollar ($)" },
] as const;

export type TenantCurrencySymbol = (typeof TENANT_CURRENCY_OPTIONS)[number]["value"];

const ALLOWED = new Set<string>(TENANT_CURRENCY_OPTIONS.map((o) => o.value));

export function normalizeTenantCurrencySymbol(raw: unknown): TenantCurrencySymbol {
  const t = String(raw ?? "").trim();
  return ALLOWED.has(t) ? (t as TenantCurrencySymbol) : "£";
}
