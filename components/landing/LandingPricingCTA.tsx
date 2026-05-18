"use client";

import { Button } from "@/components/ui/button";

const STORAGE_KEY = "bikeinsights_lead_plan";

export type LandingLeadPlan = "trial" | "monthly";

export function LandingPricingCTA({
  plan,
  label,
  variant = "default",
}: {
  plan: LandingLeadPlan;
  label: string;
  variant?: "default" | "secondary";
}) {
  return (
    <Button
      type="button"
      variant={variant}
      className="h-11 w-full"
      size="lg"
      onClick={() => {
        try {
          sessionStorage.setItem(STORAGE_KEY, plan);
        } catch {
          /* ignore */
        }
        document.getElementById("inquiry-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
        window.setTimeout(() => document.getElementById("lead-name")?.focus(), 350);
      }}
    >
      {label}
    </Button>
  );
}
