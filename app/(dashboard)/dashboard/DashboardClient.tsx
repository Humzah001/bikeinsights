"use client";

import Link from "next/link";
import { KPICard } from "@/components/dashboard/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { AlertCircle, AlertTriangle } from "lucide-react";

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
  weeklyData: { week: string; revenue: number; expenses: number; profit: number }[];
  monthlyData: { month: string; revenue: number; expenses: number; profit: number }[];
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
}

export function DashboardClient({
  kpis,
  weeklyData,
  monthlyData,
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
      <h1 className="text-2xl font-bold">Dashboard</h1>

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
          title="Collected rent (this month)"
          value={formatCurrency(kpis.revenueThisMonth)}
          variant="default"
        />
        <KPICard title="Active rentals" value={kpis.activeRentals} />
        <KPICard
          title="Pending payments"
          value={kpis.pendingPayments}
          variant={kpis.pendingPayments > 0 ? "warning" : "default"}
        />
        <KPICard
          title="Total fleet"
          value={kpis.totalBikes}
          subtitle={`${kpis.availableBikes} available · ${kpis.rentedBikes} rented · ${kpis.repairBikes} repair`}
        />
        <KPICard
          title="Expenses (this month)"
          value={formatCurrency(kpis.totalExpensesThisMonth)}
        />
        <KPICard
          title="Net profit (this month)"
          value={formatCurrency(kpis.netProfitThisMonth)}
          variant={kpis.netProfitThisMonth >= 0 ? "positive" : "negative"}
          subtitle="Revenue is collected rent only"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly collected rent (last 8 weeks)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="week" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `£${v}`} />
                  <Tooltip formatter={(v: number | undefined) => [v != null ? `£${v.toFixed(2)}` : "", ""]} />
                  <Bar dataKey="revenue" fill="#22c55e" name="Collected rent" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Monthly collected rent vs expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `£${v}`} />
                  <Tooltip formatter={(v: number | undefined) => [v != null ? `£${v.toFixed(2)}` : "", ""]} />
                  <Line type="monotone" dataKey="revenue" stroke="#22c55e" name="Collected rent" strokeWidth={2} />
                  <Line type="monotone" dataKey="expenses" stroke="#ef4444" name="Expenses" strokeWidth={2} />
                  <Legend />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Bike status</CardTitle>
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
            <CardTitle>Payment status</CardTitle>
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
            <CardTitle>Expense by category</CardTitle>
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
            <CardTitle>Collected rent by bike</CardTitle>
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
            <CardTitle>Recent rentals</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/rentals">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
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
            <CardTitle>Pending payments</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/rentals/pending">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
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
            <CardTitle>Recent repairs</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/repairs">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
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
