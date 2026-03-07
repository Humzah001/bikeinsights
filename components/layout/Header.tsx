"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { NotificationDropdown } from "./NotificationDropdown";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";

export function Header() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4">
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <ClientErrorBoundary>
          <NotificationDropdown />
        </ClientErrorBoundary>
        <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Log out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
