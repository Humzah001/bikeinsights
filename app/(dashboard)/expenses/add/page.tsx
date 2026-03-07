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
import type { Bike } from "@/lib/types";

const schema = z.object({
  bike_id: z.string(),
  bike_name: z.string(),
  category: z.enum(["fuel", "storage", "insurance", "accessories", "cleaning", "other"]),
  description: z.string(),
  amount: z.string(),
  date: z.string().min(1, "Date required"),
  notes: z.string(),
});

type FormData = z.infer<typeof schema>;

function AddExpenseForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedBikeId = searchParams.get("bike_id");
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: "other", bike_id: "", bike_name: "" },
  });

  useEffect(() => {
    fetch("/api/bikes")
      .then((r) => r.json())
      .then((data: Bike[]) => {
        setBikes(data);
        if (preselectedBikeId) {
          const b = data.find((x) => x.id === preselectedBikeId);
          if (b) {
            setValue("bike_id", b.id);
            setValue("bike_name", b.name);
          }
        }
      })
      .catch(() => {});
  }, [preselectedBikeId, setValue]);

  const bikeId = watch("bike_id");
  useEffect(() => {
    if (bikeId) {
      const b = bikes.find((x) => x.id === bikeId);
      if (b) setValue("bike_name", b.name);
    } else setValue("bike_name", "");
  }, [bikeId, bikes, setValue]);

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bike_id: data.bike_id || "",
          bike_name: data.bike_name || "",
          category: data.category,
          description: data.description,
          amount: Number(data.amount) || 0,
          date: data.date,
          notes: data.notes,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Expense added");
      router.push("/expenses");
      router.refresh();
    } catch {
      toast.error("Failed to add expense");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/expenses">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to expenses
        </Link>
      </Button>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Add expense</CardTitle>
          <CardDescription>Log an expense (bike-specific or general).</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Bike (or General)</Label>
              <Select value={watch("bike_id") || "general"} onValueChange={(v) => setValue("bike_id", v === "general" ? "" : (v ?? ""))}>
                <SelectTrigger>
                  <SelectValue placeholder="General / Select bike" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General / Business</SelectItem>
                  {bikes.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={watch("category")} onValueChange={(v) => setValue("category", v as FormData["category"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fuel">Fuel</SelectItem>
                  <SelectItem value="storage">Storage</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="accessories">Accessories</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" {...register("description")} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (£)</Label>
                <Input id="amount" type="number" step="0.01" {...register("amount")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input id="date" type="date" {...register("date")} />
                {errors.date && (
                  <p className="text-sm text-destructive">{errors.date.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" {...register("notes")} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Adding…" : "Add expense"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/expenses">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AddExpensePage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <AddExpenseForm />
    </Suspense>
  );
}
