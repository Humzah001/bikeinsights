"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RentalStatusBadge, PaymentStatusBadge } from "@/components/rentals/PaymentStatusBadge";
import { toast } from "sonner";

import { getWeeksPaid, getAmountRemaining, getWeeksWithPendingRent, getNextUpcomingRentWeek, getRentDueTuesdayForWeek } from "@/lib/calculations";
import { format } from "date-fns";

interface Rental {
  id: string;
  bike_id: string;
  bike_name: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  start_date: string;
  end_date: string;
  weekly_rate: string;
  total_amount: string;
  amount_paid: string;
  weeks: string;
  status: string;
  payment_status: string;
  notes: string;
}

export default function RentalDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [rental, setRental] = useState<Rental | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);

  useEffect(() => {
    fetch(`/api/rentals/${id}`)
      .then((r) => r.json())
      .then(setRental)
      .catch(() => toast.error("Failed to load rental"))
      .finally(() => setLoading(false));
  }, [id]);

  async function markCompleted() {
    setActioning(true);
    try {
      const res = await fetch(`/api/rentals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Rental marked completed");
      setRental((r) => (r ? { ...r, status: "completed" } : null));
      router.refresh();
    } catch {
      toast.error("Failed to update");
    } finally {
      setActioning(false);
    }
  }

  async function markPaid() {
    setActioning(true);
    try {
      const res = await fetch(`/api/rentals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_status: "paid" }),
      });
      if (!res.ok) throw new Error("Failed");
      const updated = await res.json();
      toast.success("Marked fully paid");
      setRental(updated);
      router.refresh();
    } catch {
      toast.error("Failed to update");
    } finally {
      setActioning(false);
    }
  }

  async function recordWeeklyPayment() {
    setActioning(true);
    try {
      const res = await fetch(`/api/rentals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ record_weekly_payment: true }),
      });
      if (!res.ok) throw new Error("Failed");
      const updated = await res.json();
      setRental(updated);
      const weeksPaid = getWeeksPaid(Number(updated.amount_paid), Number(updated.weekly_rate));
      const totalWeeks = Number(updated.weeks);
      if (weeksPaid >= totalWeeks) {
        toast.success("Full payment recorded");
      } else {
        toast.success(`Week ${weeksPaid} payment recorded (£${updated.weekly_rate})`);
      }
      router.refresh();
    } catch {
      toast.error("Failed to record payment");
    } finally {
      setActioning(false);
    }
  }

  async function sendReminder() {
    setActioning(true);
    try {
      const res = await fetch("/api/notify/reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rental_id: id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send");
      }
      toast.success("Reminder email sent");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send reminder");
    } finally {
      setActioning(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this rental? The bike will be set back to available if it was rented.")) return;
    setActioning(true);
    try {
      const res = await fetch(`/api/rentals/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Rental deleted");
      router.push("/rentals");
      router.refresh();
    } catch {
      toast.error("Failed to delete rental");
    } finally {
      setActioning(false);
    }
  }

  if (loading || !rental) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/rentals">← Rentals</Link>
        </Button>
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/rentals">← Rentals</Link>
          </Button>
          <h1 className="text-2xl font-bold">Rental: {rental.bike_name}</h1>
          <RentalStatusBadge status={rental.status as "active" | "completed" | "overdue"} />
          <PaymentStatusBadge status={rental.payment_status as "paid" | "pending" | "partial"} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Bike</p>
            <Link href={`/bikes/${rental.bike_id}`} className="font-medium text-primary hover:underline">
              {rental.bike_name}
            </Link>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Customer</p>
            <p className="font-medium">{rental.customer_name}</p>
            {rental.customer_phone && (
              <a href={`tel:${rental.customer_phone}`} className="text-primary hover:underline">
                {rental.customer_phone}
              </a>
            )}
            {rental.customer_email && (
              <a href={`mailto:${rental.customer_email}`} className="block text-primary hover:underline">
                {rental.customer_email}
              </a>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Start date</p>
              <p>{rental.start_date}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">End date</p>
              <p>{rental.end_date}</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Weeks</p>
              <p>{rental.weeks}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Weekly rate</p>
              <p>£{rental.weekly_rate}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total amount</p>
              <p className="font-semibold">£{rental.total_amount}</p>
            </div>
          </div>
          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-sm font-medium text-muted-foreground">Payment (weekly, due every Tuesday)</p>
            <p className="mt-1 text-lg font-semibold">
              £{Number(rental.amount_paid || 0).toFixed(2)} of £{rental.total_amount} paid
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({getWeeksPaid(Number(rental.amount_paid || 0), Number(rental.weekly_rate))} of {rental.weeks} weeks)
              </span>
            </p>
            {rental.payment_status !== "paid" && (
              <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                £{getAmountRemaining(Number(rental.total_amount), Number(rental.amount_paid || 0)).toFixed(2)} remaining
              </p>
            )}
            {rental.payment_status !== "paid" && (() => {
              const today = new Date();
              const overdueWeeks = getWeeksWithPendingRent(
                { start_date: rental.start_date, weeks: rental.weeks, weekly_rate: rental.weekly_rate, amount_paid: rental.amount_paid },
                today
              );
              const upcoming = getNextUpcomingRentWeek(
                { start_date: rental.start_date, weeks: rental.weeks, weekly_rate: rental.weekly_rate, amount_paid: rental.amount_paid },
                today
              );
              if (overdueWeeks.length === 0 && !upcoming) return null;
              return (
                <p className="mt-2 text-sm text-muted-foreground">
                  {overdueWeeks.length > 0 && (
                    <span className="text-red-600 dark:text-red-400">
                      Week{overdueWeeks.length > 1 ? "s" : ""} {overdueWeeks.join(", ")} overdue
                      {overdueWeeks.length > 0 && ` (was due ${overdueWeeks.map((w) => format(getRentDueTuesdayForWeek(rental.start_date, w), "EEE d MMM")).join(", ")})`}.
                    </span>
                  )}
                  {overdueWeeks.length > 0 && upcoming && " "}
                  {upcoming && (
                    <span>
                      Next due: Week {upcoming.weekNum} – Tuesday {format(upcoming.dueDate, "d MMM yyyy")}.
                    </span>
                  )}
                </p>
              );
            })()}
          </div>
          {rental.notes && (
            <div>
              <p className="text-sm text-muted-foreground">Notes</p>
              <p>{rental.notes}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-4">
            {(rental.status === "active" || rental.status === "overdue") && (
              <Button onClick={markCompleted} disabled={actioning}>
                Mark as completed
              </Button>
            )}
            {rental.payment_status !== "paid" && (
              <>
                <Button variant="default" onClick={recordWeeklyPayment} disabled={actioning}>
                  Record weekly payment (£{rental.weekly_rate})
                </Button>
                <Button variant="secondary" onClick={markPaid} disabled={actioning}>
                  Mark fully paid
                </Button>
              </>
            )}
            {rental.customer_email && (
              <Button variant="outline" onClick={sendReminder} disabled={actioning}>
                Send reminder email
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href={`/rentals/${id}/edit`}>Edit rental</Link>
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={actioning}
            >
              Delete rental
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
