"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bike, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { backNavButtonClassName } from "@/components/navigation/BackNavButton";
import { cn } from "@/lib/utils";

const SCROLL_THRESHOLD_PX = 16;

/** In-page links; kept visually quieter than primary CTAs. */
const SECONDARY_NAV = [
  { href: "#features", label: "Features" },
  { href: "#preview", label: "Product" },
  { href: "#testimonials", label: "Stories" },
  { href: "#pricing", label: "Plans" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "Contact" },
] as const;

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const update = () => {
      setScrolled(window.scrollY > SCROLL_THRESHOLD_PX);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 w-full border-b transition-[background-color,backdrop-filter,box-shadow,border-color] duration-300 ease-out",
          scrolled
            ? "border-border/70 bg-background/60 shadow-[0_1px_0_rgba(0,0,0,0.06),0_8px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl backdrop-saturate-150 dark:bg-background/45 dark:shadow-[0_1px_0_rgba(255,255,255,0.06),0_8px_40px_rgba(0,0,0,0.35)]"
            : "border-border/50 bg-background/85 backdrop-blur-md dark:bg-background/90",
        )}
      >
        <div className="flex h-14 w-full items-center justify-between gap-2 px-4 sm:h-16 sm:px-6 lg:gap-3 lg:px-8">
          <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2 font-semibold tracking-tight">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Bike className="h-4 w-4" aria-hidden />
            </span>
            <span className="leading-tight">My Bike Insights</span>
          </Link>

          <nav
            className="hidden min-w-0 flex-1 items-center justify-end gap-1 md:flex md:gap-2"
            aria-label="Primary"
          >
            {SECONDARY_NAV.map(({ href, label }) => (
              <Button key={href} variant="ghost" size="sm" className="text-muted-foreground" asChild>
                <Link href={href}>{label}</Link>
              </Button>
            ))}
            <span className="mx-0.5 hidden h-5 w-px shrink-0 bg-border lg:block" aria-hidden />
            <ThemeToggle className="text-muted-foreground" />
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 border-primary/55 font-semibold shadow-sm hover:border-primary hover:bg-primary/5"
              asChild
            >
              <Link href="#get-started">Get started</Link>
            </Button>
            <Button size="sm" className={cn("shrink-0", backNavButtonClassName)} asChild>
              <Link href="/login">Open app</Link>
            </Button>
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 md:hidden">
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              className="border-primary/55 px-2.5 font-semibold shadow-sm sm:px-3"
              asChild
            >
              <Link href="#get-started">Start</Link>
            </Button>
            <Button size="sm" className={cn("px-2.5 sm:px-3", backNavButtonClassName)} asChild>
              <Link href="/login">Open app</Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0"
              aria-expanded={mobileOpen}
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-5" aria-hidden />
            </Button>
          </div>
        </div>
      </header>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent
          className="top-4 bottom-auto left-4 right-4 max-h-[min(32rem,calc(100vh-2rem))] max-w-none translate-x-0 translate-y-0 overflow-y-auto border-border/80 sm:left-auto sm:right-4 sm:max-w-sm"
          showCloseButton
        >
          <DialogHeader>
            <div className="flex items-center justify-between gap-2 pr-8">
              <DialogTitle className="text-left">Menu</DialogTitle>
              <ThemeToggle align="end" />
            </div>
          </DialogHeader>
          <nav className="flex flex-col gap-2 pt-2" aria-label="Mobile">
            <Button
              variant="outline"
              size="lg"
              className="h-11 w-full justify-center border-primary/55 font-semibold shadow-sm"
              asChild
            >
              <Link href="#get-started" onClick={() => setMobileOpen(false)}>
                Get started
              </Link>
            </Button>
            <Button size="lg" className={cn("h-11 w-full justify-center shadow-md", backNavButtonClassName)} asChild>
              <Link href="/login" onClick={() => setMobileOpen(false)}>
                Open app
              </Link>
            </Button>
            <div className="my-1 border-t border-border/60" />
            {SECONDARY_NAV.map(({ href, label }) => (
              <Button key={href} variant="ghost" className="h-10 w-full justify-start font-normal" asChild>
                <Link href={href} onClick={() => setMobileOpen(false)}>
                  {label}
                </Link>
              </Button>
            ))}
          </nav>
        </DialogContent>
      </Dialog>
    </>
  );
}
