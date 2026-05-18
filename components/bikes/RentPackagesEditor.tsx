"use client";

import type { Control, UseFormRegister, UseFormSetValue, UseFormGetValues, UseFormWatch } from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { MAX_RENT_PACKAGES } from "@/lib/rent-packages";
import { v4 as uuidv4 } from "uuid";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

const noteTextareaClass = cn(
  "min-h-[4rem] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none transition-colors",
  "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30"
);

export function RentPackagesEditor({
  control,
  register,
  setValue,
  watch,
  getValues,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: UseFormSetValue<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  watch: UseFormWatch<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getValues: UseFormGetValues<any>;
}) {
  const { fields, append, remove, move } = useFieldArray({ control, name: "rent_packages", keyName: "_rhfId" });

  function addTier() {
    if (fields.length >= MAX_RENT_PACKAGES) return;
    append({
      id: uuidv4(),
      title: "",
      description: "",
      weekly_rate: "",
      battery_count: "",
      battery_1_capacity_wh: "",
      battery_2_capacity_wh: "",
      max_range_km: "",
    });
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 px-3 py-3 sm:px-4">
      <div>
        <p className="text-sm font-medium">Rent packages</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          One row per price tier. Set batteries and optional range per package so renters see what each price includes.
        </p>
      </div>

      <ul className="space-y-4">
        {fields.map((field, index) => (
          <PackageRow
            key={field._rhfId}
            index={index}
            fieldsLength={fields.length}
            register={register}
            setValue={setValue}
            watch={watch}
            getValues={getValues}
            remove={remove}
            move={move}
            noteTextareaClass={noteTextareaClass}
          />
        ))}
      </ul>

      <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={addTier} disabled={fields.length >= MAX_RENT_PACKAGES}>
        <Plus className="mr-2 h-4 w-4" />
        Add package
        {fields.length >= MAX_RENT_PACKAGES ? ` (max ${MAX_RENT_PACKAGES})` : ""}
      </Button>
    </div>
  );
}

function PackageRow({
  index,
  fieldsLength,
  register,
  setValue,
  watch,
  getValues,
  remove,
  move,
  noteTextareaClass,
}: {
  index: number;
  fieldsLength: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: UseFormSetValue<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  watch: UseFormWatch<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getValues: UseFormGetValues<any>;
  remove: (i: number) => void;
  move: (from: number, to: number) => void;
  noteTextareaClass: string;
}) {
  const batteryCount = watch(`rent_packages.${index}.battery_count` as const) as "" | "1" | "2" | undefined;
  const selectVal = batteryCount === "" || batteryCount == null ? "none" : batteryCount;

  return (
    <li className="space-y-3 rounded-md border border-border/80 bg-background/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Package {index + 1}</span>
        <div className="flex flex-wrap items-center gap-1">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={index === 0} onClick={() => move(index, index - 1)} aria-label="Move up">
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={index >= fieldsLength - 1} onClick={() => move(index, index + 1)} aria-label="Move down">
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            disabled={fieldsLength <= 1}
            onClick={() => remove(index)}
            aria-label="Remove package"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <input type="hidden" {...register(`rent_packages.${index}.id` as const)} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`rent-pkg-title-${index}`}>Title</Label>
          <Input id={`rent-pkg-title-${index}`} placeholder="e.g. Standard · two batteries" {...register(`rent_packages.${index}.title` as const)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`rent-pkg-rate-${index}`}>Weekly rate (£)</Label>
          <Input id={`rent-pkg-rate-${index}`} type="number" step="0.01" placeholder="Optional" {...register(`rent_packages.${index}.weekly_rate` as const)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`rent-pkg-desc-${index}`}>Description</Label>
        <textarea id={`rent-pkg-desc-${index}`} className={noteTextareaClass} placeholder="What's included in this tier" {...register(`rent_packages.${index}.description` as const)} />
      </div>

      <div className="space-y-2 rounded-md border border-dashed border-border/80 bg-muted/10 px-3 py-3">
        <Label className="text-muted-foreground">Batteries &amp; range for this package</Label>
        <Select
          value={selectVal}
          onValueChange={(v) => {
            const c = (v === "none" ? "" : v) as "" | "1" | "2";
            const b1 = String(getValues(`rent_packages.${index}.battery_1_capacity_wh` as const) ?? "").trim();
            const b2 = String(getValues(`rent_packages.${index}.battery_2_capacity_wh` as const) ?? "").trim();
            setValue(`rent_packages.${index}.battery_count` as const, c, { shouldDirty: true, shouldValidate: true });
            if (c === "") {
              setValue(`rent_packages.${index}.battery_1_capacity_wh` as const, "", { shouldDirty: true });
              setValue(`rent_packages.${index}.battery_2_capacity_wh` as const, "", { shouldDirty: true });
            } else if (c === "1") {
              setValue(`rent_packages.${index}.battery_1_capacity_wh` as const, b1 || b2, { shouldDirty: true });
              setValue(`rent_packages.${index}.battery_2_capacity_wh` as const, "", { shouldDirty: true });
            } else {
              setValue(`rent_packages.${index}.battery_1_capacity_wh` as const, b1, { shouldDirty: true });
              setValue(`rent_packages.${index}.battery_2_capacity_wh` as const, b2, { shouldDirty: true });
            }
          }}
        >
          <SelectTrigger className="w-full" id={`rent-pkg-bat-count-${index}`}>
            <SelectValue placeholder="Not specified" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Not specified</SelectItem>
            <SelectItem value="1">1 battery</SelectItem>
            <SelectItem value="2">2 batteries</SelectItem>
          </SelectContent>
        </Select>

        {batteryCount === "1" ? (
          <div className="space-y-2 pt-1">
            <Label htmlFor={`rent-pkg-b1-${index}`}>Battery capacity (Wh)</Label>
            <Input id={`rent-pkg-b1-${index}`} {...register(`rent_packages.${index}.battery_1_capacity_wh` as const)} placeholder="e.g. 500" />
          </div>
        ) : null}
        {batteryCount === "2" ? (
          <div className="grid gap-3 pt-1 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`rent-pkg-b1-${index}`}>Battery 1 (Wh)</Label>
              <Input id={`rent-pkg-b1-${index}`} {...register(`rent_packages.${index}.battery_1_capacity_wh` as const)} placeholder="e.g. 500" />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`rent-pkg-b2-${index}`}>Battery 2 (Wh)</Label>
              <Input id={`rent-pkg-b2-${index}`} {...register(`rent_packages.${index}.battery_2_capacity_wh` as const)} placeholder="e.g. 500" />
            </div>
          </div>
        ) : null}
        <div className="space-y-2 border-t border-border/60 pt-3">
          <Label htmlFor={`rent-pkg-range-${index}`}>Est. range (km) with this setup</Label>
          <Input
            id={`rent-pkg-range-${index}`}
            type="number"
            step="1"
            min="0"
            {...register(`rent_packages.${index}.max_range_km` as const)}
            placeholder="Optional, e.g. 80"
          />
        </div>
      </div>
    </li>
  );
}
