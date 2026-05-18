"use client";

import type { Control, UseFormRegister, UseFormSetValue, UseFormGetValues, UseFormWatch } from "react-hook-form";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_RENT_PACKAGES } from "@/lib/rent-packages";
import { RentPackagesEditor } from "@/components/bikes/RentPackagesEditor";

const rentPackageSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  weekly_rate: z.string(),
  battery_count: z.union([z.literal(""), z.literal("1"), z.literal("2")]),
  battery_1_capacity_wh: z.string(),
  battery_2_capacity_wh: z.string(),
  max_range_km: z.string(),
});

export const ebikeZodSchema = z.object({
  tyre_size: z.string(),
  frame_height_cm: z.string(),
  motor_power_w: z.string(),
  rent_packages: z.array(rentPackageSchema).max(MAX_RENT_PACKAGES),
});

export type EbikeFieldsShape = z.infer<typeof ebikeZodSchema>;

export const ebikeFormDefaults: Omit<EbikeFieldsShape, "rent_packages"> = {
  tyre_size: "",
  frame_height_cm: "",
  motor_power_w: "",
};

export function EbikeFormFields({
  register,
  setValue,
  control,
  watch,
  getValues,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: UseFormSetValue<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  watch: UseFormWatch<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getValues: UseFormGetValues<any>;
}) {
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">E-bike & sizing (optional)</CardTitle>
        <CardDescription>
          Add rent <span className="font-medium text-foreground">packages</span> with weekly price, batteries (count and
          Wh), and optional estimated range (km) for that setup. Leave a package&apos;s price blank to hide it from public
          listings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tyre_size">Tyre size</Label>
            <Input id="tyre_size" {...register("tyre_size")} placeholder='e.g. 27.5" × 2.4' />
          </div>
          <div className="space-y-2">
            <Label htmlFor="frame_height_cm">Frame / standover height (cm)</Label>
            <Input id="frame_height_cm" {...register("frame_height_cm")} placeholder="e.g. 48" />
          </div>
        </div>

        <RentPackagesEditor
          control={control}
          register={register}
          setValue={setValue}
          watch={watch}
          getValues={getValues}
        />

        <div className="space-y-2">
          <Label htmlFor="motor_power_w">Motor power (W)</Label>
          <Input id="motor_power_w" {...register("motor_power_w")} placeholder="e.g. 250" />
        </div>
      </CardContent>
    </Card>
  );
}
