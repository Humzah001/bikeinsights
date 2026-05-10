"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ComposedChart,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { Download } from "lucide-react";
import { formatCurrency } from "@/lib/calculations";
import { useTenantPreferences } from "@/components/tenant/TenantPreferencesProvider";
import { useIsMobileViewport } from "@/hooks/use-is-mobile-viewport";
import { verticalBarCategoryAxisWidth } from "@/lib/recharts-vertical-bar";
import { buildAnalyticsChartData } from "@/lib/analytics-chart-data";
import type { Bike, Expense, Rental, Repair } from "@/lib/types";

const VERTICAL_BAR_MARGIN = { top: 4, right: 10, bottom: 4, left: 0 };

/** Margin presets: on mobile use left: 0 so the plot hugs the content edge with YAxis width only. */
function chartMargins(withLegend: boolean, mobile: boolean) {
  if (withLegend) {
    return mobile
      ? { top: 6, right: 6, left: 0, bottom: 26 }
      : { top: 8, right: 8, left: 4, bottom: 28 };
  }
  return mobile
    ? { top: 6, right: 6, left: 0, bottom: 8 }
    : { top: 8, right: 8, left: 4, bottom: 8 };
}

function valueYAxisWidth(mobile: boolean): number {
  return mobile ? 44 : 56;
}

/** Integer counts — narrower axis on small screens. */
function countYAxisWidth(mobile: boolean): number {
  return mobile ? 24 : 40;
}

function chartLegendProps(mobile: boolean) {
  return {
    verticalAlign: "bottom" as const,
    align: (mobile ? "left" : "center") as "left" | "center",
    wrapperStyle: { paddingTop: 4, fontSize: 12 },
  };
}

function truncateAxisLabel(value: string, maxLen = 14): string {
  const s = String(value);
  if (s.length <= maxLen) return s;
  return `${s.slice(0, Math.max(0, maxLen - 1))}…`;
}

interface AnalyticsClientProps {
  rentals: Rental[];
  repairs: Repair[];
  expenses: Expense[];
  bikes: Bike[];
}

export function AnalyticsClient({
  rentals,
  repairs,
  expenses,
  bikes,
}: AnalyticsClientProps) {
  const { currencySymbol } = useTenantPreferences();
  const isMobileChart = useIsMobileViewport();
  const sym = currencySymbol || "£";
  const [dateRange, setDateRange] = useState("12");
  const [asOf] = useState(() => new Date());

  const {
    revenueVsExpenses,
    monthlyNetPnl,
    topEarningBikes,
    costPerBike,
    rentalDuration,
    paymentOverTime,
    busiestMonths,
    avgWeeklyRateByMonth,
  } = useMemo(
    () => buildAnalyticsChartData(rentals, repairs, expenses, bikes, dateRange, asOf),
    [rentals, repairs, expenses, bikes, dateRange, asOf]
  );

  function exportReport() {
    const rows = [
      ["Month", "Collected rent", "Expenses", "Profit"],
      ...revenueVsExpenses.map((r) => [r.month, r.revenue, r.expenses, r.profit]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 text-left sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="flex gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="180">Last 6 months</option>
            <option value="365">Last 12 months</option>
            <option value="12">All (12 months)</option>
          </select>
          <Button variant="outline" size="sm" onClick={exportReport}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Collected rent vs expenses vs profit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <ComposedChart data={revenueVsExpenses} margin={chartMargins(true, isMobileChart)}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: isMobileChart ? 10 : 12 }} />
                <YAxis
                  width={valueYAxisWidth(isMobileChart)}
                  tick={{ fontSize: isMobileChart ? 10 : 12 }}
                  tickFormatter={(v) => `${sym}${v}`}
                />
                <Tooltip formatter={(v: number | undefined) => [v != null ? formatCurrency(v, sym) : "", ""]} />
                <Line type="monotone" dataKey="revenue" stroke="#22c55e" name="Collected rent" strokeWidth={2} />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" name="Expenses" strokeWidth={2} />
                <Line type="monotone" dataKey="profit" stroke="#3b82f6" name="Profit" strokeWidth={2} />
                <Legend {...chartLegendProps(isMobileChart)} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monthly net P&L</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[220px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={monthlyNetPnl} margin={chartMargins(false, isMobileChart)}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: isMobileChart ? 10 : 12 }} />
                <YAxis
                  width={valueYAxisWidth(isMobileChart)}
                  tick={{ fontSize: isMobileChart ? 10 : 12 }}
                  tickFormatter={(v) => `${sym}${v}`}
                />
                <Tooltip formatter={(v: number | undefined) => [v != null ? formatCurrency(v, sym) : "", "Profit"]} />
                <Bar
                  dataKey="profit"
                  name="Profit"
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                  fillOpacity={0.8}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top earning bikes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={topEarningBikes} layout="vertical" margin={VERTICAL_BAR_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tickFormatter={(v) => `${sym}${v}`} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={verticalBarCategoryAxisWidth(
                      topEarningBikes.map((b) => b.name),
                      isMobileChart
                    )}
                    tick={{ fontSize: 10, textAnchor: "end" }}
                    interval={0}
                    tickFormatter={(v: string) => {
                      const s = String(v ?? "").trim() || "—";
                      return truncateAxisLabel(s, isMobileChart ? 18 : 22);
                    }}
                  />
                  <Tooltip formatter={(v: number | undefined) => [v != null ? formatCurrency(v, sym) : "", "Collected rent"]} />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cost per bike (repairs + expenses)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={costPerBike} layout="vertical" margin={VERTICAL_BAR_MARGIN} stackOffset="expand">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tickFormatter={(v) => `${sym}${v}`} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={verticalBarCategoryAxisWidth(
                      costPerBike.map((b) => b.name),
                      isMobileChart
                    )}
                    tick={{ fontSize: 10, textAnchor: "end" }}
                    interval={0}
                    tickFormatter={(v: string) => {
                      const s = String(v ?? "").trim() || "—";
                      return truncateAxisLabel(s, isMobileChart ? 18 : 22);
                    }}
                  />
                  <Tooltip formatter={(v: number | undefined) => [v != null ? formatCurrency(v, sym) : "", ""]} />
                  <Bar dataKey="repairs" stackId="a" fill="#f59e0b" name="Repairs" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="expenses" stackId="a" fill="#ef4444" name="Expenses" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rental duration distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={rentalDuration} margin={chartMargins(false, isMobileChart)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="weeks" tick={{ fontSize: isMobileChart ? 10 : 12 }} />
                  <YAxis width={countYAxisWidth(isMobileChart)} tick={{ fontSize: isMobileChart ? 10 : 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Rentals" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Payment status over time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={paymentOverTime} margin={chartMargins(true, isMobileChart)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: isMobileChart ? 10 : 12 }} />
                  <YAxis width={countYAxisWidth(isMobileChart)} tick={{ fontSize: isMobileChart ? 10 : 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="paid" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} name="Paid" />
                  <Area type="monotone" dataKey="pending" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Pending" />
                  <Area type="monotone" dataKey="partial" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} name="Partial" />
                  <Legend {...chartLegendProps(isMobileChart)} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Busiest rental months</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={busiestMonths} margin={chartMargins(false, isMobileChart)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: isMobileChart ? 10 : 12 }} />
                  <YAxis width={countYAxisWidth(isMobileChart)} tick={{ fontSize: isMobileChart ? 10 : 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Rentals" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Average weekly rate trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart data={avgWeeklyRateByMonth} margin={chartMargins(false, isMobileChart)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: isMobileChart ? 10 : 12 }} />
                  <YAxis
                    width={valueYAxisWidth(isMobileChart)}
                    tick={{ fontSize: isMobileChart ? 10 : 12 }}
                    tickFormatter={(v) => `${sym}${v}`}
                  />
                  <Tooltip formatter={(v: number | undefined) => [v != null ? formatCurrency(v, sym) : "", "Avg rate"]} />
                  <Line type="monotone" dataKey="avg" stroke="#ec4899" name={`Avg ${sym}/week`} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
