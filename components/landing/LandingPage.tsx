import Link from "next/link";
import {
  BarChart3,
  Bike,
  Building2,
  CalendarClock,
  ClipboardList,
  CreditCard,
  LineChart,
  Mail,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingGetStarted } from "@/components/landing/LandingGetStarted";
import { LandingHeader } from "@/components/landing/LandingHeader";

const CONTACT_EMAIL = "hamza@mybikeinsights.com";

/** Short package labels shown on pricing cards (icon sits after the name). */
const PACKAGE_TRIAL = {
  name: "15-Day Trial",
  priceLine: "Free for 15 days",
  blurb:
    "Try the full product with your team. Email us to get a workspace. Same highlights as paid, time-limited.",
  Icon: CalendarClock,
} as const;

const PACKAGE_PAID = {
  name: "Workspace Monthly",
  priceLine: "€150 per month",
  blurb:
    "Keep every feature after the trial. One workspace, billed monthly. Same email for onboarding and billing.",
  Icon: CreditCard,
} as const;

/** Top five selling points repeated on both cards (full app includes more). */
const HIGHLIGHT_FEATURES = [
  "Dashboard KPIs and profit charts",
  "Rental contracts with weekly schedules",
  "Pending rent and overdue queues",
  "Track payments reminders and exports",
  "Late rent overdue repair alerts",
] as const;

function CardFeatureHighlights() {
  return (
    <ul className="mt-4 list-none space-y-2 border-t border-border/60 pt-4 text-sm leading-relaxed">
      {HIGHLIGHT_FEATURES.map((item) => (
        <li key={item} className="text-muted-foreground flex gap-2">
          <span className="text-primary mt-0.5 shrink-0 font-semibold" aria-hidden>
            ·
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

const features = [
  {
    icon: BarChart3,
    title: "Dashboard that matches how you work",
    description:
      "Month-by-month KPIs, profit trends, and fleet snapshots so you see cash flow and utilization at a glance.",
  },
  {
    icon: ClipboardList,
    title: "Rentals and weekly rent, organized",
    description:
      "Schedules, payment status, reminders, and a clear ledger for collections, without spreadsheet chaos.",
  },
  {
    icon: LineChart,
    title: "Pending payments and overdue, in one place",
    description:
      "Spot who is due or late, call or email from the list, and record payments without losing context.",
  },
  {
    icon: Bike,
    title: "Fleet and repairs under one roof",
    description:
      "Track bikes, upload photos, and log repair costs so downtime does not silently eat margin.",
  },
  {
    icon: Building2,
    title: "Built for teams and workspaces",
    description:
      "Multi-tenant workspaces keep each shop’s data separate, with roles aligned to real operations.",
  },
  {
    icon: ShieldCheck,
    title: "Session-aware and workspace-safe",
    description:
      "Sign-in flows and workspace states are designed around how invited users actually land in the app.",
  },
] as const;

export function LandingPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-primary/[0.06] blur-3xl dark:bg-primary/[0.12]" />
        <div className="absolute bottom-0 right-[-120px] h-[360px] w-[480px] rounded-full bg-chart-2/[0.12] blur-3xl" />
      </div>

      <LandingHeader />

      <main className="relative z-10">
        <section className="mx-auto max-w-5xl px-4 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-20">
          <div className="max-w-2xl">
            <p className="text-muted-foreground mb-4 text-sm font-medium tracking-wide uppercase">
              Fleet operations, clarified
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl sm:leading-[1.08]">
              Run bike rentals with numbers you can trust.
            </h1>
            <p className="text-muted-foreground mt-5 max-w-xl text-pretty text-lg leading-relaxed">
              My Bike Insights helps rental shops track bikes, weekly rent, repairs, and expenses, so you always know
              what is owed, what is overdue, and what the month actually earned.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" asChild>
                <Link href="/login">Sign in to your workspace</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="#features">See what is inside</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="#get-started">Get started</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="#contact">Contact us</Link>
              </Button>
            </div>
            <p className="text-muted-foreground mt-4 text-sm">
              Invited teammate? Use the link from your email, then sign in here anytime.
            </p>
          </div>
        </section>

        <section id="features" className="border-t border-border/60 bg-muted/30 py-16 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Everything in one operating picture</h2>
              <p className="text-muted-foreground mt-3 text-pretty leading-relaxed">
                Stop stitching together notebooks, texts, and spreadsheets. The app is shaped around the workflows shops
                already use: rentals, collections, repairs, and month-end review.
              </p>
            </div>
            <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, description }) => (
                <li
                  key={title}
                  className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="mt-4 font-medium leading-snug">{title}</h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{description}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <LandingGetStarted contactEmail={CONTACT_EMAIL} />

        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Built for the busy rental desk</h2>
              <p className="text-muted-foreground mt-3 text-pretty leading-relaxed">
                When the phone is ringing and bikes are coming back late, you need screens that answer the question
                fast: who owes what, which units are tied up, and whether the week was actually profitable.
              </p>
              <ul className="mt-8 space-y-4 text-sm leading-relaxed">
                <li className="flex gap-3">
                  <Mail className="text-primary mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>
                    <span className="font-medium text-foreground">Customer reminders:</span>
                    <span className="text-muted-foreground"> nudge renters when it is time to pay.</span>
                  </span>
                </li>
                <li className="flex gap-3">
                  <Wrench className="text-primary mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>
                    <span className="font-medium text-foreground">Repair visibility:</span>
                    <span className="text-muted-foreground"> keep maintenance from disappearing into casual notes.</span>
                  </span>
                </li>
                <li className="flex gap-3">
                  <LineChart className="text-primary mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>
                    <span className="font-medium text-foreground">Profit you can explain:</span>
                    <span className="text-muted-foreground">
                      {" "}
                      weekly, monthly, and yearly views that respect real due dates.
                    </span>
                  </span>
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-card to-muted/40 p-8 shadow-sm">
              <p className="text-muted-foreground text-sm font-medium uppercase tracking-wide">Ready when you are</p>
              <p className="mt-3 text-lg font-medium leading-snug">
                If your organization already uses My Bike Insights, head to sign in and jump into your workspace.
              </p>
              <Button className="mt-6 w-full sm:w-auto" size="lg" asChild>
                <Link href="/login">Go to sign in</Link>
              </Button>
            </div>
          </div>
        </section>

        <section
          id="contact"
          className="border-t border-border/60 bg-muted/30 py-16 scroll-mt-16 sm:py-24"
          aria-labelledby="contact-heading"
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 id="contact-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Contact us
            </h2>
            <p className="text-muted-foreground mt-3 max-w-2xl text-pretty leading-relaxed">
              Start with a free 15-day trial or subscribe at €150 per month. Trial and paid workspaces include the same
              product. For either option, reach out and we will set up your workspace.
            </p>

            <ul className="mt-10 grid gap-6 sm:grid-cols-2">
              <li className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold leading-snug tracking-tight">{PACKAGE_TRIAL.name}</h3>
                    <p className="text-primary mt-1 text-sm font-medium">{PACKAGE_TRIAL.priceLine}</p>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <PACKAGE_TRIAL.Icon className="h-5 w-5" aria-hidden />
                  </div>
                </div>
                <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{PACKAGE_TRIAL.blurb}</p>
                <p className="text-foreground mt-5 text-xs font-semibold tracking-wide uppercase">Top features</p>
                <CardFeatureHighlights />
              </li>
              <li className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold leading-snug tracking-tight">{PACKAGE_PAID.name}</h3>
                    <p className="text-primary mt-1 text-sm font-medium">{PACKAGE_PAID.priceLine}</p>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <PACKAGE_PAID.Icon className="h-5 w-5" aria-hidden />
                  </div>
                </div>
                <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{PACKAGE_PAID.blurb}</p>
                <p className="text-foreground mt-5 text-xs font-semibold tracking-wide uppercase">Top features</p>
                <CardFeatureHighlights />
              </li>
            </ul>

            <p className="text-muted-foreground mx-auto mt-8 max-w-3xl text-center text-sm leading-relaxed">
              Both plans include the rest of the app too: bikes and photos, collected rent ledger, repairs, expenses,
              analytics export, notifications, settings, backups, and secure team access.
            </p>

            <div className="mt-10 rounded-2xl border border-border/70 bg-card p-8 shadow-sm">
              <p className="text-sm font-medium text-foreground">Email</p>
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=My%20Bike%20Insights%20-%20trial%20or%20subscription`}
                className="text-primary mt-2 inline-block text-lg font-medium underline-offset-4 hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                Tell us a bit about your shop and whether you want the trial or a paid plan. We typically reply within one
                business day.
              </p>
              <Button className="mt-6" size="lg" asChild>
                <a href={`mailto:${CONTACT_EMAIL}?subject=My%20Bike%20Insights%20-%20trial%20or%20subscription`}>
                  Email us
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/60 py-10">
        <div className="text-muted-foreground mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 px-4 text-sm sm:flex-row sm:items-center sm:px-6">
          <p className="text-balance">© {new Date().getFullYear()} My Bike Insights</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="#contact" className="text-foreground underline-offset-4 hover:underline">
              Contact us
            </Link>
            <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
