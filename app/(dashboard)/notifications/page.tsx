"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Notification } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { Bell, Check, CheckCheck, AlertCircle, Clock, CreditCard, CalendarClock, Trash2 } from "lucide-react";
import { toast } from "sonner";

const typeIcon: Record<string, React.ReactNode> = {
  rent_overdue: <AlertCircle className="h-4 w-4 text-red-500" />,
  rent_due_soon: <Clock className="h-4 w-4 text-amber-500" />,
  payment_pending: <CreditCard className="h-4 w-4 text-amber-500" />,
  week_rent_pending: <CalendarClock className="h-4 w-4 text-amber-500" />,
  repair_due: <AlertCircle className="h-4 w-4 text-amber-500" />,
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then(setNotifications)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: "true" } : n))
    );
    router.refresh();
  }

  async function markAllRead() {
    await fetch("/api/notifications/mark-read", { method: "POST" });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: "true" })));
    toast.success("All marked as read");
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this notification?")) return;
    const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    router.refresh();
  }

  const unread = notifications.filter((n) => n.is_read !== "true");
  const read = notifications.filter((n) => n.is_read === "true");

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {unread.length > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {unread.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5" />
              Unread ({unread.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {unread.map((n) => (
              <div
                key={n.id}
                className="flex items-start justify-between gap-4 rounded-lg border bg-background p-3"
              >
                <div className="flex gap-3">
                  {typeIcon[n.type] || <Bell className="h-4 w-4 text-muted-foreground" />}
                  <div>
                    <p className="font-medium">{n.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {n.bike_name}
                      {n.customer_name && ` · ${n.customer_name}`} ·{" "}
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                    {n.rental_id && (
                      <Link
                        href={`/rentals/${n.rental_id}`}
                        className="mt-1 inline-block text-sm text-primary hover:underline"
                      >
                        View rental →
                      </Link>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => markRead(n.id)}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(n.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {notifications.length === 0 ? (
            <p className="text-center text-muted-foreground">No notifications yet.</p>
          ) : (
            [...unread, ...read].map((n) => (
              <div
                key={n.id}
                className={`flex items-start justify-between gap-4 rounded-lg border p-3 ${
                  n.is_read !== "true" ? "bg-muted/30" : ""
                }`}
              >
                <div className="flex gap-3">
                  {typeIcon[n.type] || <Bell className="h-4 w-4 text-muted-foreground" />}
                  <div>
                    <p className="font-medium">{n.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {n.bike_name}
                      {n.customer_name && ` · ${n.customer_name}`} ·{" "}
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                    {n.rental_id && (
                      <Link
                        href={`/rentals/${n.rental_id}`}
                        className="mt-1 inline-block text-sm text-primary hover:underline"
                      >
                        View rental →
                      </Link>
                    )}
                  </div>
                </div>
                {n.is_read !== "true" ? (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => markRead(n.id)}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(n.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(n.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
