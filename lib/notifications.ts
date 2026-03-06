import { addDays, isBefore, parseISO } from "date-fns";
import { readCSV, appendCSV, writeCSV } from "@/lib/csv";
import type { Notification, Rental } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

const NOTIFICATION_DAYS_DUE_SOON = 2;
const PAYMENT_PENDING_DAYS = 3;

export async function ensureOverdueRentalsUpdated(): Promise<void> {
  const rentals = await readCSV<Rental>("rentals.csv");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let changed = false;
  for (const r of rentals) {
    if (r.status !== "active") continue;
    const end = parseISO(r.end_date);
    end.setHours(0, 0, 0, 0);
    if (isBefore(end, today)) {
      (r as Rental).status = "overdue";
      changed = true;
      const { appendCSV: appendNotif } = await import("@/lib/csv");
      const notifications = await readCSV<Notification>("notifications.csv");
      const exists = notifications.some(
        (n) => n.type === "rent_overdue" && n.rental_id === r.id
      );
      if (!exists) {
        await appendCSV<Notification>("notifications.csv", {
          id: `notif-${uuidv4().slice(0, 8)}`,
          type: "rent_overdue",
          bike_id: r.bike_id,
          bike_name: r.bike_name,
          rental_id: r.id,
          customer_name: r.customer_name,
          customer_phone: r.customer_phone,
          message: `Rental ${r.id} (${r.bike_name}) is overdue. Customer: ${r.customer_name}`,
          is_read: "false",
          created_at: new Date().toISOString(),
        });
      }
    }
  }
  if (changed) {
    const { writeCSV: writeRentals } = await import("@/lib/csv");
    await writeRentals("rentals.csv", rentals);
  }
}

export async function getOrCreateDueSoonAndPaymentPendingNotifications(): Promise<void> {
  const rentals = await readCSV<Rental>("rentals.csv");
  const notifications = await readCSV<Notification>("notifications.csv");
  const now = new Date();
  const dueSoonEnd = addDays(now, NOTIFICATION_DAYS_DUE_SOON);

  for (const r of rentals) {
    if (r.status !== "active") continue;
    const end = parseISO(r.end_date);
    const start = parseISO(r.start_date);
    const daysSinceStart = Math.floor(
      (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (end <= dueSoonEnd && end >= now) {
      const exists = notifications.some(
        (n) =>
          n.type === "rent_due_soon" &&
          n.rental_id === r.id &&
          parseISO(n.created_at) > addDays(now, -1)
      );
      if (!exists) {
        await appendCSV<Notification>("notifications.csv", {
          id: `notif-${uuidv4().slice(0, 8)}`,
          type: "rent_due_soon",
          bike_id: r.bike_id,
          bike_name: r.bike_name,
          rental_id: r.id,
          customer_name: r.customer_name,
          customer_phone: r.customer_phone,
          message: `Rental ending soon for ${r.bike_name}. Customer: ${r.customer_name}`,
          is_read: "false",
          created_at: new Date().toISOString(),
        });
      }
    }

    if (r.payment_status === "pending" && daysSinceStart > PAYMENT_PENDING_DAYS) {
      const exists = notifications.some(
        (n) => n.type === "payment_pending" && n.rental_id === r.id
      );
      if (!exists) {
        await appendCSV<Notification>("notifications.csv", {
          id: `notif-${uuidv4().slice(0, 8)}`,
          type: "payment_pending",
          bike_id: r.bike_id,
          bike_name: r.bike_name,
          rental_id: r.id,
          customer_name: r.customer_name,
          customer_phone: r.customer_phone,
          message: `Payment pending for rental ${r.id}. Customer: ${r.customer_name}`,
          is_read: "false",
          created_at: new Date().toISOString(),
        });
      }
    }
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  const notifications = await readCSV<Notification>("notifications.csv");
  const n = notifications.find((x) => x.id === id);
  if (n) n.is_read = "true";
  await writeCSV("notifications.csv", notifications);
}

export async function markAllNotificationsRead(): Promise<void> {
  const notifications = await readCSV<Notification>("notifications.csv");
  for (const n of notifications) n.is_read = "true";
  await writeCSV("notifications.csv", notifications);
}
