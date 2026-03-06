import { addDays, differenceInDays, format, parseISO } from "date-fns";

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
