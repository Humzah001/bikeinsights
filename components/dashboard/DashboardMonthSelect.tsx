"use client";

import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function DashboardMonthSelect({
  value,
  options,
}: {
  value: string;
  options: { value: string; label: string }[];
}) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <Label htmlFor="dash-month" className="shrink-0 text-sm text-muted-foreground">
        Month
      </Label>
      <Select
        value={value}
        onValueChange={(v) => {
          if (v == null) return;
          router.push(`/dashboard?month=${encodeURIComponent(v)}`);
        }}
      >
        <SelectTrigger id="dash-month" className="w-full min-w-[200px] sm:w-[240px]">
          <SelectValue placeholder="Select month" />
        </SelectTrigger>
        <SelectContent className="max-h-[min(320px,70vh)]">
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
