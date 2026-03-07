"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
});

type FormData = z.infer<typeof schema>;

export default function AddBikePage() {
  const router = useRouter();
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
      status: "available",
      purchase_price: "",
      weekly_rate: "",
    },
  });

  const status = watch("status");

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/bikes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          purchase_price: data.purchase_price ? Number(data.purchase_price) : 0,
          weekly_rate: data.weekly_rate ? Number(data.weekly_rate) : 0,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add bike");
      }
      const bike = await res.json();
      toast.success("Bike added");
      router.push(`/bikes/${bike.id}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add bike");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/bikes">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to bikes
        </Link>
      </Button>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Add bike</CardTitle>
          <CardDescription>Add a new bike to your fleet.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" {...register("name")} placeholder="e.g. Electric Cruiser A" />
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
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchase_date">Purchase date</Label>
                <Input id="purchase_date" type="date" {...register("purchase_date")} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="purchase_price">Purchase price (£)</Label>
                <Input
                  id="purchase_price"
                  type="number"
                  step="0.01"
                  {...register("purchase_price")}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Initial status</Label>
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
            <div className="space-y-2">
              <Label htmlFor="tracker_share_url">Apple AirTag share URL</Label>
              <Input
                id="tracker_share_url"
                {...register("tracker_share_url")}
                placeholder="https://www.icloud.com/findmy/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" {...register("notes")} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Adding…" : "Add bike"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/bikes">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
