import type { RivoraRepository } from "@/lib/data/repository";
import { WEEKDAY_LABEL } from "@/lib/domain/labels";
import { findScheduleConflicts, parseOccurrenceId, timeToMinutes } from "@/lib/domain/schedule";
import type { GradeLevel, LocalTime, Weekday } from "@/lib/domain/types";
import type { AppContext } from "./app-context";
import { EMPTY_SEMESTER_DATA, loadSemesterData } from "./semester-data";
import { buildSessionsForDate, type SemesterData, type TeachingSession } from "./sessions";

export interface WeeklySlot {
  scheduleId: string;
  classLabel: string;
  startTime: LocalTime;
  endTime: LocalTime;
}

export interface WeeklyDay {
  weekday: Weekday;
  label: string;
  slots: WeeklySlot[];
}

export interface ClassSummary {
  classId: string;
  classLabel: string;
  gradeLevel: GradeLevel;
  sessionsPerWeek: number;
  planTopics: number;
}

export interface WeeklyOverview {
  days: WeeklyDay[];
  classes: ClassSummary[];
  conflictCount: number;
}

const SCHOOL_DAYS: Weekday[] = [1, 2, 3, 4, 5, 6];

export async function getWeeklyOverview(
  repo: RivoraRepository,
  ctx: AppContext,
): Promise<WeeklyOverview> {
  const data =
    ctx.activeYear && ctx.selectedSemester
      ? await loadSemesterData(repo, ctx.activeYear, ctx.selectedSemester)
      : EMPTY_SEMESTER_DATA;
  const classById = new Map(data.classes.map((c) => [c.id, c]));

  const days = SCHOOL_DAYS.map((weekday) => ({
    weekday,
    label: WEEKDAY_LABEL[weekday],
    slots: data.schedules
      .filter((s) => s.weekday === weekday && classById.has(s.classId))
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
      .map((s) => ({
        scheduleId: s.id,
        classLabel: classById.get(s.classId)!.displayName,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
  })).filter((day) => day.weekday !== 6 || day.slots.length > 0);

  const classes = data.classes.map((c) => ({
    classId: c.id,
    classLabel: c.displayName,
    gradeLevel: c.gradeLevel,
    sessionsPerWeek: data.schedules.filter((s) => s.classId === c.id).length,
    planTopics: data.plans.filter((p) => p.classId === c.id).length,
  }));

  return { days, classes, conflictCount: findScheduleConflicts(data.schedules).length };
}

/** Cari satu sesi dari ID kejadian jadwal (`<scheduleId>_<tanggal>`) atau ID catatan (pengganti). */
export function findSession(data: SemesterData, sessionId: string): TeachingSession | null {
  const occurrence = parseOccurrenceId(sessionId);
  const date =
    occurrence?.date ?? data.meetings.find((m) => m.id === sessionId)?.plannedDate ?? null;
  if (!date) return null;
  return buildSessionsForDate(date, data).find((s) => s.id === sessionId) ?? null;
}

/** Detail satu sesi pada semester terpilih. */
export async function getSessionDetail(
  repo: RivoraRepository,
  ctx: AppContext,
  sessionId: string,
): Promise<TeachingSession | null> {
  if (!ctx.activeYear || !ctx.selectedSemester) return null;
  const data = await loadSemesterData(repo, ctx.activeYear, ctx.selectedSemester);
  return findSession(data, sessionId);
}
