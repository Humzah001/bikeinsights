import { addDays, differenceInDays, format, parseISO, startOfDay } from "date-fns";

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

/** Amount still owed. */
export function getAmountRemaining(totalAmount: number, amountPaid: number): number {
  return Math.max(0, totalAmount - amountPaid);
}
