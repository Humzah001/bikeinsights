import * as db from "@/lib/db";
import { AnalyticsClient } from "./AnalyticsClient";
import { getTenantAuthOrRedirect } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const { tenantId } = await getTenantAuthOrRedirect();
  const [rentals, repairs, expenses, bikes] = await Promise.all([
    db.getRentals(tenantId),
    db.getRepairs(tenantId),
    db.getExpenses(tenantId),
    db.getBikes(tenantId),
  ]);

  return (
    <AnalyticsClient
      rentals={rentals}
      repairs={repairs}
      expenses={expenses}
      bikes={bikes}
    />
  );
}
