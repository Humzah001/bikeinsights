"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

const schema = z.object({
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

export default function EditRentalPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bikeName, setBikeName] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const startDate = watch("start_date");
  const endDate = watch("end_date");
  const weeklyRate = watch("weekly_rate");
  const weeks =
    startDate && endDate ? calculateWeeks(startDate, endDate) : 0;
  const totalAmount =
    startDate && endDate && weeklyRate
      ? calculateTotalAmount(startDate, endDate, Number(weeklyRate))
      : 0;

  useEffect(() => {
    fetch(`/api/rentals/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((rental: Record<string, string>) => {
        setBikeName(rental.bike_name || "");
        setValue("customer_name", rental.customer_name || "");
        setValue("customer_phone", rental.customer_phone || "");
        setValue("customer_email", rental.customer_email || "");
        setValue("start_date", rental.start_date || "");
        setValue("end_date", rental.end_date || "");
        setValue("weekly_rate", rental.weekly_rate || "");
        setValue("payment_status", (rental.payment_status as FormData["payment_status"]) || "pending");
        setValue("notes", rental.notes || "");
      })
      .catch(() => {
        toast.error("Rental not found");
        router.push("/rentals");
      })
      .finally(() => setLoading(false));
  }, [id, router, setValue]);

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/rentals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        throw new Error(err.error || "Failed to update");
      }
      toast.success("Rental updated");
      router.push(`/rentals/${id}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update rental");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/rentals">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to rentals
          </Link>
        </Button>
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/rentals/${id}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to rental
        </Link>
      </Button>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Edit rental</CardTitle>
          <CardDescription>
            {bikeName && <span className="font-medium text-foreground">{bikeName}</span>}
            {bikeName && " · "}
            Update rental details below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Bike</Label>
              <Input value={bikeName} readOnly className="bg-muted" />
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
                {submitting ? "Saving…" : "Save changes"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href={`/rentals/${id}`}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
