"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bike } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SCROLL_THRESHOLD_PX = 16;

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => {
      setScrolled(window.scrollY > SCROLL_THRESHOLD_PX);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b transition-[background-color,backdrop-filter,box-shadow,border-color] duration-300 ease-out",
        scrolled
          ? "border-border/70 bg-background/60 shadow-[0_1px_0_rgba(0,0,0,0.06),0_8px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl backdrop-saturate-150 dark:bg-background/45 dark:shadow-[0_1px_0_rgba(255,255,255,0.06),0_8px_40px_rgba(0,0,0,0.35)]"
          : "border-border/50 bg-background/85 backdrop-blur-md dark:bg-background/90",
      )}
    >
      <div className="flex h-14 w-full items-center justify-between gap-4 px-4 sm:h-16 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2 font-semibold tracking-tight">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Bike className="h-4 w-4" aria-hidden />
          </span>
          <span className="leading-tight">My Bike Insights</span>
        </Link>
        <nav className="flex shrink-0 items-center gap-1 sm:gap-2" aria-label="Primary">
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
            <Link href="#get-started">Get started</Link>
          </Button>
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
            <Link href="#contact">Contact us</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/login">Open app</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
