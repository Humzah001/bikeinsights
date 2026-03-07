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
  bike_id: z.string().min(1, "Select a bike"),
  description: z.string().min(1, "Description required"),
  repair_date: z.string().min(1, "Date required"),
  cost: z.string(),
  repair_shop: z.string(),
  status: z.enum(["pending", "in_progress", "completed"]),
  notes: z.string(),
});

type FormData = z.infer<typeof schema>;

function AddRepairForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedBikeId = searchParams.get("bike_id");
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: "pending" },
  });

  useEffect(() => {
    fetch("/api/bikes")
      .then((r) => r.json())
      .then((data: Bike[]) => {
        setBikes(data);
        if (preselectedBikeId) setValue("bike_id", preselectedBikeId);
      })
      .catch(() => {});
  }, [preselectedBikeId, setValue]);

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    try {
      const bike = bikes.find((b) => b.id === data.bike_id);
      const res = await fetch("/api/repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bike_id: data.bike_id,
          bike_name: bike?.name ?? "",
          description: data.description,
          repair_date: data.repair_date,
          cost: Number(data.cost) || 0,
          repair_shop: data.repair_shop,
          status: data.status,
          notes: data.notes,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Repair added");
      router.push("/repairs");
      router.refresh();
    } catch {
      toast.error("Failed to add repair");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/repairs">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to repairs
        </Link>
      </Button>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Add repair</CardTitle>
          <CardDescription>Log a repair for a bike.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Bike *</Label>
              <Select value={watch("bike_id")} onValueChange={(v) => setValue("bike_id", v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bike" />
                </SelectTrigger>
                <SelectContent>
                  {bikes.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.bike_id && (
                <p className="text-sm text-destructive">{errors.bike_id.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Input id="description" {...register("description")} />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="repair_date">Date *</Label>
                <Input id="repair_date" type="date" {...register("repair_date")} />
                {errors.repair_date && (
                  <p className="text-sm text-destructive">{errors.repair_date.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost">Cost (£)</Label>
                <Input id="cost" type="number" step="0.01" {...register("cost")} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="repair_shop">Repair shop</Label>
                <Input id="repair_shop" {...register("repair_shop")} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={watch("status")} onValueChange={(v) => setValue("status", v as FormData["status"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" {...register("notes")} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Adding…" : "Add repair"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/repairs">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AddRepairPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <AddRepairForm />
    </Suspense>
  );
}
