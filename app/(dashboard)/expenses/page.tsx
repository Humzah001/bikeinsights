"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent } from "@/components/ui/card";
import type { Expense, Bike } from "@/lib/types";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { Plus, Trash2 } from "lucide-react";

const CATEGORIES = ["fuel", "storage", "insurance", "accessories", "cleaning", "other"] as const;

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [bikeFilter, setBikeFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this expense?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/expenses").then((r) => r.json()),
      fetch("/api/bikes").then((r) => r.json()),
    ])
      .then(([e, b]) => {
        setExpenses(e);
        setBikes(b);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = expenses.filter((e) => {
    if (categoryFilter !== "all" && e.category !== categoryFilter) return false;
    if (bikeFilter !== "all") {
      if (bikeFilter === "general" && e.bike_id) return false;
      if (bikeFilter !== "general" && e.bike_id !== bikeFilter) return false;
    }
    return true;
  });

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const thisMonthTotal = expenses
    .filter((e) => {
      const d = parseISO(e.date);
      return d >= monthStart && d <= monthEnd;
    })
    .reduce((sum, e) => sum + Number(e.amount), 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Expenses</h1>
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Expenses</h1>
        <Button asChild>
          <Link href="/expenses/add">
            <Plus className="mr-2 h-4 w-4" />
            Add expense
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <p className="text-lg font-semibold">
            This month ({format(now, "MMMM yyyy")}): £{thisMonthTotal.toFixed(2)}
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-4">
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "all")}>
          <SelectTrigger className="w-full min-w-0 sm:w-[140px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={bikeFilter} onValueChange={(v) => setBikeFilter(v ?? "all")}>
          <SelectTrigger className="w-full min-w-0 sm:w-[180px]">
            <SelectValue placeholder="Bike" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="general">General</SelectItem>
            {bikes.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead>Bike</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">
                  {e.bike_name || "General"}
                </TableCell>
                <TableCell>{e.category}</TableCell>
                <TableCell>{e.description}</TableCell>
                <TableCell>£{e.amount}</TableCell>
                <TableCell>{e.date}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(e.id)}
                    disabled={deletingId === e.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
