import { redirect } from "next/navigation";
import { ensureOverdueRentalsUpdated, ensureWeeklyRentNotifications } from "@/lib/notifications";
import { readCSV } from "@/lib/csv";
import type { Rental } from "@/lib/types";
import { PendingClient } from "./PendingClient";

export const dynamic = "force-dynamic";

export default async function PendingRentalsPage() {
  await ensureOverdueRentalsUpdated();
  await ensureWeeklyRentNotifications();
  const rentals = await readCSV<Rental>("rentals.csv");

  const overdue = rentals.filter((r) => r.status === "overdue");
  const pendingPayment = rentals.filter(
    (r) => (r.payment_status === "pending" || r.payment_status === "partial") && r.status !== "overdue"
  );

  const totalOutstanding = rentals
    .filter((r) => r.payment_status !== "paid")
    .reduce(
      (sum, r) => sum + Math.max(0, Number(r.total_amount) - Number(r.amount_paid || 0)),
      0
    );
  const oldestOverdueDays = overdue.length
    ? Math.max(
        ...overdue.map((r) => {
          const end = new Date(r.end_date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
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
