"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

const triggerClasses =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-transparent hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4";

function formatTime(createdAt: string | undefined): string {
  if (!createdAt) return "";
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return "";
  }
}

export function NotificationDropdown() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => {
        if (!r.ok) return [];
        return r.json();
      })
      .then((data: unknown) => {
        const list = Array.isArray(data) ? data : [];
        const all = (list as Notification[])
          .filter((n) => n && typeof n === "object" && n.id != null)
          .sort(
            (a, b) =>
              new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
          );
        const unread = all.filter((n) => n.is_read !== "true");
        setNotifications(all);
        setUnreadCount(unread.length);
      })
      .catch(() => {
        setNotifications([]);
        setUnreadCount(0);
      });
  }, []);

  const recent = notifications.slice(0, 5);

  function handleNotificationClick(n: Notification) {
    const href = n.rental_id
      ? `/rentals/${n.rental_id}`
      : n.bike_id
        ? `/bikes/${n.bike_id}`
        : "/notifications";
    router.push(href);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(triggerClasses, "relative")}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex justify-between items-center">
            <span>Notifications</span>
            <Link
              href="/notifications"
              className="text-xs font-normal text-primary hover:underline"
            >
              View all
            </Link>
          </DropdownMenuLabel>
          {recent.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            recent.map((n) => (
              <DropdownMenuItem
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className="cursor-pointer flex flex-col items-stretch gap-0.5 py-2"
              >
                <p className="line-clamp-2 text-sm">{n.message ?? ""}</p>
                <p className="text-xs text-muted-foreground">
                  {formatTime(n.created_at)}
                </p>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
