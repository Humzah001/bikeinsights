"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  /** e.g. icon-sm in the landing header on mobile */
  className?: string;
  align?: "start" | "end" | "center";
};

export function ThemeToggle({ className, align = "end" }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon-sm" className={cn("shrink-0", className)} disabled aria-hidden>
        <Sun className="size-4 opacity-0" />
      </Button>
    );
  }

  const Icon = theme === "system" ? Monitor : resolvedTheme === "dark" ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "shrink-0", className)}
        aria-label="Appearance: light, dark, or system"
      >
        <Icon className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Appearance
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={theme ?? "system"}
            onValueChange={(v) => setTheme(v)}
          >
            <DropdownMenuRadioItem value="light">
              <Sun className="size-4" />
              Light
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">
              <Moon className="size-4" />
              Dark
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system">
              <Monitor className="size-4" />
              System
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Fixed corner control for centered auth-style pages (login, invite, callback). */
export function ThemeToggleCorner() {
  return (
    <div className="pointer-events-none fixed top-3 right-3 z-50 sm:top-4 sm:right-4">
      <div className="pointer-events-auto">
        <ThemeToggle className="bg-background/80 shadow-sm ring-1 ring-border backdrop-blur-sm" />
      </div>
    </div>
  );
}
