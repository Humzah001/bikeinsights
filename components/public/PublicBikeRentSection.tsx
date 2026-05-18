"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Bike } from "@/lib/types";
import { activeRentPackages } from "@/lib/rent-packages";
import { formatCurrency } from "@/lib/calculations";
import { BikeWeeklyRentLines } from "@/components/bikes/EbikeSpecsPanel";
import { RentPackageBatteryBlurb } from "@/components/bikes/RentPackageBatteryBlurb";
import { cn } from "@/lib/utils";

function PublicRentPackagePicker({
  bike,
  currencySymbol,
  defaultPackageId,
  className,
}: {
  bike: Bike;
  currencySymbol: string;
  defaultPackageId?: string;
  className?: string;
}) {
  const tiers = useMemo(() => activeRentPackages({ rent_packages: bike.rent_packages }), [bike.rent_packages]);
  const pathname = usePathname();
  const router = useRouter();
  const validDefault =
    defaultPackageId && tiers.some((t) => t.id === defaultPackageId) ? defaultPackageId : tiers[0]?.id ?? "";
  const [selectedId, setSelectedId] = useState(validDefault);

  useEffect(() => {
    setSelectedId(validDefault);
  }, [bike.id, validDefault]);

  if (tiers.length === 0) return null;

  function select(id: string) {
    setSelectedId(id);
    router.replace(`${pathname}?pkg=${encodeURIComponent(id)}`, { scroll: false });
  }

  return (
    <div className={cn("space-y-4", className)}>
      <p className="text-sm font-semibold text-foreground">Choose a package</p>
      <ul className="space-y-3" role="listbox" aria-label="Rent packages">
        {tiers.map((t) => {
          const on = t.id === selectedId;
          return (
            <li key={t.id}>
              <button
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => select(t.id)}
                className={cn(
                  "flex w-full flex-col items-stretch rounded-lg border-2 px-4 py-3 text-left transition-colors",
                  on ? "border-primary bg-primary/10 ring-2 ring-primary/25" : "border-border bg-card hover:bg-muted/50"
                )}
              >
                <span className="text-base font-bold text-foreground">{t.title.trim() || "Package"}</span>
                {t.description?.trim() ? (
                  <span className="mt-1 text-sm leading-relaxed text-foreground/85">{t.description.trim()}</span>
                ) : null}
                <span className="mt-2 text-lg font-bold tabular-nums text-foreground">
                  {formatCurrency(Number(t.weekly_rate || 0), currencySymbol)}
                  <span className="text-base font-semibold text-muted-foreground">/week</span>
                </span>
                <RentPackageBatteryBlurb
                  pkg={t}
                  size="prominent"
                  title=""
                  className="mt-3 border-border/80 bg-muted/40 px-3 py-3"
                />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Single-tier bikes use a simple price block; multiple priced packages show an interactive picker (optional `?pkg=` deep link). */
export function PublicBikeRentSection({
  bike,
  currencySymbol,
  defaultPackageId,
  className,
}: {
  bike: Bike;
  currencySymbol: string;
  defaultPackageId?: string;
  className?: string;
}) {
  const n = activeRentPackages({ rent_packages: bike.rent_packages }).length;
  if (n > 1) {
    return (
      <PublicRentPackagePicker
        bike={bike}
        currencySymbol={currencySymbol}
        defaultPackageId={defaultPackageId}
        className={className}
      />
    );
  }
  return (
    <BikeWeeklyRentLines
      bike={bike}
      currencySymbol={currencySymbol}
      className={className}
      specsSize="prominent"
    />
  );
}
