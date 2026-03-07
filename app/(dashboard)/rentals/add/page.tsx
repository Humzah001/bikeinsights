"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { calculateWeeks, calculateTotalAmount } from "@/lib/calculations";
import type { Bike } from "@/lib/types";

const schema = z.object({
  bike_id: z.string().min(1, "Select a bike"),
  customer_name: z.string().min(1, "Customer name required"),
  customer_phone: z.string(),
  customer_email: z.string(),
  start_date: z.string().min(1, "Start date required"),
  end_date: z.string().min(1, "End date required"),
  weekly_rate: z.string(),
  payment_status: z.enum(["paid", "pending", "partial"]),
  notes: z.string(),
});

type FormData = z.infer<typeof schema>;

function AddRentalForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedBikeId = searchParams.get("bike_id");
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      payment_status: "pending",
      weekly_rate: "",
    },
  });

  const startDate = watch("start_date");
  const endDate = watch("end_date");
  const weeklyRate = watch("weekly_rate");
  const bikeId = watch("bike_id");

  const weeks =
    startDate && endDate
      ? calculateWeeks(startDate, endDate)
      : 0;
  const totalAmount =
    startDate && endDate && weeklyRate
      ? calculateTotalAmount(startDate, endDate, Number(weeklyRate))
      : 0;

  useEffect(() => {
    fetch("/api/bikes")
      .then((r) => r.json())
      .then((data: Bike[]) => {
        setBikes(data.filter((b) => b.status === "available"));
        if (preselectedBikeId) {
          const b = data.find((x) => x.id === preselectedBikeId);
          if (b) {
            setValue("bike_id", b.id);
            setValue("weekly_rate", b.weekly_rate || "");
          }
        }
      })
      .catch(() => {});
  }, [preselectedBikeId, setValue]);

  useEffect(() => {
    if (bikeId && !weeklyRate) {
      const b = bikes.find((x) => x.id === bikeId);
      if (b) setValue("weekly_rate", b.weekly_rate || "");
    }
  }, [bikeId, bikes, weeklyRate, setValue]);

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    try {
      const bike = bikes.find((b) => b.id === data.bike_id);
      const res = await fetch("/api/rentals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bike_id: data.bike_id,
          bike_name: bike?.name ?? "",
          customer_name: data.customer_name,
          customer_phone: data.customer_phone,
          customer_email: data.customer_email || "",
          start_date: data.start_date,
          end_date: data.end_date,
          weekly_rate: Number(data.weekly_rate),
          payment_status: data.payment_status,
          notes: data.notes,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create rental");
      }
      const rental = await res.json();
      toast.success("Rental created");
      router.push(`/rentals/${rental.id}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create rental");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/rentals">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to rentals
        </Link>
      </Button>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>New rental</CardTitle>
          <CardDescription>Create a new rental. Only available bikes are listed.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Bike *</Label>
              <Select
                value={bikeId || undefined}
                onValueChange={(v) => setValue("bike_id", v ?? "")}
              >
                <SelectTrigger className="w-full min-w-[200px]">
                  <SelectValue placeholder="Select bike" />
                </SelectTrigger>
                <SelectContent className="min-w-[280px]">
                  {bikes.length === 0 ? (
                    <SelectItem value="__none__" disabled className="pointer-events-none">
                      No available bikes. Add a bike first from the Bikes page.
                    </SelectItem>
                  ) : (
                    bikes.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} — £{b.weekly_rate}/week
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.bike_id && (
                <p className="text-sm text-destructive">{errors.bike_id.message}</p>
              )}
              {bikes.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  <Link href="/bikes/add" className="text-primary hover:underline">
                    Add your first bike →
                  </Link>
                </p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customer_name">Customer name *</Label>
                <Input id="customer_name" {...register("customer_name")} />
                {errors.customer_name && (
                  <p className="text-sm text-destructive">{errors.customer_name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer_phone">Phone</Label>
                <Input id="customer_phone" {...register("customer_phone")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_email">Email</Label>
              <Input id="customer_email" type="email" {...register("customer_email")} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start date *</Label>
                <Input id="start_date" type="date" {...register("start_date")} />
                {errors.start_date && (
                  <p className="text-sm text-destructive">{errors.start_date.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End date *</Label>
                <Input id="end_date" type="date" {...register("end_date")} />
                {errors.end_date && (
                  <p className="text-sm text-destructive">{errors.end_date.message}</p>
                )}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="weekly_rate">Weekly rate (£)</Label>
                <Input
                  id="weekly_rate"
                  type="number"
                  step="0.01"
                  {...register("weekly_rate")}
                />
              </div>
              <div className="space-y-2">
                <Label>Weeks</Label>
                <Input value={weeks} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Total amount</Label>
                <Input value={`£${totalAmount.toFixed(2)}`} readOnly className="bg-muted" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Payment status</Label>
              <Select
                value={watch("payment_status")}
                onValueChange={(v) => setValue("payment_status", v as FormData["payment_status"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" {...register("notes")} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create rental"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/rentals">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AddRentalPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <AddRentalForm />
    </Suspense>
  );
}
