import { cn } from "@/lib/utils";
import type { BikeStatus } from "@/lib/types";

const statusClass: Record<BikeStatus, string> = {
  available: "bg-green-500/20 text-green-600 dark:text-green-400",
  rented: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
  under_repair: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
  retired: "bg-muted text-muted-foreground",
};

export function BikeStatusBadge({ status }: { status: BikeStatus }) {
  const label = status.replace("_", " ");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        statusClass[status]
      )}
    >
      {label}
    </span>
  );
}
