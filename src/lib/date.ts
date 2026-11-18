import type { ISODate, LocalTime, Weekday } from "@/lib/domain/types";

export const DEFAULT_TIMEZONE = "Asia/Jakarta";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isISODate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function isLocalTime(value: string): boolean {
  return LOCAL_TIME.test(value);
}

/** Tanggal kalender "hari ini" di zona waktu guru (default Asia/Jakarta). */
export function getZonedToday(timeZone: string = DEFAULT_TIMEZONE, now: Date = new Date()): ISODate {
  // en-CA memformat sebagai YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function toUTCDate(iso: ISODate): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Hari ISO dari tanggal kalender (tidak bergantung zona waktu server). */
export function weekdayOf(iso: ISODate): Weekday {
  const day = toUTCDate(iso).getUTCDay(); // 0 = Minggu
  return (day === 0 ? 7 : day) as Weekday;
}

export function addDays(iso: ISODate, days: number): ISODate {
  const date = toUTCDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function compareISODate(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** "Rabu, 18 November 2026" */
export function formatLongDate(iso: ISODate): string {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(toUTCDate(iso));
}

/** "18 Nov 2026" */
export function formatShortDate(iso: ISODate): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(toUTCDate(iso));
}

/** "07:30" → "07.30" (format jam Indonesia). */
export function formatTime(time: LocalTime): string {
  return time.replace(":", ".");
}

/** "07.30 – 08.40" */
export function formatTimeRange(start: LocalTime, end: LocalTime): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}
