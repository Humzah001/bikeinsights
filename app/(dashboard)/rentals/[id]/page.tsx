"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RentalStatusBadge, PaymentStatusBadge } from "@/components/rentals/PaymentStatusBadge";
import { toast } from "sonner";
import type { Rental, RentalStatus } from "@/lib/types";

import {
  getWeeksPaid,
  getAmountRemaining,
  getWeeksWithPendingRent,
  getNextUpcomingRentWeek,
  getRentDueDateForWeek,
  getDefaultRentCollectionDate,
  canRecordWeeklyRentPayment,
} from "@/lib/calculations";
import { format } from "date-fns";

export default function RentalDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [rental, setRental] = useState<Rental | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);
  const [manualAmount, setManualAmount] = useState("");

  useEffect(() => {
    fetch(`/api/rentals/${id}`)
      .then((r) => r.json())
      .then(setRental)
      .catch(() => toast.error("Failed to load rental"))
      .finally(() => setLoading(false));
  }, [id]);

  const rentSchedule = useMemo(() => {
    if (!rental) return null;
    return {
      start_date: rental.start_date,
      weeks: rental.weeks,
      weekly_rate: rental.weekly_rate,
      amount_paid: rental.amount_paid,
      rent_collection_date: rental.rent_collection_date,
    };
  }, [rental]);

  const weeklyCollectGate = useMemo(() => {
    if (!rentSchedule) return { ok: false as const, reason: "" };
    return canRecordWeeklyRentPayment(rentSchedule, new Date());
  }, [rentSchedule]);

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
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "Failed");
      }
      const updated = await res.json();
      toast.success("Marked fully paid — rental deactivated (no rent-due alerts)");
      setRental(updated);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
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
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "Failed");
      }
      const updated = await res.json();
      setRental(updated);
      const weeksPaid = getWeeksPaid(Number(updated.amount_paid), Number(updated.weekly_rate));
      const totalWeeks = Number(updated.weeks);
      if (weeksPaid >= totalWeeks) {
        toast.success("Full payment recorded — rental deactivated (no rent-due alerts)");
      } else {
        toast.success(`Week ${weeksPaid} payment recorded (£${updated.weekly_rate})`);
      }
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to record payment");
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

  async function addManualPayment() {
    const n = Number(manualAmount);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Enter a positive amount");
      return;
    }
    setActioning(true);
    try {
      const res = await fetch(`/api/rentals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ add_amount_paid: n }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "Failed");
      }
      const updated = await res.json();
      setRental(updated);
      setManualAmount("");
      if (updated.payment_status === "paid") {
        toast.success("Recorded — fully paid; rental deactivated (no rent-due alerts)");
      } else {
        toast.success(`Recorded £${n.toFixed(2)}`);
      }
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to record payment");
    } finally {
      setActioning(false);
    }
  }

  async function markDepositRefunded() {
    setActioning(true);
    try {
      const res = await fetch(`/api/rentals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deposit_refunded: true }),
      });
      if (!res.ok) throw new Error("Failed");
      const updated = await res.json();
      setRental(updated);
      toast.success("Deposit marked as refunded");
      router.refresh();
    } catch {
      toast.error("Failed to update");
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
          <RentalStatusBadge status={rental.status as RentalStatus} />
          <PaymentStatusBadge status={rental.payment_status} />
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
          {Number(rental.deposit_amount || 0) > 0 && (
            <div className="rounded-lg border border-dashed p-4">
              <p className="text-sm font-medium text-muted-foreground">Security deposit</p>
              <p className="mt-1 font-semibold">£{Number(rental.deposit_amount).toFixed(2)} held — return to customer when the bike is back</p>
              {rental.deposit_refunded === "true" ? (
                <p className="mt-2 text-sm text-green-600 dark:text-green-400">Deposit marked as refunded</p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Mark as refunded after you pay the deposit back.</p>
              )}
            </div>
          )}
          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-sm font-medium text-muted-foreground">Weekly rent schedule</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Week 1 due:{" "}
              {rental.rent_collection_date && rental.rent_collection_date.trim() !== ""
                ? rental.rent_collection_date
                : `${getDefaultRentCollectionDate(rental.start_date)} (first Tuesday on or after start)`}
              . Later weeks are every 7 days.
            </p>
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
            {rental.status === "inactive" && rental.payment_status === "paid" && (
              <p className="mt-2 text-sm text-muted-foreground">
                Fully paid — this rental no longer appears in rent-due alerts or pending rent lists.
              </p>
            )}
            {rental.payment_status !== "paid" && rental.status !== "inactive" && rentSchedule && (() => {
              const today = new Date();
              const overdueWeeks = getWeeksWithPendingRent(rentSchedule, today);
              const upcoming = getNextUpcomingRentWeek(rentSchedule, today);
              if (overdueWeeks.length === 0 && !upcoming) return null;
              return (
                <p className="mt-2 text-sm text-muted-foreground">
                  {overdueWeeks.length > 0 && (
                    <span className="text-red-600 dark:text-red-400">
                      Week{overdueWeeks.length > 1 ? "s" : ""} {overdueWeeks.join(", ")} overdue
                      {overdueWeeks.length > 0 &&
                        ` (was due ${overdueWeeks.map((w) => format(getRentDueDateForWeek(rentSchedule, w), "EEE d MMM")).join(", ")})`}.
                    </span>
                  )}
                  {overdueWeeks.length > 0 && upcoming && " "}
                  {upcoming && (
                    <span>
                      Next due: Week {upcoming.weekNum} – {format(upcoming.dueDate, "EEE d MMM yyyy")}.
                    </span>
                  )}
                </p>
              );
            })()}
          </div>
          {rental.payment_status !== "paid" && rental.status !== "inactive" && (
            <div className="flex flex-wrap items-end gap-2 rounded-lg border p-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Record other payment</p>
                <div className="flex flex-wrap gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Amount (£)"
                    className="w-36"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                  />
                  <Button type="button" variant="secondary" onClick={addManualPayment} disabled={actioning}>
                    Add amount
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use for ad-hoc amounts (not tied to the weekly collection date rules).
                </p>
              </div>
            </div>
          )}
          {rental.notes && (
            <div>
              <p className="text-sm text-muted-foreground">Notes</p>
              <p>{rental.notes}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-4">
            {(rental.status === "active" || rental.status === "overdue" || rental.status === "inactive") && (
              <Button onClick={markCompleted} disabled={actioning}>
                Mark as completed (bike returned)
              </Button>
            )}
            {Number(rental.deposit_amount || 0) > 0 && rental.deposit_refunded !== "true" && (
              <Button variant="outline" onClick={markDepositRefunded} disabled={actioning}>
                Mark deposit refunded
              </Button>
            )}
            {rental.payment_status !== "paid" && rental.status !== "inactive" && (
              <>
                <Button
                  variant="default"
                  onClick={recordWeeklyPayment}
                  disabled={actioning || !weeklyCollectGate.ok}
                  title={!weeklyCollectGate.ok ? weeklyCollectGate.reason : undefined}
                >
                  Record weekly payment (£{rental.weekly_rate})
                </Button>
                {!weeklyCollectGate.ok && (
                  <p className="w-full text-sm text-muted-foreground">{weeklyCollectGate.reason}</p>
                )}
                <Button variant="secondary" onClick={markPaid} disabled={actioning}>
                  Mark fully paid
                </Button>
              </>
            )}
            {rental.customer_email && rental.payment_status !== "paid" && rental.status !== "inactive" && (
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
