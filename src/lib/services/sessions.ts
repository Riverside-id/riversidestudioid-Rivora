import { suggestNextLesson } from "@/lib/domain/progress";
import { occurrenceId, schedulesForDate, timeToMinutes } from "@/lib/domain/schedule";
import type {
  ClassLessonPlan,
  ISODate,
  LocalTime,
  MeetingRecord,
  MeetingStatus,
  MidtermSegment,
  TeachingClass,
  WeeklySchedule,
} from "@/lib/domain/types";

export interface SessionLesson {
  planId: string;
  title: string;
  materialId: string | null;
  sessionNumber: number;
  plannedSessions: number;
  midtermSegment: MidtermSegment | null;
  /** `true` bila berasal dari saran urutan rencana, bukan dari catatan yang sudah ditautkan guru. */
  isSuggestion: boolean;
}

export interface TeachingSession {
  id: string;
  date: ISODate;
  classId: string;
  classLabel: string;
  startTime: LocalTime;
  endTime: LocalTime;
  status: MeetingStatus;
  isReplacement: boolean;
  notes: string | null;
  /** `null` = kelas belum punya rencana materi atau semua rencana sudah selesai. */
  lesson: SessionLesson | null;
  classHasPlan: boolean;
}

export interface SemesterData {
  classes: TeachingClass[];
  schedules: WeeklySchedule[];
  plans: ClassLessonPlan[];
  meetings: MeetingRecord[];
}

function lessonFromRecord(
  record: MeetingRecord,
  plans: ClassLessonPlan[],
  meetings: MeetingRecord[],
): SessionLesson | null {
  const plan = plans.find((p) => p.id === record.lessonPlanId);
  if (!plan) return null;
  const doneBefore = meetings.filter(
    (m) =>
      m.lessonPlanId === plan.id &&
      m.status === "completed" &&
      m.id !== record.id &&
      m.plannedDate <= record.plannedDate,
  ).length;
  return {
    planId: plan.id,
    title: plan.title,
    materialId: plan.materialId,
    sessionNumber: Math.min(doneBefore + 1, plan.plannedSessions),
    plannedSessions: plan.plannedSessions,
    midtermSegment: plan.midtermSegment,
    isSuggestion: false,
  };
}

function suggestedLesson(plans: ClassLessonPlan[], meetings: MeetingRecord[]): SessionLesson | null {
  const suggestion = suggestNextLesson(plans, meetings);
  if (!suggestion) return null;
  const { plan, sessionNumber } = suggestion;
  return {
    planId: plan.id,
    title: plan.title,
    materialId: plan.materialId,
    sessionNumber,
    plannedSessions: plan.plannedSessions,
    midtermSegment: plan.midtermSegment,
    isSuggestion: true,
  };
}

/**
 * Semua sesi mengajar pada satu tanggal: jadwal rutin + sesi pengganti.
 * Status default `Terjadwal`; tidak pernah otomatis `Selesai` karena tanggal lewat (PRD §6).
 */
export function buildSessionsForDate(date: ISODate, data: SemesterData): TeachingSession[] {
  const classById = new Map(data.classes.map((c) => [c.id, c]));
  const sessions: TeachingSession[] = [];

  for (const schedule of schedulesForDate(data.schedules, date)) {
    const cls = classById.get(schedule.classId);
    if (!cls) continue;
    const classPlans = data.plans.filter((p) => p.classId === cls.id);
    const classMeetings = data.meetings.filter((m) => m.classId === cls.id);
    const record = classMeetings.find(
      (m) => m.weeklyScheduleId === schedule.id && m.plannedDate === date,
    );
    sessions.push({
      id: occurrenceId(schedule.id, date),
      date,
      classId: cls.id,
      classLabel: cls.displayName,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      status: record?.status ?? "scheduled",
      isReplacement: false,
      notes: record?.notes ?? null,
      lesson:
        record?.lessonPlanId != null
          ? lessonFromRecord(record, classPlans, classMeetings)
          : suggestedLesson(classPlans, classMeetings),
      classHasPlan: classPlans.length > 0,
    });
  }

  for (const record of data.meetings) {
    if (record.weeklyScheduleId !== null || record.plannedDate !== date) continue;
    if (!record.startTime || !record.endTime) continue;
    const cls = classById.get(record.classId);
    if (!cls) continue;
    const classPlans = data.plans.filter((p) => p.classId === cls.id);
    const classMeetings = data.meetings.filter((m) => m.classId === cls.id);
    sessions.push({
      id: record.id,
      date,
      classId: cls.id,
      classLabel: cls.displayName,
      startTime: record.startTime,
      endTime: record.endTime,
      status: record.status,
      isReplacement: record.replacementForId !== null,
      notes: record.notes,
      lesson: lessonFromRecord(record, classPlans, classMeetings),
      classHasPlan: classPlans.length > 0,
    });
  }

  return sessions.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
}
