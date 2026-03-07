"use client";

import { useState } from "react";
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

interface AnalyticsClientProps {
  revenueVsExpenses: { month: string; revenue: number; expenses: number; profit: number }[];
  monthlyNetPnl: { month: string; profit: number }[];
  topEarningBikes: { name: string; revenue: number }[];
  costPerBike: { name: string; repairs: number; expenses: number; total: number }[];
  rentalDuration: { weeks: string; count: number }[];
  paymentOverTime: { month: string; paid: number; pending: number; partial: number }[];
  busiestMonths: { month: string; count: number }[];
  avgWeeklyRateByMonth: { month: string; avg: number }[];
}

export function AnalyticsClient({
  revenueVsExpenses,
  monthlyNetPnl,
  topEarningBikes,
  costPerBike,
  rentalDuration,
  paymentOverTime,
  busiestMonths,
  avgWeeklyRateByMonth,
}: AnalyticsClientProps) {
  const [dateRange, setDateRange] = useState("12");

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={revenueVsExpenses}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => `£${v}`} />
                <Tooltip formatter={(v: number | undefined) => [v != null ? `£${v.toFixed(2)}` : "", ""]} />
                <Line type="monotone" dataKey="revenue" stroke="#22c55e" name="Collected rent" strokeWidth={2} />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" name="Expenses" strokeWidth={2} />
                <Line type="monotone" dataKey="profit" stroke="#3b82f6" name="Profit" strokeWidth={2} />
                <Legend />
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
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyNetPnl}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => `£${v}`} />
                <Tooltip formatter={(v: number | undefined) => [v != null ? `£${v.toFixed(2)}` : "", "Profit"]} />
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
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topEarningBikes} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tickFormatter={(v) => `£${v}`} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number | undefined) => [v != null ? `£${v.toFixed(2)}` : "", "Collected rent"]} />
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
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costPerBike} layout="vertical" margin={{ left: 80 }} stackOffset="expand">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tickFormatter={(v) => `£${v}`} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number | undefined) => [v != null ? `£${v.toFixed(2)}` : "", ""]} />
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
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rentalDuration}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="weeks" />
                  <YAxis />
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
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={paymentOverTime}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="paid" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} name="Paid" />
                  <Area type="monotone" dataKey="pending" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Pending" />
                  <Area type="monotone" dataKey="partial" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} name="Partial" />
                  <Legend />
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
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={busiestMonths}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" />
                  <YAxis />
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
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={avgWeeklyRateByMonth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(v) => `£${v}`} />
                  <Tooltip formatter={(v: number | undefined) => [v != null ? `£${v.toFixed(2)}` : "", "Avg rate"]} />
                  <Line type="monotone" dataKey="avg" stroke="#ec4899" name="Avg £/week" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
