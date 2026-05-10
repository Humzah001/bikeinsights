"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type Path = "workspace" | "invited";

function StepCard({
  step,
  title,
  children,
  className,
}: {
  step: number;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-xl border border-border/70 bg-card/90 p-5 shadow-sm backdrop-blur-sm sm:p-6",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-sm font-semibold tabular-nums text-foreground"
          aria-hidden
        >
          {step}
        </span>
        <h3 className="pt-0.5 text-base font-semibold leading-snug tracking-tight">{title}</h3>
      </div>
      <div className="mt-4 flex-1 text-sm leading-relaxed">{children}</div>
    </article>
  );
}

export function LandingGetStarted({ contactEmail }: { contactEmail: string }) {
  const [path, setPath] = useState<Path>("workspace");
  const mailto = `mailto:${contactEmail}?subject=${encodeURIComponent("My Bike Insights - trial or workspace")}`;

  return (
    <section
      id="get-started"
      className="border-t border-border/60 bg-muted/20 py-16 scroll-mt-16 dark:bg-muted/10 sm:py-24"
      aria-labelledby="get-started-heading"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <h2 id="get-started-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Get started
            </h2>
            <p className="text-muted-foreground mt-3 text-pretty leading-relaxed">
              Three quick steps from first hello to running your shop in one clear place.
            </p>
          </div>
          <Tabs value={path} onValueChange={(v) => setPath(v as Path)} className="w-full shrink-0 lg:w-auto">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="workspace" className="flex-1 sm:flex-initial">
                New workspace
              </TabsTrigger>
              <TabsTrigger value="invited" className="flex-1 sm:flex-initial">
                I was invited
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {path === "workspace" ? (
            <StepCard step={1} title="Start with one message">
              <p className="text-muted-foreground">
                Trial or monthly plan? Tell us what you need. We set up your workspace and invite your team when it is
                ready.
              </p>
              <p className="text-muted-foreground mt-3">
                <a href={mailto} className="font-medium text-foreground underline-offset-4 hover:underline">
                  {contactEmail}
                </a>
              </p>
              <Button className="mt-4 w-full sm:w-auto" variant="outline" size="sm" asChild>
                <a href={mailto}>Email us</a>
              </Button>
            </StepCard>
          ) : (
            <StepCard step={1} title="Your invite is the key">
              <p className="text-muted-foreground">
                Open the My Bike Insights email and tap through. You join your shop in a few taps, no guesswork.
              </p>
              <p className="text-muted-foreground mt-3">
                Misplaced it? Peek at spam or ask your admin for a fresh invite.
              </p>
            </StepCard>
          )}

          <StepCard step={2} title="Make it yours">
            <p className="text-muted-foreground">
              Add your name, phone, and a strong password. One submit and you are on the team. If the link timed out,
              ask your admin for a fresh invite.
            </p>
          </StepCard>

          <StepCard step={3} title="Own the day from the dashboard">
            <p className="text-muted-foreground">
              Open the app with your work email. Bikes, rentals, and rent collection sit in one view built for a busy desk.
            </p>
            <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
              Page acting up? Ease off strict blockers once or write us, we fix it with you.
            </p>
            <Button className="mt-4 w-full sm:w-auto" size="sm" asChild>
              <Link href="/login">Open app</Link>
            </Button>
          </StepCard>
        </div>

        <p className="text-muted-foreground mt-8 text-center text-sm">
          Questions while onboarding?{" "}
          <Link href="#contact" className="text-foreground font-medium underline-offset-4 hover:underline">
            Contact us
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
