import { addDays, differenceInDays, format, parseISO, startOfDay } from "date-fns";

/** Tuesday = 2 in getDay(). Returns the first Tuesday on or after the given date. */
export function getFirstTuesdayOnOrAfter(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay(); // 0 Sun, 2 Tue
  const daysToAdd = (2 - day + 7) % 7;
  return addDays(d, daysToAdd);
}

/** Rent is due every Tuesday. Week 1 = first week of contract. Returns the Tuesday when week N's rent is due. */
export function getRentDueTuesdayForWeek(startDate: string, weekIndex: number): Date {
  const start = parseISO(startDate);
  const firstTuesday = getFirstTuesdayOnOrAfter(start);
  return addDays(firstTuesday, (weekIndex - 1) * 7);
}

export interface RentalForPendingRent {
  start_date: string;
  weeks: string;
  weekly_rate: string;
  amount_paid?: string;
}

/** Returns 1-based week numbers for which the Tuesday has passed but that week's rent is not yet paid. */
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
    const dueTuesday = getRentDueTuesdayForWeek(rental.start_date, week);
    if (todayStart > dueTuesday) {
      pending.push(week);
    }
  }
  return pending;
}

/** Next unpaid week whose Tuesday is in the future (upcoming). Returns { weekNum, dueDate } or null. */
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
    const dueTuesday = getRentDueTuesdayForWeek(rental.start_date, week);
    if (dueTuesday >= todayStart) return { weekNum: week, dueDate: dueTuesday };
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
