"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type Path = "workspace" | "invited";

function CopyBlock({ text, toastLabel = "Copied to clipboard" }: { text: string; toastLabel?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(toastLabel);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy");
    }
  }

  return (
    <div className="relative mt-3 rounded-lg border border-border/70 bg-muted/60 dark:bg-muted/25">
      <pre className="max-h-40 overflow-x-auto overflow-y-auto break-words p-3 pr-12 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-foreground">
        <code>{text}</code>
      </pre>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute top-1.5 right-1.5 text-muted-foreground hover:text-foreground"
        onClick={handleCopy}
        aria-label="Copy to clipboard"
      >
        {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      </Button>
    </div>
  );
}

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
              To launch your workspace and collect your first rents in the app, follow these steps.
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
            <StepCard step={1} title="Contact us">
              <p className="text-muted-foreground">
                Start with a free 15-day trial or the paid plan. Send one email and we will create your workspace and
                invites.
              </p>
              <CopyBlock text={contactEmail} toastLabel="Email copied" />
            </StepCard>
          ) : (
            <StepCard step={1} title="Open your invite">
              <p className="text-muted-foreground">
                Use the link in your invitation email from My Bike Insights. It opens the secure accept page for your
                shop.
              </p>
              <CopyBlock text="/invite/accept" toastLabel="Path copied" />
              <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                Your real link includes a token; only use the message from your inbox.
              </p>
            </StepCard>
          )}

          <StepCard step={2} title="Complete signup">
            <p className="text-muted-foreground">
              On the accept page, add your name, phone, and password. That finishes your account and attaches you to the
              workspace.
            </p>
            <CopyBlock text="/invite/accept" toastLabel="Path copied" />
            <Link
              href="/invite/accept"
              className="text-primary mt-3 inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
            >
              Open invite accept page
              <ExternalLink className="size-3.5" aria-hidden />
            </Link>
          </StepCard>

          <StepCard step={3} title="Sign in and go to work">
            <p className="text-muted-foreground">
              Sign in with your work email, then jump to the dashboard to add bikes, rentals, and your first payments.
            </p>
            <CopyBlock text="/login" toastLabel="Path copied" />
            <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
              If something looks wrong after deploy, disable strict blockers for this site and try again, or email us.
            </p>
            <Button className="mt-4 w-full sm:w-auto" size="sm" asChild>
              <Link href="/login">Go to sign in</Link>
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
