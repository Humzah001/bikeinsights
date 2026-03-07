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
import { Badge } from "@/components/ui/badge";
import type { Repair, Bike } from "@/lib/types";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RepairsPage() {
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [bikeFilter, setBikeFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this repair?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/repairs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setRepairs((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/repairs").then((r) => r.json()),
      fetch("/api/bikes").then((r) => r.json()),
    ])
      .then(([r, b]) => {
        setRepairs(r);
        setBikes(b);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = repairs.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (bikeFilter !== "all" && r.bike_id !== bikeFilter) return false;
    return true;
  });

  const totalCost = repairs.reduce((sum, r) => sum + Number(r.cost), 0);

  const statusClass: Record<string, string> = {
    pending: "bg-red-500/20 text-red-600 dark:text-red-400",
    in_progress: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
    completed: "bg-green-500/20 text-green-600 dark:text-green-400",
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Repairs</h1>
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Repairs</h1>
        <Button asChild>
          <Link href="/repairs/add">
            <Plus className="mr-2 h-4 w-4" />
            Add repair
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <p className="text-lg font-semibold">Total repair costs: £{totalCost.toFixed(2)}</p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-4">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={bikeFilter} onValueChange={(v) => setBikeFilter(v ?? "all")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Bike" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All bikes</SelectItem>
            {bikes.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bike</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Shop</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">
                  <Link href={`/bikes/${r.bike_id}`} className="text-primary hover:underline">
                    {r.bike_name}
                  </Link>
                </TableCell>
                <TableCell>{r.description}</TableCell>
                <TableCell>{r.repair_date}</TableCell>
                <TableCell>£{r.cost}</TableCell>
                <TableCell>{r.repair_shop}</TableCell>
                <TableCell>
                  <Badge className={cn(statusClass[r.status])}>{r.status.replace("_", " ")}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/repairs/${r.id}/edit`}>Edit</Link>
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
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
