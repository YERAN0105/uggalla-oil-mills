import { format, formatDistanceToNow, parseISO } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

const TZ = "Asia/Colombo";

/** Convert a UTC Date/string to Colombo local time */
export function toColomboTime(date: Date | string): Date {
  const d = typeof date === "string" ? parseISO(date) : date;
  return toZonedTime(d, TZ);
}

/** Format a date in Colombo timezone */
export function formatInColombo(date: Date | string, fmt: string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(toZonedTime(d, TZ), fmt);
}

/** Get current time as Colombo local Date */
export function nowInColombo(): Date {
  return toZonedTime(new Date(), TZ);
}

/** Convert a Colombo local time to UTC for DB storage */
export function fromColomboTime(date: Date): Date {
  return fromZonedTime(date, TZ);
}

/** Human-readable relative time (e.g., "2 hours ago") */
export function relativeTime(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

/** Format date as "9 Jun 2026" */
export function formatShortDate(date: Date | string): string {
  return formatInColombo(date, "d MMM yyyy");
}

/** Format date+time as "9 Jun 2026, 2:30 PM" */
export function formatDateTime(date: Date | string): string {
  return formatInColombo(date, "d MMM yyyy, h:mm a");
}

export { TZ as COLOMBO_TZ };
