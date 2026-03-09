"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Rental } from "@/lib/types";
import { getDaysOverdue, getWeeksPaid, getAmountRemaining, getWeeksWithPendingRent, getNextUpcomingRentWeek, getRentDueTuesdayForWeek, formatCurrency } from "@/lib/calculations";
import { format } from "date-fns";
import { Phone, CheckCircle, Send } from "lucide-react";
import { toast } from "sonner";

interface PendingClientProps {
  overdueRentals: Rental[];
  pendingPaymentRentals: Rental[];
  totalOutstanding: number;
  pendingCount: number;
  overdueCount: number;
  oldestOverdueDays: number;
}

export function PendingClient({
  overdueRentals,
  pendingPaymentRentals,
  totalOutstanding,
  pendingCount,
  overdueCount,
  oldestOverdueDays,
}: PendingClientProps) {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold sm:text-2xl">Pending payments & overdue rentals</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalOutstanding)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overdue rentals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{overdueCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Oldest overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{oldestOverdueDays} days</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overdue rentals</CardTitle>
          <CardDescription>
            Rentals past end date not yet marked completed. Mark complete or contact customer.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead>Bike</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>End date</TableHead>
                <TableHead>Days overdue</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead className="whitespace-nowrap">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overdueRentals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No overdue rentals
                  </TableCell>
                </TableRow>
              ) : (
                overdueRentals.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.bike_name}</TableCell>
                    <TableCell>
                      <div>{r.customer_name}</div>
                      {r.customer_phone && (
                        <a
                          href={`tel:${r.customer_phone}`}
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <Phone className="h-3 w-3" />
                          {r.customer_phone}
                        </a>
                      )}
                    </TableCell>
                    <TableCell>{r.end_date}</TableCell>
                    <TableCell>{getDaysOverdue(r.end_date)}</TableCell>
                    <TableCell>
                      £{Number(r.amount_paid || 0).toFixed(0)} of £{r.total_amount} ({getWeeksPaid(Number(r.amount_paid || 0), Number(r.weekly_rate))}/{r.weeks} weeks)
                    </TableCell>
                    <TableCell>£{getAmountRemaining(Number(r.total_amount), Number(r.amount_paid || 0)).toFixed(0)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/rentals/${r.id}`}>
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Mark completed
                          </Link>
                        </Button>
                        {r.customer_phone && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={`tel:${r.customer_phone}`}>
                              <Phone className="mr-1 h-3 w-3" />
                              Call
                            </a>
                          </Button>
                        )}
                        <SendReminderButton rentalId={r.id} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending payments</CardTitle>
          <CardDescription>
            Rentals with payment not fully received. Record weekly payments or send reminder.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead>Bike</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Rent due</TableHead>
                <TableHead>End date</TableHead>
                <TableHead className="whitespace-nowrap">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingPaymentRentals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No pending payments
                  </TableCell>
                </TableRow>
              ) : (
                pendingPaymentRentals.map((r) => {
                  const today = new Date();
                  const overdueWeeks = getWeeksWithPendingRent(
                    { start_date: r.start_date, weeks: r.weeks, weekly_rate: r.weekly_rate, amount_paid: r.amount_paid },
                    today
                  );
                  const upcoming = getNextUpcomingRentWeek(
                    { start_date: r.start_date, weeks: r.weeks, weekly_rate: r.weekly_rate, amount_paid: r.amount_paid },
                    today
                  );
                  const rentDueLabel =
                    overdueWeeks.length > 0
                      ? `Overdue: Week${overdueWeeks.length > 1 ? "s " : " "}${overdueWeeks.join(", ")}`
                      : upcoming
                        ? `Next: Week ${upcoming.weekNum} (Tue ${format(upcoming.dueDate, "d MMM")})`
                        : "—";
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.bike_name}</TableCell>
                      <TableCell>
                        <div>{r.customer_name}</div>
                        {r.customer_phone && (
                          <a
                            href={`tel:${r.customer_phone}`}
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            <Phone className="h-3 w-3" />
                            {r.customer_phone}
                          </a>
                        )}
                      </TableCell>
                      <TableCell>
                        £{Number(r.amount_paid || 0).toFixed(0)} of £{r.total_amount} ({getWeeksPaid(Number(r.amount_paid || 0), Number(r.weekly_rate))}/{r.weeks} weeks)
                      </TableCell>
                      <TableCell>£{getAmountRemaining(Number(r.total_amount), Number(r.amount_paid || 0)).toFixed(0)}</TableCell>
                      <TableCell className={overdueWeeks.length > 0 ? "text-red-600 dark:text-red-400" : ""}>
                        {rentDueLabel}
                      </TableCell>
                      <TableCell>{r.end_date}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/rentals/${r.id}`}>Record weekly payment</Link>
                        </Button>
                        <SendReminderButton rentalId={r.id} />
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SendReminderButton({ rentalId }: { rentalId: string }) {
  const [loading, setLoading] = useState(false);
  async function send() {
    setLoading(true);
    try {
      const res = await fetch("/api/notify/reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rental_id: rentalId }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      if (typeof window !== "undefined") {
        toast.success("Reminder sent");
      }
    } catch {
      toast.error("Failed to send");
    } finally {
      setLoading(false);
    }
  }
  return (
    <Button variant="ghost" size="sm" onClick={send} disabled={loading}>
      <Send className="mr-1 h-3 w-3" />
      Send reminder
    </Button>
  );
}
