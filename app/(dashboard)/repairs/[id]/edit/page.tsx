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

const schema = z.object({
  description: z.string().min(1, "Description required"),
  repair_date: z.string().min(1, "Date required"),
  cost: z.string(),
  repair_shop: z.string(),
  status: z.enum(["pending", "in_progress", "completed"]),
  notes: z.string(),
});

type FormData = z.infer<typeof schema>;

export default function EditRepairPage() {
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

  useEffect(() => {
    fetch(`/api/repairs/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((repair: Record<string, string>) => {
        setBikeName(repair.bike_name || "");
        setValue("description", repair.description || "");
        setValue("repair_date", repair.repair_date || "");
        setValue("cost", repair.cost ?? "");
        setValue("repair_shop", repair.repair_shop || "");
        setValue("status", (repair.status as FormData["status"]) || "pending");
        setValue("notes", repair.notes || "");
      })
      .catch(() => {
        toast.error("Repair not found");
        router.push("/repairs");
      })
      .finally(() => setLoading(false));
  }, [id, router, setValue]);

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/repairs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: data.description,
          repair_date: data.repair_date,
          cost: Number(data.cost) || 0,
          repair_shop: data.repair_shop,
          status: data.status,
          notes: data.notes,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }
      toast.success("Repair updated");
      router.push("/repairs");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update repair");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/repairs">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to repairs
          </Link>
        </Button>
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
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
          <CardTitle>Edit repair</CardTitle>
          <CardDescription>
            {bikeName && <span className="font-medium text-foreground">{bikeName}</span>}
            {bikeName && " · "}
            Update repair details below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Bike</Label>
              <Input value={bikeName} readOnly className="bg-muted" />
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
                <Select
                  value={watch("status")}
                  onValueChange={(v) => setValue("status", v as FormData["status"])}
                >
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
                {submitting ? "Saving…" : "Save changes"}
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
