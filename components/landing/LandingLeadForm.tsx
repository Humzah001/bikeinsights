"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "bikeinsights_lead_plan";

const schema = z.object({
  name: z.string().min(1, "Enter your name").max(120),
  email: z.string().email("Enter a valid email").max(254),
  shopName: z.string().max(200).optional(),
  phone: z.string().max(40).optional(),
  plan: z.enum(["trial", "monthly", "unsure"]),
  message: z.string().max(2000).optional(),
  website: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function LandingLeadForm({ className }: { className?: string }) {
  const appliedStorage = useRef(false);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      shopName: "",
      phone: "",
      plan: "unsure",
      message: "",
      website: "",
    },
  });

  useEffect(() => {
    if (appliedStorage.current || typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw === "trial" || raw === "monthly") {
        form.setValue("plan", raw);
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* ignore */
    }
    appliedStorage.current = true;
  }, [form]);

  async function onSubmit(data: FormValues) {
    setStatus("sending");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name.trim(),
          email: data.email.trim(),
          shopName: data.shopName?.trim(),
          phone: data.phone?.trim(),
          plan: data.plan,
          message: data.message?.trim(),
          website: data.website,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: unknown; ok?: boolean };
      if (!res.ok) {
        setStatus("error");
        const err = payload.error;
        const msg =
          typeof err === "string"
            ? err
            : err && typeof err === "object"
              ? "Please check the highlighted fields."
              : "Something went wrong. Please try email.";
        setErrorMessage(msg);
        return;
      }
      setStatus("success");
      form.reset({
        name: "",
        email: "",
        shopName: "",
        phone: "",
        plan: "unsure",
        message: "",
        website: "",
      });
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Please try again or email us directly.");
    }
  }

  return (
    <div
      id="inquiry-form"
      className={cn(
        "relative scroll-mt-20 rounded-2xl border border-border/70 bg-card p-6 shadow-sm sm:p-8",
        className
      )}
    >
      <h3 className="text-lg font-semibold tracking-tight">Request a workspace</h3>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
        Send your details and which plan you want. We reply within about one business day. Fields marked * are required.
      </p>

      {status === "success" ? (
        <div className="mt-6 space-y-4">
          <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-800 dark:text-green-200">
            Thanks, your message is sent. We will get back to you soon.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => setStatus("idle")}>
            Send another request
          </Button>
        </div>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lead-name">Your name *</Label>
              <Input id="lead-name" autoComplete="name" aria-invalid={!!form.formState.errors.name} {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-destructive text-xs">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead-email">Work email *</Label>
              <Input
                id="lead-email"
                type="email"
                autoComplete="email"
                aria-invalid={!!form.formState.errors.email}
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-destructive text-xs">{form.formState.errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lead-shop">Shop or business name</Label>
              <Input id="lead-shop" autoComplete="organization" {...form.register("shopName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead-phone">Phone (optional)</Label>
              <Input id="lead-phone" type="tel" autoComplete="tel" {...form.register("phone")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead-plan">Plan you are interested in *</Label>
            <select
              id="lead-plan"
              className={cn(
                "border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
              )}
              {...form.register("plan")}
            >
              <option value="trial">15-day trial (free)</option>
              <option value="monthly">Workspace monthly (€150 / month)</option>
              <option value="unsure">Not sure yet / ask me</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead-message">Anything else?</Label>
            <textarea
              id="lead-message"
              rows={4}
              placeholder="Fleet size, locations, timeline, or questions."
              className={cn(
                "border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[100px] w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 dark:bg-input/30"
              )}
              {...form.register("message")}
            />
          </div>

          {/* Honeypot */}
          <div className="pointer-events-none absolute left-[-9999px] top-0 opacity-0" aria-hidden>
            <Label htmlFor="lead-website">Website</Label>
            <Input id="lead-website" tabIndex={-1} autoComplete="off" {...form.register("website")} />
          </div>

          {status === "error" && errorMessage && (
            <p className="text-destructive text-sm" role="alert">
              {errorMessage}
            </p>
          )}

          <Button type="submit" size="lg" disabled={status === "sending"} className="w-full sm:w-auto">
            {status === "sending" ? "Sending…" : "Send request"}
          </Button>
        </form>
      )}
    </div>
  );
}
