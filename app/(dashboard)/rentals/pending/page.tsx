import { ensureOverdueRentalsUpdated, ensureWeeklyRentNotifications } from "@/lib/notifications";
import * as db from "@/lib/db";
import { rentalHasUnpaidRentDueOnOrBeforeToday } from "@/lib/calculations";
import { PendingClient } from "./PendingClient";
import { getTenantAuthOrRedirect } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export default async function PendingRentalsPage() {
  const { tenantId } = await getTenantAuthOrRedirect();
  await ensureOverdueRentalsUpdated(tenantId);
  await ensureWeeklyRentNotifications(tenantId);
  const rentals = await db.getRentals(tenantId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdue = rentals.filter((r) => r.status === "overdue" && r.payment_status !== "paid");
  const pendingPayment = rentals.filter((r) => {
    if (
      r.status === "inactive" ||
      r.status === "overdue" ||
      (r.payment_status !== "pending" && r.payment_status !== "partial")
    ) {
      return false;
    }
    const ctx = {
      start_date: r.start_date,
      weeks: r.weeks,
      weekly_rate: r.weekly_rate,
      amount_paid: r.amount_paid,
      rent_collection_date: r.rent_collection_date,
    };
    return rentalHasUnpaidRentDueOnOrBeforeToday(ctx, today);
  });

  const totalOutstanding = [...overdue, ...pendingPayment].reduce(
    (sum, r) => sum + Math.max(0, Number(r.total_amount) - Number(r.amount_paid || 0)),
    0
  );
  const oldestOverdueDays = overdue.length
    ? Math.max(
        ...overdue.map((r) => {
          const end = new Date(r.end_date);
          end.setHours(0, 0, 0, 0);
          return Math.floor((today.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));
        })
      )
    : 0;

  return (
    <PendingClient
      overdueRentals={overdue}
      pendingPaymentRentals={pendingPayment}
      totalOutstanding={totalOutstanding}
      pendingCount={pendingPayment.length}
      overdueCount={overdue.length}
      oldestOverdueDays={oldestOverdueDays}
    />
  );
}
