import { weekdayOf } from "@/lib/date";
import type { ISODate, LocalTime, WeeklySchedule } from "./types";

export function timeToMinutes(time: LocalTime): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Rentang jam setengah-terbuka [mulai, selesai): 10.00–11.00 TIDAK bentrok dengan 11.00–12.00
 * (kriteria F04).
 */
export function timeRangesOverlap(
  a: { startTime: LocalTime; endTime: LocalTime },
  b: { startTime: LocalTime; endTime: LocalTime },
): boolean {
  return (
    timeToMinutes(a.startTime) < timeToMinutes(b.endTime) &&
    timeToMinutes(b.startTime) < timeToMinutes(a.endTime)
  );
}

export function isValidTimeRange(start: LocalTime, end: LocalTime): boolean {
  return timeToMinutes(start) < timeToMinutes(end);
}

function dateRangesOverlap(
  a: { effectiveFrom: ISODate; effectiveUntil: ISODate | null },
  b: { effectiveFrom: ISODate; effectiveUntil: ISODate | null },
): boolean {
  const aEnd = a.effectiveUntil ?? "9999-12-31";
  const bEnd = b.effectiveUntil ?? "9999-12-31";
  return a.effectiveFrom <= bEnd && b.effectiveFrom <= aEnd;
}

export interface ScheduleConflict {
  a: WeeklySchedule;
  b: WeeklySchedule;
}

/** Bentrok = hari sama, jam beririsan, dan masa berlaku beririsan (satu guru tidak bisa di dua kelas). */
export function findScheduleConflicts(schedules: WeeklySchedule[]): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  for (let i = 0; i < schedules.length; i++) {
    for (let j = i + 1; j < schedules.length; j++) {
      const a = schedules[i];
      const b = schedules[j];
      if (a.weekday === b.weekday && timeRangesOverlap(a, b) && dateRangesOverlap(a, b)) {
        conflicts.push({ a, b });
      }
    }
  }
  return conflicts;
}

export function isScheduleEffectiveOn(schedule: WeeklySchedule, date: ISODate): boolean {
  return (
    schedule.effectiveFrom <= date &&
    (schedule.effectiveUntil === null || date <= schedule.effectiveUntil)
  );
}

/** Jadwal rutin yang jatuh pada tanggal tertentu, urut jam mulai. */
export function schedulesForDate(schedules: WeeklySchedule[], date: ISODate): WeeklySchedule[] {
  const weekday = weekdayOf(date);
  return schedules
    .filter((s) => s.weekday === weekday && isScheduleEffectiveOn(s, date))
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
}

/** ID sesi stabil untuk satu jadwal rutin pada satu tanggal (dipakai route `/jadwal/[id]`). */
export function occurrenceId(scheduleId: string, date: ISODate): string {
  return `${scheduleId}_${date}`;
}

export function parseOccurrenceId(id: string): { scheduleId: string; date: ISODate } | null {
  const match = /^(.+)_(\d{4}-\d{2}-\d{2})$/.exec(id);
  return match ? { scheduleId: match[1], date: match[2] } : null;
}
