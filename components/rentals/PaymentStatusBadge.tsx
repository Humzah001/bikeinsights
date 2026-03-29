import { cn } from "@/lib/utils";
import type { RentalStatus, PaymentStatus } from "@/lib/types";

const statusClass: Record<RentalStatus, string> = {
  active: "bg-green-500/20 text-green-600 dark:text-green-400",
  completed: "bg-muted text-muted-foreground",
  overdue: "bg-red-500/20 text-red-600 dark:text-red-400",
  inactive: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
};

const paymentClass: Record<PaymentStatus, string> = {
  paid: "bg-green-500/20 text-green-600 dark:text-green-400",
  pending: "bg-red-500/20 text-red-600 dark:text-red-400",
  partial: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
};

export function RentalStatusBadge({ status }: { status: RentalStatus }) {
  const label = status === "inactive" ? "paid up" : status;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        statusClass[status]
      )}
    >
      {label}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        paymentClass[status]
      )}
    >
      {status}
    </span>
  );
}
