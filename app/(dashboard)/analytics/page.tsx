import { readCSV } from "@/lib/csv";
import type { Rental, Repair, Expense, Bike } from "@/lib/types";
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { AnalyticsClient } from "./AnalyticsClient";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [rentals, repairs, expenses, bikes] = await Promise.all([
    readCSV<Rental>("rentals.csv"),
    readCSV<Repair>("repairs.csv"),
    readCSV<Expense>("expenses.csv"),
    readCSV<Bike>("bikes.csv"),
  ]);

  const now = new Date();
  const months12 = Array.from({ length: 12 }, (_, i) => subMonths(now, 11 - i));

  const revenueVsExpenses = months12.map((month) => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const revenue = rentals
      .filter((r) => {
        const d = parseISO(r.start_date);
        return d >= start && d <= end;
      })
      .reduce((sum, r) => sum + Number(r.amount_paid || 0), 0);
    const repCost = repairs
      .filter((r) => {
        const d = parseISO(r.repair_date);
        return d >= start && d <= end;
      })
      .reduce((sum, r) => sum + Number(r.cost), 0);
    const expCost = expenses
      .filter((e) => {
        const d = parseISO(e.date);
        return d >= start && d <= end;
      })
      .reduce((sum, e) => sum + Number(e.amount), 0);
    return {
      month: format(month, "MMM yy"),
      revenue,
      expenses: repCost + expCost,
      profit: revenue - (repCost + expCost),
    };
  });

  const monthlyNetPnl = months12.map((month) => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const revenue = rentals
      .filter((r) => {
        const d = parseISO(r.start_date);
        return d >= start && d <= end;
      })
      .reduce((sum, r) => sum + Number(r.amount_paid || 0), 0);
    const repCost = repairs
      .filter((r) => {
        const d = parseISO(r.repair_date);
        return d >= start && d <= end;
      })
      .reduce((sum, r) => sum + Number(r.cost), 0);
    const expCost = expenses
      .filter((e) => {
        const d = parseISO(e.date);
        return d >= start && d <= end;
      })
      .reduce((sum, e) => sum + Number(e.amount), 0);
    return {
      month: format(month, "MMM yy"),
      profit: revenue - (repCost + expCost),
    };
  });

  const topEarningBikes = bikes.map((b) => ({
    name: b.name,
    revenue: rentals
      .filter((r) => r.bike_id === b.id)
      .reduce((sum, r) => sum + Number(r.amount_paid || 0), 0),
  })).filter((x) => x.revenue > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  const costPerBike = bikes.map((b) => {
    const rep = repairs.filter((r) => r.bike_id === b.id).reduce((s, r) => s + Number(r.cost), 0);
    const exp = expenses.filter((e) => e.bike_id === b.id).reduce((s, e) => s + Number(e.amount), 0);
    return { name: b.name, repairs: rep, expenses: exp, total: rep + exp };
  }).filter((x) => x.total > 0).sort((a, b) => b.total - a.total).slice(0, 10);

  const durationBuckets = { "1": 0, "2": 0, "3": 0, "4+": 0 };
  for (const r of rentals) {
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

  const paymentOverTime = months12.map((month) => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const monthRentals = rentals.filter((r) => {
      const d = parseISO(r.created_at);
      return d >= start && d <= end;
    });
    return {
      month: format(month, "MMM yy"),
      paid: monthRentals.filter((r) => r.payment_status === "paid").length,
      pending: monthRentals.filter((r) => r.payment_status === "pending").length,
      partial: monthRentals.filter((r) => r.payment_status === "partial").length,
    };
  });

  const busiestMonths = months12.map((month) => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const count = rentals.filter((r) => {
      const d = parseISO(r.start_date);
      return d >= start && d <= end;
    }).length;
    return { month: format(month, "MMM yy"), count };
  });

  const avgWeeklyRateByMonth = months12.map((month) => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const monthRentals = rentals.filter((r) => {
      const d = parseISO(r.start_date);
      return d >= start && d <= end;
    });
    const avg =
      monthRentals.length > 0
        ? monthRentals.reduce((s, r) => s + Number(r.weekly_rate), 0) / monthRentals.length
        : 0;
    return { month: format(month, "MMM yy"), avg: Math.round(avg * 100) / 100 };
  });

  return (
    <AnalyticsClient
      revenueVsExpenses={revenueVsExpenses}
      monthlyNetPnl={monthlyNetPnl}
      topEarningBikes={topEarningBikes}
      costPerBike={costPerBike}
      rentalDuration={rentalDuration}
      paymentOverTime={paymentOverTime}
      busiestMonths={busiestMonths}
      avgWeeklyRateByMonth={avgWeeklyRateByMonth}
    />
  );
}
