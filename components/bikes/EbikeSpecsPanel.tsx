import { formatCurrency } from "@/lib/calculations";
import type { Bike } from "@/lib/types";
import { activeRentPackages, rentPackageHasDetailRows } from "@/lib/rent-packages";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { RentPackageBatteryBlurb } from "@/components/bikes/RentPackageBatteryBlurb";

export function bikeHasEbikeListingFields(bike: Bike): boolean {
  const tyresMotor = [bike.tyre_size, bike.frame_height_cm, bike.motor_power_w].some((v) => String(v ?? "").trim() !== "");
  if (tyresMotor) return true;
  return activeRentPackages({ rent_packages: bike.rent_packages }).some(rentPackageHasDetailRows);
}

export type BikeRentTier = {
  key: string;
  title: string;
  description?: string;
  weekly: number;
};

/** Active rent options: priced rows from `rent_packages` in display order. */
export function getBikeRentTiers(bike: Bike): BikeRentTier[] {
  return activeRentPackages({ rent_packages: bike.rent_packages }).map((p) => ({
    key: p.id,
    title: p.title.trim() || "Package",
    description: p.description?.trim() || undefined,
    weekly: Number(p.weekly_rate || 0),
  }));
}

/** All configured weekly prices (for cards / public). */
export function BikeWeeklyRentLines({
  bike,
  currencySymbol,
  className,
  specsSize = "default",
}: {
  bike: Bike;
  currencySymbol: string;
  className?: string;
  /** Larger battery/range block for public fleet detail */
  specsSize?: "default" | "prominent";
}) {
  const tiers = getBikeRentTiers(bike);
  if (tiers.length === 0) {
    return (
      <div className={className}>
        <p className="text-muted-foreground">No weekly rate set</p>
      </div>
    );
  }
  if (tiers.length === 1) {
    const t = tiers[0];
    const showTitle = t.title.length > 0 && t.title.toLowerCase() !== "standard";
    const pkgs = activeRentPackages({ rent_packages: bike.rent_packages });
    const pkg = pkgs[0];
    const titleClass = specsSize === "prominent" ? "text-sm font-semibold text-foreground" : "text-xs font-medium text-muted-foreground";
    const priceMain = specsSize === "prominent" ? "text-xl font-bold" : "font-semibold";
    const descClass = specsSize === "prominent" ? "text-sm text-foreground/85" : "text-sm leading-snug text-muted-foreground";
    return (
      <div className={className}>
        {showTitle ? <p className={titleClass}>{t.title}</p> : null}
        <p className={specsSize === "prominent" ? "mt-1" : ""}>
          <span className={cn(priceMain, "tabular-nums")}>{formatCurrency(t.weekly, currencySymbol)}</span>
          <span className={specsSize === "prominent" ? "text-base text-muted-foreground" : "text-muted-foreground"}>
            /week
          </span>
        </p>
        {t.description ? <p className={cn(specsSize === "prominent" ? "mt-2" : "mt-0.5", descClass)}>{t.description}</p> : null}
        {pkg ? <RentPackageBatteryBlurb pkg={pkg} className="mt-3" size={specsSize} /> : null}
      </div>
    );
  }

  return (
    <ul className={cn("space-y-2.5", className)} aria-label="Weekly rent options">
      {tiers.map((t) => (
        <li key={t.key} className="border-b border-border/60 pb-2.5 last:border-0 last:pb-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.title}</p>
          {t.description ? (
            <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{t.description}</p>
          ) : null}
          <p className="mt-1">
            <span className="font-semibold tabular-nums">{formatCurrency(t.weekly, currencySymbol)}</span>
            <span className="text-muted-foreground">/week</span>
          </p>
        </li>
      ))}
    </ul>
  );
}

export function EbikeSpecsPanel({ bike, title = "E-bike & sizing" }: { bike: Bike; title?: string }) {
  const priced = activeRentPackages({ rent_packages: bike.rent_packages });
  const packageSpecCards = priced.filter(rentPackageHasDetailRows);
  const showPackageSpecs = packageSpecCards.length > 0;

  const rows: { label: string; value: string }[] = [];
  if (bike.tyre_size?.trim()) rows.push({ label: "Tyre size", value: bike.tyre_size.trim() });
  if (bike.frame_height_cm?.trim()) rows.push({ label: "Frame / height", value: `${bike.frame_height_cm.trim()} cm` });
  if (bike.motor_power_w?.trim()) rows.push({ label: "Motor", value: `${bike.motor_power_w.trim()} W` });

  if (rows.length === 0 && !showPackageSpecs) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Tyre size, frame height, and motor apply to the whole bike. Estimated range and batteries are set per rent
          package when they differ by tier.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length > 0 ? (
          <dl className="grid gap-3 sm:grid-cols-2">
            {rows.map((r) => (
              <div key={r.label} className="rounded-md border border-border/80 bg-muted/25 px-4 py-3">
                <dt className="text-sm font-semibold text-foreground/80">{r.label}</dt>
                <dd className="mt-1 text-base font-semibold text-foreground">{r.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {showPackageSpecs ? (
          <div className="space-y-3">
            <p className="text-base font-semibold text-foreground">Range &amp; batteries by package</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {packageSpecCards.map((p) => (
                <div key={p.id} className="rounded-md border border-border/80 bg-muted/20 px-4 py-3">
                  <p className="text-base font-semibold text-foreground">{p.title.trim() || "Package"}</p>
                  <RentPackageBatteryBlurb
                    pkg={p}
                    className="mt-3 border border-border/70 bg-muted/40 px-3 py-3"
                    title=""
                    size="prominent"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
