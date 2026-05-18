import type { BikeRentPackage } from "@/lib/types";
import { rentPackageDetailRows, rentPackageHasDetailRows } from "@/lib/rent-packages";
import { cn } from "@/lib/utils";

export function RentPackageBatteryBlurb({
  pkg,
  className,
  title = "Battery & range",
  size = "default",
}: {
  pkg: BikeRentPackage;
  className?: string;
  /** Section heading when content exists */
  title?: string;
  /** `prominent` — larger type for public fleet detail pages */
  size?: "default" | "prominent";
}) {
  if (!rentPackageHasDetailRows(pkg)) return null;
  const rows = rentPackageDetailRows(pkg);
  const titleClass =
    size === "prominent"
      ? "text-sm font-semibold tracking-wide text-foreground"
      : "text-xs font-semibold text-muted-foreground";
  const rowLabelClass = size === "prominent" ? "font-semibold text-foreground" : "font-medium";
  const rowValueClass = size === "prominent" ? "text-foreground/90" : "text-muted-foreground";
  const listClass = size === "prominent" ? "space-y-1.5 text-base leading-snug" : "space-y-1 text-sm text-foreground";
  return (
    <div className={cn("rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5", className)}>
      {title ? <p className={cn(titleClass, "mb-2")}>{title}</p> : null}
      <ul className={cn(listClass, title && size === "default" ? "mt-2" : "")}>
        {rows.map((r) => (
          <li key={r.label}>
            <span className={rowLabelClass}>{r.label}:</span>{" "}
            <span className={rowValueClass}>{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
