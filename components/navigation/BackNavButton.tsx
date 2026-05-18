"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Matches landing header “Open app”: solid primary, shadow, ring — reads clearly on busy backgrounds. */
export const backNavButtonClassName =
  "font-semibold shadow-sm ring-1 ring-primary/15 dark:ring-primary/25";

export function BackNavButton({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Button size="sm" className={cn("shrink-0", backNavButtonClassName, className)} asChild>
      <Link href={href}>{children}</Link>
    </Button>
  );
}
