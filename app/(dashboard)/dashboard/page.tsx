import * as db from "@/lib/db";
import { ensureOverdueRentalsUpdated, ensureWeeklyRentNotifications } from "@/lib/notifications";
import type { Bike, Rental, Repair, Expense, Notification } from "@/lib/types";
import { format, parseISO, startOfMonth, endOfMonth, subMonths, subWeeks } from "date-fns";
import { getMonthKey } from "@/lib/calculations";
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await ensureOverdueRentalsUpdated();
  await ensureWeeklyRentNotifications();
  const [bikes, rentals, repairs, expenses, notifications] = await Promise.all([
    db.getBikes(),
    db.getRentals(),
    db.getRepairs(),
    db.getExpenses(),
    db.getNotifications(),
  ]);

  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const thisMonthKey = getMonthKey(now);

  const revenueThisMonth = rentals
    .filter((r) => {
      const start = parseISO(r.start_date);
      return start >= thisMonthStart && start <= thisMonthEnd && (r.status === "completed" || r.status === "active" || r.status === "overdue");
    })
    .reduce((sum, r) => sum + Number(r.amount_paid || 0), 0);

  const activeRentals = rentals.filter((r) => r.status === "active").length;
  const overdueRentals = rentals.filter((r) => r.status === "overdue").length;
  const pendingPayments = rentals.filter((r) => r.payment_status === "pending").length;

  const totalBikes = bikes.length;
  const availableBikes = bikes.filter((b) => b.status === "available").length;
  const rentedBikes = bikes.filter((b) => b.status === "rented").length;
  const repairBikes = bikes.filter((b) => b.status === "under_repair").length;

  const repairsThisMonth = repairs
    .filter((r) => {
      const d = parseISO(r.repair_date);
      return d >= thisMonthStart && d <= thisMonthEnd;
    })
    .reduce((sum, r) => sum + Number(r.cost), 0);
  const expensesThisMonth = expenses
    .filter((e) => {
      const d = parseISO(e.date);
      return d >= thisMonthStart && d <= thisMonthEnd;
    })
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const totalExpensesThisMonth = repairsThisMonth + expensesThisMonth;
  const netProfitThisMonth = revenueThisMonth - totalExpensesThisMonth;

  const last8Weeks = Array.from({ length: 8 }, (_, i) => {
    const weekStart = subWeeks(now, 7 - i);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekRevenue = rentals
      .filter((r) => {
        const start = parseISO(r.start_date);
        return start >= weekStart && start <= weekEnd;
      })
      .reduce((sum, r) => sum + Number(r.amount_paid || 0), 0);
    const weekRepairs = repairs
      .filter((r) => {
        const d = parseISO(r.repair_date);
        return d >= weekStart && d <= weekEnd;
      })
      .reduce((sum, r) => sum + Number(r.cost), 0);
    const weekExpenses = expenses
      .filter((e) => {
        const d = parseISO(e.date);
        return d >= weekStart && d <= weekEnd;
      })
      .reduce((sum, e) => sum + Number(e.amount), 0);
    return {
      week: format(weekStart, "MMM d"),
      revenue: weekRevenue,
      expenses: weekRepairs + weekExpenses,
      profit: weekRevenue - (weekRepairs + weekExpenses),
    };
  });

  const last12Months = Array.from({ length: 12 }, (_, i) => {
    const month = subMonths(now, 11 - i);
    const key = getMonthKey(month);
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const revenue = rentals
      .filter((r) => {
        const start = parseISO(r.start_date);
        return start >= monthStart && start <= monthEnd;
      })
      .reduce((sum, r) => sum + Number(r.amount_paid || 0), 0);
    const repCost = repairs
      .filter((r) => {
        const d = parseISO(r.repair_date);
        return d >= monthStart && d <= monthEnd;
      })
      .reduce((sum, r) => sum + Number(r.cost), 0);
    const expCost = expenses
      .filter((e) => {
        const d = parseISO(e.date);
        return d >= monthStart && d <= monthEnd;
      })
      .reduce((sum, e) => sum + Number(e.amount), 0);
    return {
      month: format(month, "MMM yy"),
      revenue,
      expenses: repCost + expCost,
      profit: revenue - (repCost + expCost),
    };
  });

  const bikeStatusCounts = {
    available: availableBikes,
    rented: rentedBikes,
    under_repair: repairBikes,
    retired: bikes.filter((b) => b.status === "retired").length,
  };

  const revenueByBike = bikes.map((b) => {
    const total = rentals
      .filter((r) => r.bike_id === b.id && (r.status === "completed" || r.status === "active" || r.status === "overdue"))
      .reduce((sum, r) => sum + Number(r.amount_paid || 0), 0);
    return { name: b.name, revenue: total };
  }).filter((x) => x.revenue > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  const paymentStatusCounts = {
    paid: rentals.filter((r) => r.payment_status === "paid").length,
    pending: rentals.filter((r) => r.payment_status === "pending").length,
    partial: rentals.filter((r) => r.payment_status === "partial").length,
  };

  const expenseByCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    const cat = e.category || "other";
    acc[cat] = (acc[cat] || 0) + Number(e.amount);
    return acc;
  }, {});

  const recentRentals = [...rentals]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const pendingRentalsForTable = [...rentals]
    .filter((r) => r.payment_status === "pending" || r.status === "overdue")
    .sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime())
    .slice(0, 5);

  const recentRepairs = [...repairs]
    .sort((a, b) => new Date(b.repair_date).getTime() - new Date(a.repair_date).getTime())
    .slice(0, 5);

  const unreadNotifications = notifications.filter((n) => n.is_read !== "true");
  const pendingRepairCount = repairs.filter((r) => r.status === "pending" || r.status === "in_progress").length;

  return (
    <DashboardClient
      kpis={{
        revenueThisMonth,
        activeRentals,
        pendingPayments,
        totalBikes,
        availableBikes,
        rentedBikes,
        repairBikes,
        totalExpensesThisMonth,
        netProfitThisMonth,
      }}
      weeklyData={last8Weeks}
      monthlyData={last12Months}
      bikeStatusCounts={bikeStatusCounts}
      revenueByBike={revenueByBike}
      paymentStatusCounts={paymentStatusCounts}
      expenseByCategory={expenseByCategory}
      recentRentals={recentRentals}
      pendingRentals={pendingRentalsForTable}
      recentRepairs={recentRepairs}
      overdueCount={overdueRentals}
      pendingPaymentCount={pendingPayments}
      pendingRepairCount={pendingRepairCount}
    />
  );
}
