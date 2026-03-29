import * as db from "@/lib/db";
import { ensureOverdueRentalsUpdated, ensureWeeklyRentNotifications } from "@/lib/notifications";
import type { Bike, Rental, Repair, Expense } from "@/lib/types";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfWeek,
  endOfWeek,
  addWeeks,
} from "date-fns";
import { getMonthKey } from "@/lib/calculations";
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

function parseViewMonth(monthParam: string | undefined, fallback: Date): Date {
  if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) return startOfMonth(fallback);
  const [y, m] = monthParam.split("-").map(Number);
  if (m < 1 || m > 12 || y < 2000 || y > 2100) return startOfMonth(fallback);
  return new Date(y, m - 1, 1);
}

function rentalCountsTowardRevenue(r: Rental): boolean {
  return (
    r.status === "completed" ||
    r.status === "active" ||
    r.status === "overdue" ||
    r.status === "inactive"
  );
}

function rentalOverlapsRange(r: Rental, rangeStart: Date, rangeEnd: Date): boolean {
  const s = parseISO(r.start_date);
  const e = parseISO(r.end_date);
  return s <= rangeEnd && e >= rangeStart;
}

/** Collected rent (by rental start date in range) minus repairs + expenses (by their dates). */
function profitInRange(
  rentals: Rental[],
  repairs: Repair[],
  expenses: Expense[],
  rangeStart: Date,
  rangeEnd: Date
): { revenue: number; expenses: number; profit: number } {
  const revenue = rentals
    .filter((r) => {
      const s = parseISO(r.start_date);
      return s >= rangeStart && s <= rangeEnd && rentalCountsTowardRevenue(r);
    })
    .reduce((sum, r) => sum + Number(r.amount_paid || 0), 0);

  const repairCosts = repairs
    .filter((r) => {
      const d = parseISO(r.repair_date);
      return d >= rangeStart && d <= rangeEnd;
    })
    .reduce((sum, r) => sum + Number(r.cost), 0);

  const expenseCosts = expenses
    .filter((e) => {
      const d = parseISO(e.date);
      return d >= rangeStart && d <= rangeEnd;
    })
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const expensesTotal = repairCosts + expenseCosts;
  return { revenue, expenses: expensesTotal, profit: revenue - expensesTotal };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const viewAnchor = parseViewMonth(sp.month, now);
  const viewMonthStart = startOfMonth(viewAnchor);
  const viewMonthEnd = endOfMonth(viewAnchor);
  const viewMonthKey = format(viewMonthStart, "yyyy-MM");
  const isViewingCurrentMonth = getMonthKey(viewMonthStart) === getMonthKey(now);

  await ensureOverdueRentalsUpdated();
  await ensureWeeklyRentNotifications();
  const [bikes, rentals, repairs, expenses] = await Promise.all([
    db.getBikes(),
    db.getRentals(),
    db.getRepairs(),
    db.getExpenses(),
  ]);

  let monthOptions = Array.from({ length: 36 }, (_, i) => {
    const d = subMonths(now, 35 - i);
    return { value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy") };
  });
  if (!monthOptions.some((o) => o.value === viewMonthKey)) {
    monthOptions = [...monthOptions, { value: viewMonthKey, label: format(viewMonthStart, "MMMM yyyy") }].sort(
      (a, b) => a.value.localeCompare(b.value)
    );
  }

  const profitSelectedMonth = profitInRange(rentals, repairs, expenses, viewMonthStart, viewMonthEnd);

  const weeklyBars: { week: string; revenue: number; expenses: number; profit: number }[] = [];
  let wCursor = startOfWeek(viewMonthStart, { weekStartsOn: 1 });
  while (wCursor <= viewMonthEnd) {
    const wkEnd = endOfWeek(wCursor, { weekStartsOn: 1 });
    if (wkEnd >= viewMonthStart) {
      const p = profitInRange(rentals, repairs, expenses, wCursor, wkEnd);
      weeklyBars.push({
        week: format(wCursor, "d MMM"),
        revenue: p.revenue,
        expenses: p.expenses,
        profit: p.profit,
      });
    }
    wCursor = addWeeks(wCursor, 1);
  }

  const profitWeeksInMonth = weeklyBars.reduce(
    (a, w) => ({
      revenue: a.revenue + w.revenue,
      expenses: a.expenses + w.expenses,
      profit: a.profit + w.profit,
    }),
    { revenue: 0, expenses: 0, profit: 0 }
  );

  const weekRangeLabel =
    weeklyBars.length > 0
      ? `${weeklyBars.length} week${weeklyBars.length !== 1 ? "s" : ""} in ${format(viewMonthStart, "MMMM yyyy")}`
      : format(viewMonthStart, "MMMM yyyy");

  const last12Months = Array.from({ length: 12 }, (_, i) => {
    const monthDate = subMonths(viewMonthStart, 11 - i);
    const ms = startOfMonth(monthDate);
    const me = endOfMonth(monthDate);
    const p = profitInRange(rentals, repairs, expenses, ms, me);
    return {
      month: format(monthDate, "MMM yy"),
      revenue: p.revenue,
      expenses: p.expenses,
      profit: p.profit,
    };
  });

  const endYear = viewMonthStart.getFullYear();
  const last6Years = Array.from({ length: 6 }, (_, i) => {
    const year = endYear - 5 + i;
    const ys = new Date(year, 0, 1);
    const ye = new Date(year, 11, 31, 23, 59, 59, 999);
    const p = profitInRange(rentals, repairs, expenses, ys, ye);
    return { year: String(year), revenue: p.revenue, expenses: p.expenses, profit: p.profit };
  });

  const yearStart = new Date(viewMonthStart.getFullYear(), 0, 1);
  const yearEnd = new Date(viewMonthStart.getFullYear(), 11, 31, 23, 59, 59, 999);
  const profitSelectedYear = profitInRange(rentals, repairs, expenses, yearStart, yearEnd);

  const activeRentalsLive = rentals.filter((r) => r.status === "active").length;
  const overdueRentals = rentals.filter((r) => r.status === "overdue").length;
  const pendingPaymentsLive = rentals.filter((r) => r.payment_status === "pending").length;

  const rentalsOverlappingView = rentals.filter((r) => rentalOverlapsRange(r, viewMonthStart, viewMonthEnd)).length;

  const pendingStartedInView = rentals.filter((r) => {
    const s = parseISO(r.start_date);
    return s >= viewMonthStart && s <= viewMonthEnd && r.payment_status === "pending";
  }).length;

  const activeRentalsKpi = isViewingCurrentMonth ? activeRentalsLive : rentalsOverlappingView;
  const pendingPaymentsKpi = isViewingCurrentMonth ? pendingPaymentsLive : pendingStartedInView;

  const totalBikes = bikes.length;
  const availableBikes = bikes.filter((b) => b.status === "available").length;
  const rentedBikes = bikes.filter((b) => b.status === "rented").length;
  const repairBikes = bikes.filter((b) => b.status === "under_repair").length;

  const bikeStatusCounts = {
    available: availableBikes,
    rented: rentedBikes,
    under_repair: repairBikes,
    retired: bikes.filter((b) => b.status === "retired").length,
  };

  const revenueByBike = bikes
    .map((b) => {
      const total = rentals
        .filter(
          (r) =>
            r.bike_id === b.id &&
            rentalCountsTowardRevenue(r) &&
            parseISO(r.start_date) >= viewMonthStart &&
            parseISO(r.start_date) <= viewMonthEnd
        )
        .reduce((sum, r) => sum + Number(r.amount_paid || 0), 0);
      return { name: b.name, revenue: total };
    })
    .filter((x) => x.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const rentalsStartedInView = rentals.filter((r) => {
    const s = parseISO(r.start_date);
    return s >= viewMonthStart && s <= viewMonthEnd;
  });
  const paymentStatusCounts = {
    paid: rentalsStartedInView.filter((r) => r.payment_status === "paid").length,
    pending: rentalsStartedInView.filter((r) => r.payment_status === "pending").length,
    partial: rentalsStartedInView.filter((r) => r.payment_status === "partial").length,
  };

  const expenseByCategory = expenses
    .filter((e) => {
      const d = parseISO(e.date);
      return d >= viewMonthStart && d <= viewMonthEnd;
    })
    .reduce<Record<string, number>>((acc, e) => {
      const cat = e.category || "other";
      acc[cat] = (acc[cat] || 0) + Number(e.amount);
      return acc;
    }, {});

  const recentRentals = [...rentals]
    .filter((r) => {
      const s = parseISO(r.start_date);
      return s >= viewMonthStart && s <= viewMonthEnd;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const pendingRentalsForTable = [...rentals]
    .filter((r) => {
      const s = parseISO(r.start_date);
      const startedInView = s >= viewMonthStart && s <= viewMonthEnd;
      return (
        startedInView &&
        r.status !== "inactive" &&
        r.status !== "completed" &&
        r.payment_status !== "paid" &&
        (r.payment_status === "pending" || r.payment_status === "partial" || r.status === "overdue")
      );
    })
    .sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime())
    .slice(0, 5);

  const recentRepairs = [...repairs]
    .filter((r) => {
      const d = parseISO(r.repair_date);
      return d >= viewMonthStart && d <= viewMonthEnd;
    })
    .sort((a, b) => new Date(b.repair_date).getTime() - new Date(a.repair_date).getTime())
    .slice(0, 5);

  const pendingRepairCount = repairs.filter((r) => r.status === "pending" || r.status === "in_progress").length;

  const monthRangeLabel = format(viewMonthStart, "MMMM yyyy");

  return (
    <DashboardClient
      monthSelect={{ value: viewMonthKey, options: monthOptions }}
      isViewingCurrentMonth={isViewingCurrentMonth}
      viewingMonthLabel={monthRangeLabel}
      kpis={{
        revenueThisMonth: profitSelectedMonth.revenue,
        activeRentals: activeRentalsKpi,
        pendingPayments: pendingPaymentsKpi,
        totalBikes,
        availableBikes,
        rentedBikes,
        repairBikes,
        totalExpensesThisMonth: profitSelectedMonth.expenses,
        netProfitThisMonth: profitSelectedMonth.profit,
      }}
      kpiCopy={{
        rentTitle: "Collected rent",
        rentSubtitle: monthRangeLabel,
        activeSubtitle: isViewingCurrentMonth ? "Live" : "Rental periods overlapping this month",
        pendingSubtitle: isViewingCurrentMonth ? "Live" : "Started this month, still pending",
        fleetSubtitle: isViewingCurrentMonth ? undefined : "Today’s fleet (not historical)",
        expensesTitle: "Expenses",
        profitTitle: "Net profit",
      }}
      profitSummaries={{
        week: profitWeeksInMonth,
        month: profitSelectedMonth,
        year: profitSelectedYear,
      }}
      weekRangeLabel={weekRangeLabel}
      monthRangeLabel={monthRangeLabel}
      yearSummaryLabel={String(endYear)}
      weeklyData={weeklyBars}
      monthlyData={last12Months}
      yearlyData={last6Years}
      weeklyChartFootnote={`Calendar weeks overlapping ${monthRangeLabel}.`}
      monthlyChartFootnote={`Twelve months ending at ${monthRangeLabel}.`}
      yearlyChartFootnote={`Six calendar years ending ${endYear}.`}
      bikeStatusCounts={bikeStatusCounts}
      revenueByBike={revenueByBike}
      paymentStatusCounts={paymentStatusCounts}
      expenseByCategory={expenseByCategory}
      recentRentals={recentRentals}
      pendingRentals={pendingRentalsForTable}
      recentRepairs={recentRepairs}
      overdueCount={isViewingCurrentMonth ? overdueRentals : 0}
      pendingPaymentCount={isViewingCurrentMonth ? pendingPaymentsLive : 0}
      pendingRepairCount={isViewingCurrentMonth ? pendingRepairCount : 0}
      pieChartTitles={{
        payment: `Payment status (rentals starting ${monthRangeLabel})`,
        expense: `Expenses by category (${monthRangeLabel})`,
      }}
    />
  );
}
