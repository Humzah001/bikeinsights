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
              A simple path from “interested” to running your shop in the app, no technical steps required on your side.
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
            <StepCard step={1} title="Tell us you are ready">
              <p className="text-muted-foreground">
                Whether you want the free trial or the monthly plan, send one message and we will set up your workspace
                and send invitations to your team when everything is ready.
              </p>
              <p className="text-muted-foreground mt-3">
                Write to{" "}
                <a href={mailto} className="font-medium text-foreground underline-offset-4 hover:underline">
                  {contactEmail}
                </a>{" "}
                from the inbox you use for the business.
              </p>
              <Button className="mt-4 w-full sm:w-auto" variant="outline" size="sm" asChild>
                <a href={mailto}>Open your email app</a>
              </Button>
            </StepCard>
          ) : (
            <StepCard step={1} title="Open your invitation">
              <p className="text-muted-foreground">
                Look for an email from My Bike Insights and tap the button or link inside. That takes you to a secure
                page just for finishing your account, tied to your shop.
              </p>
              <p className="text-muted-foreground mt-3">
                Cannot find it? Check spam, or ask whoever invited you to send it again.
              </p>
            </StepCard>
          )}

          <StepCard step={2} title="Finish your account">
            <p className="text-muted-foreground">
              On that page you will enter your name, phone, and a password you choose. When you submit, you are part of
              the workspace and can sign in anytime.
            </p>
            <p className="text-muted-foreground mt-3">
              Keep the tab open until you see confirmation; if it expired, ask your admin for a fresh invite.
            </p>
            <Button className="mt-4 w-full sm:w-auto" variant="outline" size="sm" asChild>
              <Link href="/invite/accept">I need the signup screen</Link>
            </Button>
          </StepCard>

          <StepCard step={3} title="Sign in and get to work">
            <p className="text-muted-foreground">
              Next time, open the app with your work email and password. You will land in your dashboard so you can add
              bikes, rentals, and record payments like you already do at the desk.
            </p>
            <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
              If a page will not load, try turning off strict content blockers for this site once, or write us and we
              will sort it out.
            </p>
            <Button className="mt-4 w-full sm:w-auto" size="sm" asChild>
              <Link href="/login">Sign in to the app</Link>
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
