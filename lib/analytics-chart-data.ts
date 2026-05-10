import {
  eachMonthOfInterval,
  endOfDay,
  endOfMonth,
  format,
  max,
  min,
  parseISO,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import type { Bike, Expense, Rental, Repair } from "@/lib/types";
import { getCollectedRentAttributedToRange, rentalCountsTowardRevenue } from "@/lib/calculations";

export type AnalyticsChartBundle = {
  revenueVsExpenses: { month: string; revenue: number; expenses: number; profit: number }[];
  monthlyNetPnl: { month: string; profit: number }[];
  topEarningBikes: { name: string; revenue: number }[];
  costPerBike: { name: string; repairs: number; expenses: number; total: number }[];
  rentalDuration: { weeks: string; count: number }[];
  paymentOverTime: { month: string; paid: number; pending: number; partial: number }[];
  busiestMonths: { month: string; count: number }[];
  avgWeeklyRateByMonth: { month: string; avg: number }[];
};

function monthClip(
  month: Date,
  range: { start: Date; end: Date }
): { start: Date; end: Date } | null {
  const m0 = startOfMonth(month);
  const m1 = endOfMonth(month);
  const clipStart = max([m0, startOfDay(range.start)]);
  const clipEnd = min([m1, endOfDay(range.end)]);
  if (clipStart.getTime() > clipEnd.getTime()) return null;
  return { start: clipStart, end: clipEnd };
}

/** Inclusive rolling window ending `now` (or last 12 calendar months when preset is `"12"`). */
export function getAnalyticsRange(preset: string, now: Date): { start: Date; end: Date } {
  const end = endOfDay(now);
  if (preset === "12") {
    return { start: startOfMonth(subMonths(now, 11)), end };
  }
  const days = Number(preset);
  if (!Number.isFinite(days) || days <= 0) {
    return { start: startOfMonth(subMonths(now, 11)), end };
  }
  return { start: startOfDay(subDays(now, days - 1)), end };
}

export function getAnalyticsMonthStarts(
  preset: string,
  now: Date,
  range: { start: Date; end: Date }
): Date[] {
  if (preset === "12") {
    return Array.from({ length: 12 }, (_, i) => startOfMonth(subMonths(now, 11 - i)));
  }
  return eachMonthOfInterval({
    start: startOfMonth(range.start),
    end: endOfMonth(range.end),
  });
}

export function buildAnalyticsChartData(
  rentals: Rental[],
  repairs: Repair[],
  expenses: Expense[],
  bikes: Bike[],
  preset: string,
  now: Date
): AnalyticsChartBundle {
  const range = getAnalyticsRange(preset, now);
  const months = getAnalyticsMonthStarts(preset, now, range);

  const revenueVsExpenses = months.map((month) => {
    const clip = monthClip(month, range);
    if (!clip) {
      return { month: format(month, "MMM yy"), revenue: 0, expenses: 0, profit: 0 };
    }
    const revenue = rentals
      .filter((r) => rentalCountsTowardRevenue(r))
      .reduce((sum, r) => sum + getCollectedRentAttributedToRange(r, clip.start, clip.end), 0);
    const repCost = repairs
      .filter((r) => {
        const d = parseISO(r.repair_date);
        return d >= clip.start && d <= clip.end;
      })
      .reduce((sum, r) => sum + Number(r.cost), 0);
    const expCost = expenses
      .filter((e) => {
        const d = parseISO(e.date);
        return d >= clip.start && d <= clip.end;
      })
      .reduce((sum, e) => sum + Number(e.amount), 0);
    const expensesTot = repCost + expCost;
    return {
      month: format(month, "MMM yy"),
      revenue,
      expenses: expensesTot,
      profit: revenue - expensesTot,
    };
  });

  const monthlyNetPnl = revenueVsExpenses.map(({ month, profit }) => ({ month, profit }));

  const topEarningBikes = bikes
    .map((b) => ({
      name: b.name,
      revenue: rentals
        .filter((r) => r.bike_id === b.id && rentalCountsTowardRevenue(r))
        .reduce((sum, r) => sum + getCollectedRentAttributedToRange(r, range.start, range.end), 0),
    }))
    .filter((x) => x.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const costPerBike = bikes
    .map((b) => {
      const rep = repairs
        .filter((r) => {
          if (r.bike_id !== b.id) return false;
          const d = parseISO(r.repair_date);
          return d >= startOfDay(range.start) && d <= endOfDay(range.end);
        })
        .reduce((s, r) => s + Number(r.cost), 0);
      const exp = expenses
        .filter((e) => {
          if (e.bike_id !== b.id) return false;
          const d = parseISO(e.date);
          return d >= startOfDay(range.start) && d <= endOfDay(range.end);
        })
        .reduce((s, e) => s + Number(e.amount), 0);
      return { name: b.name, repairs: rep, expenses: exp, total: rep + exp };
    })
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const durationBuckets = { "1": 0, "2": 0, "3": 0, "4+": 0 };
  for (const r of rentals) {
    const sd = parseISO(r.start_date);
    if (sd < startOfDay(range.start) || sd > endOfDay(range.end)) continue;
    const w = Number(r.weeks) || 0;
    if (w <= 1) durationBuckets["1"]++;
    else if (w <= 2) durationBuckets["2"]++;
    else if (w <= 3) durationBuckets["3"]++;
    else durationBuckets["4+"]++;
  }
  const rentalDuration = [
    { weeks: "1 week", count: durationBuckets["1"] },
    { weeks: "2 weeks", count: durationBuckets["2"] },
    { weeks: "3 weeks", count: durationBuckets["3"] },
    { weeks: "4+ weeks", count: durationBuckets["4+"] },
  ];

  const paymentOverTime = months.map((month) => {
    const clip = monthClip(month, range);
    if (!clip) {
      return { month: format(month, "MMM yy"), paid: 0, pending: 0, partial: 0 };
    }
    const monthRentals = rentals.filter((r) => {
      const d = parseISO(r.created_at);
      return d >= clip.start && d <= clip.end;
    });
    return {
      month: format(month, "MMM yy"),
      paid: monthRentals.filter((r) => r.payment_status === "paid").length,
      pending: monthRentals.filter((r) => r.payment_status === "pending").length,
      partial: monthRentals.filter((r) => r.payment_status === "partial").length,
    };
  });

  const busiestMonths = months.map((month) => {
    const clip = monthClip(month, range);
    if (!clip) {
      return { month: format(month, "MMM yy"), count: 0 };
    }
    const count = rentals.filter((r) => {
      const d = parseISO(r.start_date);
      return d >= clip.start && d <= clip.end;
    }).length;
    return { month: format(month, "MMM yy"), count };
  });

  const avgWeeklyRateByMonth = months.map((month) => {
    const clip = monthClip(month, range);
    if (!clip) {
      return { month: format(month, "MMM yy"), avg: 0 };
    }
    const monthRentals = rentals.filter((r) => {
      const d = parseISO(r.start_date);
      return d >= clip.start && d <= clip.end;
    });
    const avg =
      monthRentals.length > 0
        ? monthRentals.reduce((s, r) => s + Number(r.weekly_rate), 0) / monthRentals.length
        : 0;
    return { month: format(month, "MMM yy"), avg: Math.round(avg * 100) / 100 };
  });

  return {
    revenueVsExpenses,
    monthlyNetPnl,
    topEarningBikes,
    costPerBike,
    rentalDuration,
    paymentOverTime,
    busiestMonths,
    avgWeeklyRateByMonth,
  };
}
