"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BackNavButton } from "@/components/navigation/BackNavButton";
import { EbikeFormFields, ebikeFormDefaults, ebikeZodSchema } from "@/components/bikes/EbikeFormFields";
import { defaultRentPackages } from "@/lib/rent-packages";
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
import { userFacingThrownError } from "@/lib/user-facing-error";
import {
  MAX_BIKE_MEDIA_FILES_PER_BIKE,
  capToSingleVideoTotal,
  mergePendingMediaFiles,
  uploadBikeMediaFiles,
} from "@/lib/upload-bike-media-client";

const schema = z
  .object({
    name: z.string().min(1, "Name is required"),
    brand: z.string(),
    model: z.string(),
    color: z.string(),
    serial_number: z.string(),
    status: z.enum(["available", "rented", "under_repair", "retired"]),
    purchase_date: z.string(),
    purchase_price: z.string(),
    notes: z.string(),
  })
  .merge(ebikeZodSchema);

type FormData = z.infer<typeof schema>;

export default function AddBikePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: "available",
      purchase_price: "",
      ...ebikeFormDefaults,
      rent_packages: defaultRentPackages(),
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
          rent_packages: data.rent_packages,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add bike");
      }
      const bike = await res.json();
      if (pendingFiles.length > 0) {
        const media = await uploadBikeMediaFiles(bike.id, pendingFiles);
        if (!media.ok) {
          if (media.uploaded > 0) {
            toast.warning(
              `Uploaded ${media.uploaded} of ${pendingFiles.length} file(s). ${media.error} You can add the rest from Edit bike.`
            );
          } else {
            toast.error(
              `${media.error} Your bike was saved — you can add photos or videos from the bike’s edit page.`
            );
          }
        } else if (media.uploaded > 1) {
          toast.success(`Bike added with ${media.uploaded} photos/videos`);
        } else {
          toast.success("Bike and media added");
        }
      } else {
        toast.success("Bike added");
      }
      router.push(`/bikes/${bike.id}`);
      router.refresh();
    } catch (e) {
      toast.error(userFacingThrownError(e, "Could not add bike"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <BackNavButton href="/bikes">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to bikes
      </BackNavButton>
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
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
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
            <EbikeFormFields register={register} setValue={setValue} control={control} watch={watch} getValues={getValues} />
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" {...register("notes")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bike-media">Photos & videos (optional, multiple allowed)</Label>
              <input
                id="bike-media"
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                multiple
                className="text-muted-foreground flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background file:mr-4 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-sm file:font-medium"
                onChange={(e) => {
                  const picked = e.target.files ? Array.from(e.target.files) : [];
                  let merged = mergePendingMediaFiles(pendingFiles, picked);
                  const capped = capToSingleVideoTotal(merged);
                  if (capped.droppedExtraVideos > 0) {
                    toast.message("Only one video per bike. Extra videos were removed from the queue.");
                  }
                  merged = capped.files;
                  if (merged.length > MAX_BIKE_MEDIA_FILES_PER_BIKE) {
                    toast.warning(
                      `You can add at most ${MAX_BIKE_MEDIA_FILES_PER_BIKE} files per bike. Extra files were not queued.`
                    );
                    setPendingFiles(merged.slice(0, MAX_BIKE_MEDIA_FILES_PER_BIKE));
                  } else {
                    setPendingFiles(merged);
                  }
                  e.target.value = "";
                }}
              />
              <p className="text-xs text-muted-foreground">
                Mix images and one video per bike. Select many images at once (Shift or Ctrl/⌘-click), or choose
                again to add more — up to {MAX_BIKE_MEDIA_FILES_PER_BIKE} files per bike. JPEG, PNG, WebP, MP4,
                WebM, or QuickTime; uploaded to Supabase Storage after the bike is created. Images about 15 MB max each, videos
                about 120 MB max each.
              </p>
              {pendingFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {pendingFiles.length} file(s) queued
                    {pendingFiles.length > 1 ? " (all will upload after you save)" : ""}.
                  </p>
                  <ul className="max-h-32 overflow-y-auto rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    {pendingFiles.map((f) => (
                      <li key={`${f.name}-${f.size}-${f.lastModified}`} className="truncate py-0.5">
                        {f.type.startsWith("video/") ? "Video" : "Image"} · {f.name}
                      </li>
                    ))}
                  </ul>
                  <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setPendingFiles([])}>
                    Clear queued files
                  </Button>
                </div>
              )}
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
