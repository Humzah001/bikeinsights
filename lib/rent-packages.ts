import { v4 as uuidv4 } from "uuid";
import type { BikeRentPackage } from "@/lib/types";

export const MAX_RENT_PACKAGES = 12;

function emptyPackageExtraFields(): Pick<
  BikeRentPackage,
  "battery_count" | "battery_1_capacity_wh" | "battery_2_capacity_wh" | "max_range_km"
> {
  return { battery_count: "", battery_1_capacity_wh: "", battery_2_capacity_wh: "", max_range_km: "" };
}

export function defaultRentPackages(): BikeRentPackage[] {
  return [
    {
      id: uuidv4(),
      title: "Standard",
      description: "",
      weekly_rate: "",
      ...emptyPackageExtraFields(),
    },
  ];
}

function normalizeBatteryCount(raw: unknown): "" | "1" | "2" {
  const s = String(raw ?? "").trim();
  return s === "1" || s === "2" ? s : "";
}

function normalizeMaxRangeKmString(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (s === "") return "";
  if (!Number.isFinite(Number(s))) return "";
  return s;
}

function coercePackage(raw: Record<string, unknown>): BikeRentPackage | null {
  const id = String(raw.id ?? "").trim() || uuidv4();
  const title = String(raw.title ?? "").trim();
  const description = String(raw.description ?? "").trim();
  let weekly_rate = String(raw.weekly_rate ?? "").trim();
  if (weekly_rate !== "" && !Number.isFinite(Number(weekly_rate))) weekly_rate = "";
  const battery_count = normalizeBatteryCount(raw.battery_count);
  let battery_1_capacity_wh = String(raw.battery_1_capacity_wh ?? "").trim();
  let battery_2_capacity_wh = String(raw.battery_2_capacity_wh ?? "").trim();
  let c = battery_count;
  if (c === "" && (battery_1_capacity_wh || battery_2_capacity_wh)) {
    if (battery_1_capacity_wh && battery_2_capacity_wh) c = "2";
    else {
      c = "1";
      if (!battery_1_capacity_wh && battery_2_capacity_wh) {
        battery_1_capacity_wh = battery_2_capacity_wh;
        battery_2_capacity_wh = "";
      }
    }
  }
  if (c === "1") battery_2_capacity_wh = "";
  if (c === "") {
    battery_1_capacity_wh = "";
    battery_2_capacity_wh = "";
  }
  const max_range_km = normalizeMaxRangeKmString(raw.max_range_km);
  return {
    id,
    title,
    description,
    weekly_rate,
    battery_count: c,
    battery_1_capacity_wh,
    battery_2_capacity_wh,
    max_range_km,
  };
}

/** Parse DB JSONB / API JSON into a safe array (fixes missing ids). */
export function parseRentPackages(raw: unknown): BikeRentPackage[] {
  let arr: unknown[] = [];
  if (raw == null) return [];
  if (Array.isArray(raw)) arr = raw;
  else if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) arr = parsed;
    } catch {
      return [];
    }
  } else return [];

  const out: BikeRentPackage[] = [];
  for (const item of arr) {
    if (typeof item !== "object" || item === null) continue;
    const p = coercePackage(item as Record<string, unknown>);
    if (p) out.push(p);
  }
  return out.slice(0, MAX_RENT_PACKAGES);
}

export function normalizeRentPackageBatteryFields(p: BikeRentPackage): BikeRentPackage {
  let battery_count = p.battery_count === "1" || p.battery_count === "2" ? p.battery_count : "";
  let battery_1_capacity_wh = String(p.battery_1_capacity_wh ?? "").trim();
  let battery_2_capacity_wh = String(p.battery_2_capacity_wh ?? "").trim();
  if (battery_count === "" && (battery_1_capacity_wh || battery_2_capacity_wh)) {
    if (battery_1_capacity_wh && battery_2_capacity_wh) battery_count = "2";
    else {
      battery_count = "1";
      if (!battery_1_capacity_wh && battery_2_capacity_wh) {
        battery_1_capacity_wh = battery_2_capacity_wh;
        battery_2_capacity_wh = "";
      }
    }
  }
  if (battery_count === "1") battery_2_capacity_wh = "";
  if (battery_count === "") {
    battery_1_capacity_wh = "";
    battery_2_capacity_wh = "";
  }
  const c: BikeRentPackage["battery_count"] = battery_count === "1" || battery_count === "2" ? battery_count : "";
  const max_range_km = normalizeMaxRangeKmString(p.max_range_km);
  return { ...p, battery_count: c, battery_1_capacity_wh, battery_2_capacity_wh, max_range_km };
}

/** Drop empty rows; ensure at least one row if all empty (for form UX). */
export function normalizeRentPackagesForSave(input: unknown): BikeRentPackage[] {
  const parsed = parseRentPackages(input);
  const kept = parsed.filter((p) => p.title !== "" || p.description !== "" || p.weekly_rate !== "");
  const base = kept.length === 0 ? defaultRentPackages() : kept;
  return base.map(normalizeRentPackageBatteryFields).slice(0, MAX_RENT_PACKAGES);
}

/** List packages with a positive weekly rate (public / cards). */
export function activeRentPackages(bike: { rent_packages: BikeRentPackage[] }): BikeRentPackage[] {
  return bike.rent_packages.filter((p) => Number(p.weekly_rate || 0) > 0);
}

/** First positive weekly rate for legacy `weekly_rate` column / rentals. */
export function primaryWeeklyRateFromPackages(packages: BikeRentPackage[]): string {
  for (const p of packages) {
    const n = Number(p.weekly_rate || 0);
    if (n > 0) return String(n);
  }
  return "0";
}

/** Human-readable battery lines (guest-facing). */
export function rentPackageBatteryRows(pkg: BikeRentPackage): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  const c = pkg.battery_count === "1" || pkg.battery_count === "2" ? pkg.battery_count : "";
  const w1 = pkg.battery_1_capacity_wh?.trim();
  const w2 = pkg.battery_2_capacity_wh?.trim();
  if (c === "1") {
    if (w1) rows.push({ label: "Battery", value: `${w1} Wh` });
    else rows.push({ label: "Batteries", value: "1 included" });
  } else if (c === "2") {
    if (w1) rows.push({ label: "Battery 1", value: `${w1} Wh` });
    if (w2) rows.push({ label: "Battery 2", value: `${w2} Wh` });
    if (!w1 && !w2) rows.push({ label: "Batteries", value: "2 included" });
  }
  return rows;
}

/** Battery + estimated range lines for listings (guest-facing). */
export function rentPackageDetailRows(pkg: BikeRentPackage): { label: string; value: string }[] {
  const rows = [...rentPackageBatteryRows(pkg)];
  const km = normalizeMaxRangeKmString(pkg.max_range_km);
  if (km) rows.push({ label: "Est. range", value: `~${km} km` });
  return rows;
}

export function rentPackageHasDetailRows(pkg: BikeRentPackage): boolean {
  return rentPackageDetailRows(pkg).length > 0;
}

/** @deprecated Use rentPackageHasDetailRows */
export function rentPackageHasBatteryDetails(pkg: BikeRentPackage): boolean {
  return rentPackageHasDetailRows(pkg);
}

/** If DB still has bike-level battery columns (pre-migration 018), show them on the first package. */
function hoistBikeBatteriesIntoFirstPackageIfNeeded(packages: BikeRentPackage[], r: Record<string, unknown>): BikeRentPackage[] {
  if (packages.length === 0) return packages;
  const first = packages[0];
  if (first.battery_count === "1" || first.battery_count === "2") return packages;
  if (first.battery_1_capacity_wh?.trim() || first.battery_2_capacity_wh?.trim()) return packages;
  const bcRaw = String(r.battery_count ?? "").trim();
  let mergedCount: "" | "1" | "2" = bcRaw === "1" || bcRaw === "2" ? bcRaw : "";
  let b1 = String(r.battery_1_capacity_wh ?? "").trim();
  let b2 = String(r.battery_2_capacity_wh ?? "").trim();
  if (!mergedCount && !b1 && !b2) return packages;
  if (!mergedCount) {
    if (b1 && b2) mergedCount = "2";
    else mergedCount = "1";
  }
  if (mergedCount === "1" && !b1 && b2) {
    b1 = b2;
    b2 = "";
  }
  if (mergedCount === "1") b2 = "";
  const patched: BikeRentPackage = {
    ...first,
    battery_count: mergedCount,
    battery_1_capacity_wh: b1,
    battery_2_capacity_wh: b2,
  };
  return [patched, ...packages.slice(1)];
}

/** If DB still has bike-level max_range_km (pre-migration 019), copy to first package when missing. */
function hoistBikeRangeIntoFirstPackageIfNeeded(packages: BikeRentPackage[], r: Record<string, unknown>): BikeRentPackage[] {
  if (packages.length === 0) return packages;
  const first = packages[0];
  if (normalizeMaxRangeKmString(first.max_range_km)) return packages;
  const rk = normalizeMaxRangeKmString(r.max_range_km);
  if (!rk) return packages;
  const patched: BikeRentPackage = { ...first, max_range_km: rk };
  return [patched, ...packages.slice(1)];
}

/** When `rent_packages` is empty, build from legacy columns if still present (before migration 017). */
export function rentPackagesFromLegacyRow(r: Record<string, unknown>): BikeRentPackage[] {
  const parsed = parseRentPackages(r.rent_packages);
  const base = parsed.length > 0 ? parsed : rentPackagesFromLegacyBike({
    rent_packages: [],
    weekly_rate: String(r.weekly_rate ?? "0"),
    battery_note_standard: String(r.battery_note_standard ?? ""),
    weekly_rate_one_battery: String(r.weekly_rate_one_battery ?? ""),
    battery_note_one: String(r.battery_note_one ?? ""),
    weekly_rate_extended: String(r.weekly_rate_extended ?? ""),
    battery_note_extended: String(r.battery_note_extended ?? ""),
  });
  return hoistBikeRangeIntoFirstPackageIfNeeded(hoistBikeBatteriesIntoFirstPackageIfNeeded(base, r), r);
}

function rentPackagesFromLegacyBike(bike: {
  rent_packages: BikeRentPackage[];
  weekly_rate: string;
  battery_note_standard: string;
  weekly_rate_one_battery: string;
  battery_note_one: string;
  weekly_rate_extended: string;
  battery_note_extended: string;
}): BikeRentPackage[] {
  const bat = emptyPackageExtraFields();
  const out: BikeRentPackage[] = [];
  const std = Number(bike.weekly_rate || 0);
  if (std > 0) {
    out.push({
      id: uuidv4(),
      title: "Standard",
      description: bike.battery_note_standard || "",
      weekly_rate: String(std),
      ...bat,
    });
  }
  const one = Number(bike.weekly_rate_one_battery || 0);
  if (one > 0) {
    out.push({
      id: uuidv4(),
      title: "One battery",
      description: bike.battery_note_one || "",
      weekly_rate: String(one),
      ...bat,
    });
  }
  const ext = Number(bike.weekly_rate_extended || 0);
  if (ext > 0) {
    out.push({
      id: uuidv4(),
      title: "Larger batteries",
      description: bike.battery_note_extended || "",
      weekly_rate: String(ext),
      ...bat,
    });
  }
  return out.length > 0 ? out : defaultRentPackages();
}
