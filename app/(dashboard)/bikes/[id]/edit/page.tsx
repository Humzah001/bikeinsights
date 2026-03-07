"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
  name: z.string().min(1, "Name is required"),
  brand: z.string(),
  model: z.string(),
  color: z.string(),
  serial_number: z.string(),
  status: z.enum(["available", "rented", "under_repair", "retired"]),
  purchase_date: z.string(),
  purchase_price: z.string(),
  weekly_rate: z.string(),
  tracker_share_url: z.string(),
  notes: z.string(),
  last_latitude: z.string().optional(),
  last_longitude: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function EditBikePage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const status = watch("status");

  useEffect(() => {
    fetch(`/api/bikes/${id}`)
      .then((r) => r.json())
      .then((bike: Bike) => {
        setValue("name", bike.name);
        setValue("brand", bike.brand);
        setValue("model", bike.model);
        setValue("color", bike.color);
        setValue("serial_number", bike.serial_number);
        setValue("status", bike.status);
        setValue("purchase_date", bike.purchase_date || "");
        setValue("purchase_price", bike.purchase_price || "");
        setValue("weekly_rate", bike.weekly_rate || "");
        setValue("tracker_share_url", bike.tracker_share_url || "");
        setValue("notes", bike.notes || "");
        setValue("last_latitude", bike.last_latitude || "");
        setValue("last_longitude", bike.last_longitude || "");
      })
      .catch(() => toast.error("Failed to load bike"))
      .finally(() => setLoading(false));
  }, [id, setValue]);

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/bikes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          purchase_price: data.purchase_price ? Number(data.purchase_price) : 0,
          weekly_rate: data.weekly_rate ? Number(data.weekly_rate) : 0,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Bike updated");
      router.push(`/bikes/${id}`);
      router.refresh();
    } catch {
      toast.error("Failed to update bike");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/bikes/${id}`}>← Back</Link>
        </Button>
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/bikes/${id}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to bike
        </Link>
      </Button>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Edit bike</CardTitle>
          <CardDescription>Update bike details.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" {...register("name")} />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="serial_number">Serial number</Label>
                <Input id="serial_number" {...register("serial_number")} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Input id="brand" {...register("brand")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input id="model" {...register("model")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input id="color" {...register("color")} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
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
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setValue("status", v as FormData["status"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="rented">Rented</SelectItem>
                    <SelectItem value="under_repair">Under repair</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="purchase_date">Purchase date</Label>
                <Input id="purchase_date" type="date" {...register("purchase_date")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchase_price">Purchase price (£)</Label>
                <Input
                  id="purchase_price"
                  type="number"
                  step="0.01"
                  {...register("purchase_price")}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tracker_share_url">Apple AirTag share URL</Label>
              <Input id="tracker_share_url" {...register("tracker_share_url")} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="last_latitude">Last known latitude</Label>
                <Input id="last_latitude" {...register("last_latitude")} placeholder="e.g. 51.5074" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_longitude">Last known longitude</Label>
                <Input id="last_longitude" {...register("last_longitude")} placeholder="e.g. -0.1278" />
              </div>
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
                <Link href={`/bikes/${id}`}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
