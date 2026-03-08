import { addDays, isBefore, parseISO, format } from "date-fns";
import * as db from "@/lib/db";
import type { Notification, Rental } from "@/lib/types";
import { getWeeksWithPendingRent, getRentDueTuesdayForWeek } from "@/lib/calculations";
import { v4 as uuidv4 } from "uuid";

const NOTIFICATION_DAYS_DUE_SOON = 2;
const PAYMENT_PENDING_DAYS = 3;

export async function ensureOverdueRentalsUpdated(): Promise<void> {
  const rentals = await db.getRentals();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const r of rentals) {
    if (r.status !== "active") continue;
    const end = parseISO(r.end_date);
    end.setHours(0, 0, 0, 0);
    if (isBefore(end, today)) {
      await db.updateRental(r.id, { status: "overdue" });
      const notifications = await db.getNotifications();
      const exists = notifications.some(
        (n) => n.type === "rent_overdue" && n.rental_id === r.id
      );
      if (!exists) {
        await db.createNotification({
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
}

export async function getOrCreateDueSoonAndPaymentPendingNotifications(): Promise<void> {
  const rentals = await db.getRentals();
  const notifications = await db.getNotifications();
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
        await db.createNotification({
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
        await db.createNotification({
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

/** Create notifications for each week where Tuesday has passed but that week's rent is not paid. Rent due every Tuesday. */
export async function ensureWeeklyRentNotifications(): Promise<void> {
  const rentals = await db.getRentals();
  const existing = await db.getNotifications();
  const today = new Date();

  for (const r of rentals) {
    if (r.status !== "active" && r.status !== "overdue") continue;
    if (r.payment_status === "paid") continue;

    const pendingWeeks = getWeeksWithPendingRent(
      {
        start_date: r.start_date,
        weeks: r.weeks,
        weekly_rate: r.weekly_rate,
        amount_paid: r.amount_paid,
      },
      today
    );

    for (const weekNum of pendingWeeks) {
      const dueDate = getRentDueTuesdayForWeek(r.start_date, weekNum);
      const dueStr = format(dueDate, "EEE, d MMM yyyy");
      const message = `Week ${weekNum} rent overdue – ${r.bike_name}, ${r.customer_name}. Was due Tuesday ${dueStr}.`;
      const alreadyExists = existing.some(
        (n) =>
          n.rental_id === r.id &&
          n.type === "week_rent_pending" &&
          n.message.includes(`Week ${weekNum} rent overdue`)
      );
      if (alreadyExists) continue;

      await db.createNotification({
        id: `notif-${uuidv4().slice(0, 8)}`,
        type: "week_rent_pending",
        bike_id: r.bike_id,
        bike_name: r.bike_name,
        rental_id: r.id,
        customer_name: r.customer_name,
        customer_phone: r.customer_phone,
        message,
        is_read: "false",
        created_at: new Date().toISOString(),
      });
      existing.push({
        id: "",
        type: "week_rent_pending",
        bike_id: r.bike_id,
        bike_name: r.bike_name,
        rental_id: r.id,
        customer_name: r.customer_name,
        customer_phone: r.customer_phone,
        message,
        is_read: "false",
        created_at: new Date().toISOString(),
      });
    }
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  const notifications = await db.getNotifications();
  const n = notifications.find((x) => x.id === id);
  if (n) await db.updateNotification(id, { is_read: "true" });
}

export async function markAllNotificationsRead(): Promise<void> {
  const notifications = await db.getNotifications();
  for (const n of notifications) {
    await db.updateNotification(n.id, { is_read: "true" });
  }
}
