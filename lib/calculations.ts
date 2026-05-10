import {
  addDays,
  differenceInDays,
  endOfDay,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
} from "date-fns";

export type WeeklyRentGateResult = { ok: true } | { ok: false; reason: string };

/** Tuesday = 2 in getDay(). Returns the first Tuesday on or after the given date. */
export function getFirstTuesdayOnOrAfter(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay(); // 0 Sun, 2 Tue
  const daysToAdd = (2 - day + 7) % 7;
  return addDays(d, daysToAdd);
}

export interface RentalForPendingRent {
  start_date: string;
  weeks: string;
  weekly_rate: string;
  amount_paid?: string;
  /** YYYY-MM-DD for week 1 due date; empty = first Tuesday on or after start_date */
  rent_collection_date?: string;
}

/** Anchor for week 1 rent (start of local calendar day). */
export function getFirstRentDueAnchor(rental: RentalForPendingRent): Date {
  if (rental.rent_collection_date && rental.rent_collection_date.trim() !== "") {
    return startOfDay(parseISO(rental.rent_collection_date));
  }
  return getFirstTuesdayOnOrAfter(parseISO(rental.start_date));
}

/** Week N due date: anchor + (N - 1) × 7 days. */
export function getRentDueDateForWeek(rental: RentalForPendingRent, weekIndex: number): Date {
  const anchor = getFirstRentDueAnchor(rental);
  return addDays(anchor, (weekIndex - 1) * 7);
}

/** YYYY-MM-DD for when contract week `weekIndex` (1-based) was due; null if unknown. */
export function formatRentWeekDueDate(rental: RentalForPendingRent, weekIndex: number): string | null {
  if (weekIndex < 1 || !rental.start_date?.trim()) return null;
  try {
    return format(getRentDueDateForWeek(rental, weekIndex), "yyyy-MM-dd");
  } catch {
    return null;
  }
}

/** 1-based contract week whose scheduled due is `dueIso` (YYYY-MM-DD), or null. */
export function findContractWeekForDueDate(
  rental: RentalForPendingRent,
  dueIso: string
): number | null {
  const target = dueIso.trim();
  if (!target || !rental.start_date?.trim()) return null;
  const total = parseInt(rental.weeks, 10) || 0;
  const cap = Math.min(Math.max(total, 1) + 8, 120);
  for (let w = 1; w <= cap; w++) {
    const d = formatRentWeekDueDate(rental, w);
    if (d === target) return w;
  }
  return null;
}

/** Legacy: first Tuesday on or after start, then weekly. Same as empty rent_collection_date. */
export function getRentDueTuesdayForWeek(startDate: string, weekIndex: number): Date {
  return getRentDueDateForWeek(
    { start_date: startDate, weeks: "1", weekly_rate: "1", rent_collection_date: "" },
    weekIndex
  );
}

/** Default collection date in UI: first Tuesday on or after contract start. */
export function getDefaultRentCollectionDate(startDate: string): string {
  if (!startDate) return "";
  return format(getFirstTuesdayOnOrAfter(parseISO(startDate)), "yyyy-MM-dd");
}

/**
 * Block "record weekly payment" until that week's due date (per rent_collection_date or Tuesday rule).
 */
export function canRecordWeeklyRentPayment(
  rental: RentalForPendingRent,
  today: Date
): WeeklyRentGateResult {
  const totalWeeks = parseInt(rental.weeks, 10) || 0;
  if (totalWeeks <= 0) return { ok: false, reason: "No rental weeks defined." };
  const paid = Number(rental.amount_paid || 0);
  const rate = Number(rental.weekly_rate || 0);
  if (rate <= 0) return { ok: false, reason: "Weekly rate is missing or zero." };
  const weeksPaid = getWeeksPaid(paid, rate);
  if (weeksPaid >= totalWeeks) {
    return { ok: false, reason: "All weekly payments are already recorded." };
  }
  const weekToRecord = weeksPaid + 1;
  const dueDate = getRentDueDateForWeek(rental, weekToRecord);
  const todayStart = startOfDay(today);
  if (todayStart < startOfDay(dueDate)) {
    return {
      ok: false,
      reason: `Week ${weekToRecord} can be collected from ${format(dueDate, "EEE d MMM yyyy")}.`,
    };
  }
  return { ok: true };
}

/** Returns 1-based week numbers for which the due date has passed but that week's rent is not yet paid. */
export function getWeeksWithPendingRent(
  rental: RentalForPendingRent,
  today: Date
): number[] {
  const totalWeeks = parseInt(rental.weeks, 10) || 0;
  if (totalWeeks <= 0) return [];
  const paid = Number(rental.amount_paid || 0);
  const rate = Number(rental.weekly_rate || 0);
  const weeksPaid = getWeeksPaid(paid, rate);
  const pending: number[] = [];
  const todayStart = startOfDay(today);
  for (let week = 1; week <= totalWeeks; week++) {
    if (week <= weeksPaid) continue; // already paid
    const dueDate = getRentDueDateForWeek(rental, week);
    if (todayStart > dueDate) {
      pending.push(week);
    }
  }
  return pending;
}

/**
 * True when there is unpaid contract rent and at least one unpaid week’s due date is today or earlier.
 * Used so “pending payments” lists do not show rentals whose next instalment is not due yet.
 */
export function rentalHasUnpaidRentDueOnOrBeforeToday(
  rental: RentalForPendingRent,
  today: Date
): boolean {
  const rate = Number(rental.weekly_rate || 0);
  if (rate <= 0) return false;
  const totalWeeks = parseInt(rental.weeks, 10) || 0;
  if (totalWeeks <= 0 || !rental.start_date?.trim()) return false;
  try {
    getFirstRentDueAnchor(rental);
  } catch {
    return false;
  }
  const paid = Number(rental.amount_paid || 0);
  const weeksPaid = getWeeksPaid(paid, rate);
  if (weeksPaid >= totalWeeks) return false;

  if (getWeeksWithPendingRent(rental, today).length > 0) return true;

  const next = getNextUpcomingRentWeek(rental, today);
  if (!next) return false;
  return startOfDay(next.dueDate) <= startOfDay(today);
}

/** Next unpaid week whose due date is today or in the future. Returns { weekNum, dueDate } or null. */
export function getNextUpcomingRentWeek(
  rental: RentalForPendingRent,
  today: Date
): { weekNum: number; dueDate: Date } | null {
  const totalWeeks = parseInt(rental.weeks, 10) || 0;
  if (totalWeeks <= 0) return null;
  const paid = Number(rental.amount_paid || 0);
  const rate = Number(rental.weekly_rate || 0);
  const weeksPaid = getWeeksPaid(paid, rate);
  const todayStart = startOfDay(today);
  for (let week = 1; week <= totalWeeks; week++) {
    if (week <= weeksPaid) continue;
    const dueDate = getRentDueDateForWeek(rental, week);
    if (dueDate >= todayStart) return { weekNum: week, dueDate };
  }
  return null;
}

export function calculateWeeks(startDate: string, endDate: string): number {
  const start = typeof startDate === "string" ? parseISO(startDate) : startDate;
  const end = typeof endDate === "string" ? parseISO(endDate) : endDate;
  const days = Math.max(0, differenceInDays(end, start));
  return Math.ceil(days / 7) || 1;
}

export function calculateTotalAmount(
  startDate: string,
  endDate: string,
  weeklyRate: number
): number {
  const weeks = calculateWeeks(startDate, endDate);
  return weeks * weeklyRate;
}

export function getDaysOverdue(endDate: string): number {
  const end = parseISO(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  if (end >= today) return 0;
  return differenceInDays(today, end);
}

export function isOverdue(endDate: string): boolean {
  return getDaysOverdue(endDate) > 0;
}

export function formatCurrency(amount: number, currency = "£"): string {
  return `${currency}${amount.toFixed(2)}`;
}

export function getMonthKey(date: Date): string {
  return format(date, "yyyy-MM");
}

/** Number of weeks paid (from amount_paid / weekly_rate). */
export function getWeeksPaid(amountPaid: number, weeklyRate: number): number {
  if (weeklyRate <= 0) return 0;
  return Math.floor(amountPaid / weeklyRate);
}

/** Whether this rental's payments should appear in revenue / P&L views. */
export function rentalCountsTowardRevenue(r: { status: string }): boolean {
  return (
    r.status === "completed" ||
    r.status === "active" ||
    r.status === "overdue" ||
    r.status === "inactive"
  );
}

/** True if a rent due calendar day falls inside [rangeStart, rangeEnd] (inclusive). */
export function isRentDueDateInRange(due: Date, rangeStart: Date, rangeEnd: Date): boolean {
  return isWithinInterval(startOfDay(due), {
    start: startOfDay(rangeStart),
    end: endOfDay(rangeEnd),
  });
}

/**
 * Part of amount_paid attributed to a date range using weekly due dates (FIFO).
 * Week 1 due = rent_collection_date or first Tuesday on or after start_date; week N = +7 days each.
 */
export function getCollectedRentAttributedToRange(
  rental: RentalForPendingRent,
  rangeStart: Date,
  rangeEnd: Date
): number {
  if (!rental.start_date?.trim()) return 0;
  const rate = Number(rental.weekly_rate || 0);
  const paid = Number(rental.amount_paid || 0);
  if (rate <= 0 || paid <= 0) return 0;

  try {
    getFirstRentDueAnchor(rental);
  } catch {
    return 0;
  }

  const fullWeeks = getWeeksPaid(paid, rate);
  const remainder = Math.round((paid - fullWeeks * rate) * 100) / 100;
  const totalWeeks = parseInt(rental.weeks, 10) || 0;
  const cappedFull = totalWeeks > 0 ? Math.min(fullWeeks, totalWeeks) : fullWeeks;

  let sum = 0;
  for (let w = 1; w <= cappedFull; w++) {
    const due = getRentDueDateForWeek(rental, w);
    if (isRentDueDateInRange(due, rangeStart, rangeEnd)) {
      sum += rate;
    }
  }

  if (remainder > 0.001) {
    const w = fullWeeks + 1;
    if (totalWeeks <= 0 || w <= totalWeeks) {
      const due = getRentDueDateForWeek(rental, w);
      if (isRentDueDateInRange(due, rangeStart, rangeEnd)) {
        sum += remainder;
      }
    }
  }

  return sum;
}

/** One implied weekly collection derived from amount_paid and due dates (no per-payment timestamps in DB). */
export type ImpliedRentCollectionRow = {
  rentalId: string;
  customerName: string;
  contractStart: string;
  contractEnd: string;
  weekIndex: number;
  dueDate: Date;
  amount: number;
  isPartial: boolean;
};

type RentalForImpliedCollections = RentalForPendingRent & {
  id: string;
  customer_name: string;
  end_date: string;
};

/**
 * Reconstructs which rent weeks are covered by amount_paid (FIFO: week 1, then 2, …).
 * "Due date" is the scheduled rent week; exact time you tapped Record payment is not stored.
 */
export function impliedWeeklyRentCollectionRows(rental: RentalForImpliedCollections): ImpliedRentCollectionRow[] {
  const rate = Number(rental.weekly_rate || 0);
  const paid = Number(rental.amount_paid || 0);
  if (!rental.start_date?.trim() || rate <= 0 || paid <= 0) return [];

  try {
    getFirstRentDueAnchor(rental);
  } catch {
    return [];
  }

  const fullWeeks = getWeeksPaid(paid, rate);
  const remainder = Math.round((paid - fullWeeks * rate) * 100) / 100;
  const totalWeeks = parseInt(rental.weeks, 10) || 0;
  const cappedFull = totalWeeks > 0 ? Math.min(fullWeeks, totalWeeks) : fullWeeks;

  const rows: ImpliedRentCollectionRow[] = [];
  for (let w = 1; w <= cappedFull; w++) {
    rows.push({
      rentalId: rental.id,
      customerName: rental.customer_name,
      contractStart: rental.start_date,
      contractEnd: rental.end_date,
      weekIndex: w,
      dueDate: getRentDueDateForWeek(rental, w),
      amount: rate,
      isPartial: false,
    });
  }

  if (remainder > 0.001) {
    const w = fullWeeks + 1;
    if (totalWeeks <= 0 || w <= totalWeeks) {
      rows.push({
        rentalId: rental.id,
        customerName: rental.customer_name,
        contractStart: rental.start_date,
        contractEnd: rental.end_date,
        weekIndex: w,
        dueDate: getRentDueDateForWeek(rental, w),
        amount: remainder,
        isPartial: true,
      });
    }
  }

  return rows;
}

/** Earliest next unpaid rent week (due today or later) across rentals, e.g. for a bike. */
export function getEarliestNextRentDueAmongRentals(
  rentals: RentalForImpliedCollections[],
  today: Date
): { rentalId: string; customerName: string; weekNum: number; dueDate: Date } | null {
  let best: { rentalId: string; customerName: string; weekNum: number; dueDate: Date } | null = null;
  for (const r of rentals) {
    const next = getNextUpcomingRentWeek(r, today);
    if (!next) continue;
    if (!best || next.dueDate.getTime() < best.dueDate.getTime()) {
      best = {
        rentalId: r.id,
        customerName: r.customer_name,
        weekNum: next.weekNum,
        dueDate: next.dueDate,
      };
    }
  }
  return best;
}

/** Amount still owed. */
export function getAmountRemaining(totalAmount: number, amountPaid: number): number {
  return Math.max(0, totalAmount - amountPaid);
}
