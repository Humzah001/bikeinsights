"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BikeCard } from "@/components/bikes/BikeCard";
import type { Bike, Rental } from "@/lib/types";
import { Plus } from "lucide-react";

type FilterStatus = "all" | "available" | "rented" | "under_repair" | "retired";

export default function BikesPage() {
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/bikes").then((r) => r.json()),
      fetch("/api/rentals").then((r) => r.json()),
    ])
      .then(([b, r]) => {
        setBikes(b);
        setRentals(r);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeRentalByBikeId = rentals.reduce<Record<string, string>>((acc, r) => {
    if (r.status === "active" || r.status === "overdue" || r.status === "inactive") acc[r.bike_id] = r.customer_name;
    return acc;
  }, {});

  const filtered = bikes.filter((b) => {
    if (filter !== "all" && b.status !== filter) return false;
    const q = search.toLowerCase();
    if (
      q &&
      !b.name.toLowerCase().includes(q) &&
      !(b.serial_number && b.serial_number.toLowerCase().includes(q))
    )
      return false;
    return true;
  });

  const totalBikes = bikes.length;
  const earningThisWeek = rentals
    .filter((r) => r.status === "active" || r.status === "overdue" || r.status === "inactive")
    .reduce((sum, r) => sum + Number(r.weekly_rate), 0);
  const idleBikes = bikes.filter((b) => b.status === "available").length;

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Bikes</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Bikes</h1>
        <Button asChild>
          <Link href="/bikes/add">
            <Plus className="mr-2 h-4 w-4" />
            Add bike
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Total: {totalBikes} bikes · Earning this week: £{earningThisWeek.toFixed(2)} · Idle: {idleBikes}
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Input
            placeholder="Search by name or serial number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterStatus)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="available">Available</TabsTrigger>
              <TabsTrigger value="rented">Rented</TabsTrigger>
              <TabsTrigger value="under_repair">Repair</TabsTrigger>
              <TabsTrigger value="retired">Retired</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((bike) => (
          <BikeCard
            key={bike.id}
            bike={bike}
            currentRenter={activeRentalByBikeId[bike.id] || null}
          />
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground">No bikes match your filters.</p>
      )}
    </div>
  );
}
