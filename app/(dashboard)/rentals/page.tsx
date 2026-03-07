"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RentalStatusBadge, PaymentStatusBadge } from "@/components/rentals/PaymentStatusBadge";
import type { Rental, Bike } from "@/lib/types";
import { getDaysOverdue, isOverdue, getWeeksPaid } from "@/lib/calculations";
import { format, parseISO } from "date-fns";
import { Plus, Download, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function RentalsPage() {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this rental? The bike will be set back to available if it was rented.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/rentals/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setRentals((prev) => prev.filter((r) => r.id !== id));
      toast.success("Rental deleted");
    } catch {
      toast.error("Failed to delete rental");
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/rentals").then((r) => r.json()),
      fetch("/api/bikes").then((r) => r.json()),
    ])
      .then(([r, b]) => {
        setRentals(r);
        setBikes(b);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = rentals.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (paymentFilter !== "all" && r.payment_status !== paymentFilter) return false;
    const q = search.toLowerCase();
    if (
      q &&
      !r.customer_name.toLowerCase().includes(q) &&
      !r.customer_phone?.toLowerCase().includes(q) &&
      !r.bike_name.toLowerCase().includes(q)
    )
      return false;
    return true;
  });

  const activeCount = rentals.filter((r) => r.status === "active").length;
  const thisMonthRevenue = rentals
    .filter((r) => {
      const start = parseISO(r.start_date);
      const now = new Date();
      return (
        start.getMonth() === now.getMonth() &&
        start.getFullYear() === now.getFullYear() &&
        (r.status === "active" || r.status === "completed" || r.status === "overdue")
      );
    })
    .reduce((sum, r) => sum + Number(r.amount_paid || 0), 0);

  function exportCSV() {
    const headers = [
      "id",
      "bike_name",
      "customer_name",
      "customer_phone",
      "customer_email",
      "start_date",
      "end_date",
      "weeks",
      "weekly_rate",
      "total_amount",
      "amount_paid",
      "status",
      "payment_status",
    ];
    const rows = filtered.map((r) =>
      headers.map((h) => (r as unknown as Record<string, string>)[h] ?? "").join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rentals-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Rentals</h1>
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Rentals</h1>
        <Button asChild>
          <Link href="/rentals/add">
            <Plus className="mr-2 h-4 w-4" />
            New rental
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <p className="mb-3 text-sm text-muted-foreground">
          Active: {activeCount} · Collected rent this month: £{thisMonthRevenue.toFixed(2)}
        </p>
        <div className="flex flex-wrap gap-4">
          <Input
            placeholder="Search customer or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          <Select value={paymentFilter} onValueChange={(v) => setPaymentFilter(v ?? "all")}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All payments</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bike</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead>Weeks</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => {
              const overdue = isOverdue(r.end_date);
              const daysOverdue = getDaysOverdue(r.end_date);
              const dueToday =
                r.status === "active" &&
                format(parseISO(r.end_date), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
              const rowClass = cn(
                overdue && "bg-red-500/5",
                dueToday && !overdue && "bg-amber-500/5"
              );
              return (
                <TableRow key={r.id} className={rowClass}>
                  <TableCell className="font-medium">
                    <Link href={`/bikes/${r.bike_id}`} className="text-primary hover:underline">
                      {r.bike_name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {r.customer_name}
                    {r.customer_phone && (
                      <span className="block text-xs text-muted-foreground">{r.customer_phone}</span>
                    )}
                  </TableCell>
                  <TableCell>{r.start_date}</TableCell>
                  <TableCell>
                    {r.end_date}
                    {overdue && (
                      <span className="block text-xs text-red-600 dark:text-red-400">
                        {daysOverdue} days overdue
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{r.weeks}</TableCell>
                  <TableCell>£{r.weekly_rate}</TableCell>
                  <TableCell>£{r.total_amount}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {getWeeksPaid(Number(r.amount_paid || 0), Number(r.weekly_rate))}/{r.weeks} weeks
                  </TableCell>
                  <TableCell>
                    <RentalStatusBadge status={r.status} />
                  </TableCell>
                  <TableCell>
                    <PaymentStatusBadge status={r.payment_status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/rentals/${r.id}`}>View</Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/rentals/${r.id}/edit`}>Edit</Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(r.id)}
                        disabled={deletingId === r.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground">No rentals match your filters.</p>
      )}
    </div>
  );
}
