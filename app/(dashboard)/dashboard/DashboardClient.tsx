"use client";

import Link from "next/link";
import { KPICard } from "@/components/dashboard/KPICard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { formatCurrency, getWeeksPaid } from "@/lib/calculations";
import { DashboardMonthSelect } from "@/components/dashboard/DashboardMonthSelect";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";

const STATUS_COLORS = {
  available: "bg-green-500/20 text-green-600 dark:text-green-400",
  rented: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
  under_repair: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
  retired: "bg-muted text-muted-foreground",
  active: "bg-green-500/20 text-green-600 dark:text-green-400",
  completed: "bg-muted text-muted-foreground",
  overdue: "bg-red-500/20 text-red-600 dark:text-red-400",
  paid: "bg-green-500/20 text-green-600 dark:text-green-400",
  pending: "bg-red-500/20 text-red-600 dark:text-red-400",
  partial: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
  pending_repair: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
  in_progress: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
  completed_repair: "bg-green-500/20 text-green-600 dark:text-green-400",
};

const PIE_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#6b7280", "#ef4444"];

interface DashboardClientProps {
  monthSelect: { value: string; options: { value: string; label: string }[] };
  isViewingCurrentMonth: boolean;
  viewingMonthLabel: string;
  kpis: {
    revenueThisMonth: number;
    activeRentals: number;
    pendingPayments: number;
    totalBikes: number;
    availableBikes: number;
    rentedBikes: number;
    repairBikes: number;
    totalExpensesThisMonth: number;
    netProfitThisMonth: number;
  };
  kpiCopy: {
    rentTitle: string;
    rentSubtitle: string;
    activeSubtitle?: string;
    pendingSubtitle?: string;
    fleetSubtitle?: string;
    expensesTitle: string;
    profitTitle: string;
  };
  profitSummaries: {
    week: { revenue: number; expenses: number; profit: number };
    month: { revenue: number; expenses: number; profit: number };
    year: { revenue: number; expenses: number; profit: number };
  };
  weekRangeLabel: string;
  monthRangeLabel: string;
  weeklyData: { week: string; revenue: number; expenses: number; profit: number }[];
  monthlyData: { month: string; revenue: number; expenses: number; profit: number }[];
  yearlyData: { year: string; revenue: number; expenses: number; profit: number }[];
  yearSummaryLabel: string;
  weeklyChartFootnote: string;
  monthlyChartFootnote: string;
  yearlyChartFootnote: string;
  bikeStatusCounts: { available: number; rented: number; under_repair: number; retired: number };
  revenueByBike: { name: string; revenue: number }[];
  paymentStatusCounts: { paid: number; pending: number; partial: number };
  expenseByCategory: Record<string, number>;
  recentRentals: Array<{
    id: string;
    bike_name: string;
    customer_name: string;
    start_date: string;
    end_date: string;
    total_amount: string;
    amount_paid?: string;
    weekly_rate: string;
    weeks: string;
    status: string;
    payment_status: string;
  }>;
  pendingRentals: Array<{
    id: string;
    bike_name: string;
    customer_name: string;
    customer_phone: string;
    end_date: string;
    total_amount: string;
    amount_paid?: string;
    weekly_rate: string;
    weeks: string;
    payment_status: string;
    status: string;
  }>;
  recentRepairs: Array<{
    bike_name: string;
    cost: string;
    status: string;
    description: string;
  }>;
  overdueCount: number;
  pendingPaymentCount: number;
  pendingRepairCount: number;
  pieChartTitles: { payment: string; expense: string };
}

function ProfitSummaryStrip({
  revenue,
  expenses,
  profit,
  periodLabel,
}: {
  revenue: number;
  expenses: number;
  profit: number;
  periodLabel: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <p className="mb-3 text-xs font-medium text-muted-foreground">{periodLabel}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">Collected rent</p>
          <p className="text-lg font-semibold tabular-nums text-green-600 dark:text-green-400">
            {formatCurrency(revenue)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Repairs and expenses</p>
          <p className="text-lg font-semibold tabular-nums text-red-600 dark:text-red-400">
            {formatCurrency(expenses)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Net profit</p>
          <p
            className={`text-lg font-semibold tabular-nums ${
              profit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            }`}
          >
            {formatCurrency(profit)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function DashboardClient({
  monthSelect,
  isViewingCurrentMonth,
  viewingMonthLabel,
  kpis,
  kpiCopy,
  profitSummaries,
  weekRangeLabel,
  monthRangeLabel,
  yearSummaryLabel,
  weeklyData,
  monthlyData,
  yearlyData,
  weeklyChartFootnote,
  monthlyChartFootnote,
  yearlyChartFootnote,
  bikeStatusCounts,
  revenueByBike,
  paymentStatusCounts,
  expenseByCategory,
  recentRentals,
  pendingRentals,
  recentRepairs,
  overdueCount,
  pendingPaymentCount,
  pendingRepairCount,
  pieChartTitles,
}: DashboardClientProps) {
  const bikeStatusPie = [
    { name: "Available", value: bikeStatusCounts.available, color: PIE_COLORS[0] },
    { name: "Rented", value: bikeStatusCounts.rented, color: PIE_COLORS[1] },
    { name: "Repair", value: bikeStatusCounts.under_repair, color: PIE_COLORS[2] },
    { name: "Retired", value: bikeStatusCounts.retired, color: PIE_COLORS[3] },
  ].filter((d) => d.value > 0);

  const paymentPie = [
    { name: "Paid", value: paymentStatusCounts.paid, color: PIE_COLORS[0] },
    { name: "Pending", value: paymentStatusCounts.pending, color: PIE_COLORS[4] },
    { name: "Partial", value: paymentStatusCounts.partial, color: PIE_COLORS[2] },
  ].filter((d) => d.value > 0);

  const expensePie = Object.entries(expenseByCategory).map(([name, value], i) => ({
    name,
    value,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <DashboardMonthSelect value={monthSelect.value} options={monthSelect.options} />
      </div>

      {!isViewingCurrentMonth && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Viewing {viewingMonthLabel}</AlertTitle>
          <AlertDescription>
            Money figures, profit charts, tables, and payment breakdowns are for this month only. Bike counts in the pie
            chart are today&apos;s fleet snapshot.
          </AlertDescription>
        </Alert>
      )}

      {overdueCount > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Overdue rentals</AlertTitle>
          <AlertDescription>
            <Link href="/rentals/pending" className="underline">
              {overdueCount} rental{overdueCount !== 1 ? "s" : ""} {overdueCount === 1 ? "is" : "are"} overdue
            </Link>
            . Review and mark complete or contact customers.
          </AlertDescription>
        </Alert>
      )}
      {pendingPaymentCount > 0 && overdueCount === 0 && (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Pending payments</AlertTitle>
          <AlertDescription>
            <Link href="/rentals/pending" className="underline">
              {pendingPaymentCount} payment{pendingPaymentCount !== 1 ? "s" : ""} pending
            </Link>
            .
          </AlertDescription>
        </Alert>
      )}
      {pendingRepairCount > 0 && (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Bikes under repair</AlertTitle>
          <AlertDescription>
            {pendingRepairCount} bike{pendingRepairCount !== 1 ? "s" : ""} with pending or in-progress repairs.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KPICard
          title={kpiCopy.rentTitle}
          value={formatCurrency(kpis.revenueThisMonth)}
          variant="default"
          subtitle={kpiCopy.rentSubtitle}
        />
        <KPICard
          title="Active rentals"
          value={kpis.activeRentals}
          subtitle={kpiCopy.activeSubtitle}
        />
        <KPICard
          title="Pending payments"
          value={kpis.pendingPayments}
          variant={kpis.pendingPayments > 0 ? "warning" : "default"}
          subtitle={kpiCopy.pendingSubtitle}
        />
        <KPICard
          title="Total fleet"
          value={kpis.totalBikes}
          subtitle={
            kpiCopy.fleetSubtitle
              ? `${kpiCopy.fleetSubtitle} · ${kpis.availableBikes} available · ${kpis.rentedBikes} rented · ${kpis.repairBikes} repair`
              : `${kpis.availableBikes} available · ${kpis.rentedBikes} rented · ${kpis.repairBikes} repair`
          }
        />
        <KPICard
          title={`${kpiCopy.expensesTitle} (${kpiCopy.rentSubtitle})`}
          value={formatCurrency(kpis.totalExpensesThisMonth)}
        />
        <KPICard
          title={`${kpiCopy.profitTitle} (${kpiCopy.rentSubtitle})`}
          value={formatCurrency(kpis.netProfitThisMonth)}
          variant={kpis.netProfitThisMonth >= 0 ? "positive" : "negative"}
          subtitle="Collected rent minus repairs and expenses"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profit by period</CardTitle>
          <CardDescription>
            Switch between week, month, and year. Collected rent counts rentals whose contract start date falls in the
            period; repairs and expenses use their own dates. Weeks are Monday–Sunday.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="month" className="w-full">
            <TabsList className="grid w-full grid-cols-3 sm:inline-flex sm:w-auto">
              <TabsTrigger value="week">Weekly</TabsTrigger>
              <TabsTrigger value="month">Monthly</TabsTrigger>
              <TabsTrigger value="year">Yearly</TabsTrigger>
            </TabsList>

            <TabsContent value="week" className="mt-4 space-y-4">
              <ProfitSummaryStrip
                revenue={profitSummaries.week.revenue}
                expenses={profitSummaries.week.expenses}
                profit={profitSummaries.week.profit}
                periodLabel={`Combined · ${weekRangeLabel}`}
              />
              <div className="h-[260px] w-full min-w-0">
                {weeklyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="week" className="text-xs" tick={{ fontSize: 10 }} />
                      <YAxis className="text-xs" tickFormatter={(v) => `£${v}`} width={48} />
                      <Tooltip
                        formatter={(v: number | undefined, name?: string) => [
                          v != null ? `£${v.toFixed(2)}` : "",
                          name === "revenue" ? "Rent" : name === "expenses" ? "Costs" : "Net profit",
                        ]}
                      />
                      <Legend />
                      <Bar dataKey="revenue" fill="#22c55e" name="Collected rent" radius={[3, 3, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="expenses" fill="#fca5a5" name="Expenses" radius={[3, 3, 0, 0]} maxBarSize={28} />
                      <Line
                        type="monotone"
                        dataKey="profit"
                        stroke="#3b82f6"
                        name="Net profit"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No calendar weeks in this range.
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{weeklyChartFootnote}</p>
            </TabsContent>

            <TabsContent value="month" className="mt-4 space-y-4">
              <ProfitSummaryStrip
                revenue={profitSummaries.month.revenue}
                expenses={profitSummaries.month.expenses}
                profit={profitSummaries.month.profit}
                periodLabel={monthRangeLabel}
              />
              <div className="h-[260px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(v) => `£${v}`} width={48} />
                    <Tooltip
                      formatter={(v: number | undefined, name?: string) => [
                        v != null ? `£${v.toFixed(2)}` : "",
                        name === "revenue" ? "Rent" : name === "expenses" ? "Costs" : "Net profit",
                      ]}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#22c55e" name="Collected rent" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="expenses" stroke="#ef4444" name="Expenses" strokeWidth={2} dot={false} />
                    <Line
                      type="monotone"
                      dataKey="profit"
                      stroke="#3b82f6"
                      name="Net profit"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-muted-foreground">{monthlyChartFootnote}</p>
            </TabsContent>

            <TabsContent value="year" className="mt-4 space-y-4">
              <ProfitSummaryStrip
                revenue={profitSummaries.year.revenue}
                expenses={profitSummaries.year.expenses}
                profit={profitSummaries.year.profit}
                periodLabel={`Calendar year ${yearSummaryLabel}`}
              />
              <div className="h-[260px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={yearlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="year" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(v) => `£${v}`} width={52} />
                    <Tooltip
                      formatter={(v: number | undefined, name?: string) => [
                        v != null ? `£${v.toFixed(2)}` : "",
                        name === "revenue" ? "Rent" : name === "expenses" ? "Costs" : "Net profit",
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="revenue" fill="#22c55e" name="Collected rent" radius={[4, 4, 0, 0]} maxBarSize={36} />
                    <Bar dataKey="expenses" fill="#fca5a5" name="Expenses" radius={[4, 4, 0, 0]} maxBarSize={36} />
                    <Line
                      type="monotone"
                      dataKey="profit"
                      stroke="#3b82f6"
                      name="Net profit"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-muted-foreground">{yearlyChartFootnote}</p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Bike status</CardTitle>
            {!isViewingCurrentMonth && (
              <CardDescription>Today&apos;s fleet (not tied to the selected month)</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              {bikeStatusPie.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={bikeStatusPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {bikeStatusPie.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number | undefined) => [v != null ? v : "", ""]} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="flex h-full items-center justify-center text-sm text-muted-foreground">No data</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base leading-snug">{pieChartTitles.payment}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              {paymentPie.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                    >
                      {paymentPie.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number | undefined) => [v != null ? v : "", ""]} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="flex h-full items-center justify-center text-sm text-muted-foreground">No data</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base leading-snug">{pieChartTitles.expense}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              {expensePie.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expensePie}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                    >
                      {expensePie.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number | undefined) => [v != null ? `£${v.toFixed(2)}` : "", ""]} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="flex h-full items-center justify-center text-sm text-muted-foreground">No data</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {revenueByBike.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Collected rent by bike ({viewingMonthLabel})</CardTitle>
            <CardDescription>Rentals whose start date falls in this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByBike} layout="vertical" margin={{ left: 80 }}>
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
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Rentals starting {viewingMonthLabel}</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/rentals">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table className="min-w-[500px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Bike</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRentals.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.bike_name}</TableCell>
                    <TableCell>{r.customer_name}</TableCell>
                    <TableCell className="text-xs">
                      {r.start_date} – {r.end_date}
                    </TableCell>
                    <TableCell>£{r.total_amount}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {getWeeksPaid(Number(r.amount_paid || 0), Number(r.weekly_rate))}/{r.weeks} weeks
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[r.status as keyof typeof STATUS_COLORS] || ""}>
                        {r.status}
                      </Badge>
                      <Badge className={`ml-1 ${STATUS_COLORS[r.payment_status as keyof typeof STATUS_COLORS] || ""}`}>
                        {r.payment_status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Pending ({viewingMonthLabel})</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/rentals/pending">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table className="min-w-[400px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Bike</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRentals.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.bike_name}</TableCell>
                    <TableCell>
                      {r.customer_name}
                      {r.customer_phone && (
                        <a href={`tel:${r.customer_phone}`} className="ml-1 text-xs text-primary hover:underline">
                          {r.customer_phone}
                        </a>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {getWeeksPaid(Number(r.amount_paid || 0), Number(r.weekly_rate))}/{r.weeks} weeks
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/rentals/${r.id}`}>Record payment</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Repairs ({viewingMonthLabel})</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/repairs">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table className="min-w-[400px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Bike</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRepairs.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.bike_name}</TableCell>
                    <TableCell className="max-w-[120px] truncate">{r.description}</TableCell>
                    <TableCell>£{r.cost}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          STATUS_COLORS[
                            r.status === "completed"
                              ? "completed_repair"
                              : r.status === "in_progress"
                                ? "in_progress"
                                : "pending_repair"
                          ] || ""
                        }
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
