"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, Menu } from "lucide-react";
import { NotificationDropdown } from "./NotificationDropdown";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { useSidebar } from "./DashboardShell";

export function Header() {
  const router = useRouter();
  const { setSidebarOpen } = useSidebar();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="flex-1 lg:flex-none" />
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
