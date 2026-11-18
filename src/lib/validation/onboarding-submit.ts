import { z } from "zod";
import type { ISODate, Weekday } from "@/lib/domain/types";
import {
  classDraftSchema,
  classLabel,
  findDuplicateClass,
  findScheduleClash,
  periodStepSchema,
  scheduleDraftSchema,
  type DraftClass,
  type DraftSchedule,
} from "./onboarding";

/** Draf wizard yang dikirim browser saat langkah terakhir (divalidasi ulang di server). */
export const onboardingDraftSchema = z
  .object({
    displayName: periodStepSchema.shape.displayName,
    schoolName: periodStepSchema.shape.schoolName,
    academicYearLabel: periodStepSchema.shape.academicYearLabel,
    semesterNumber: periodStepSchema.shape.semesterNumber,
    classes: z.array(classDraftSchema).min(1, { error: "Tambahkan minimal satu kelas." }).max(30),
    schedules: z.array(scheduleDraftSchema).max(80),
  })
  .superRefine((draft, ctx) => {
    const seen: DraftClass[] = [];
    for (const c of draft.classes) {
      const cls = { gradeLevel: c.gradeLevel, section: c.section } as DraftClass;
      if (findDuplicateClass(seen, cls)) {
        ctx.addIssue({ code: "custom", path: ["classes"], message: `Kelas ${classLabel(cls)} tercatat dua kali.` });
      }
      seen.push(cls);
    }
    const labels = new Set(seen.map(classLabel));
    const accepted: DraftSchedule[] = [];
    for (const s of draft.schedules) {
      const schedule = { ...s, weekday: s.weekday as Weekday };
      if (!labels.has(schedule.classLabel)) {
        ctx.addIssue({ code: "custom", path: ["schedules"], message: `Jadwal merujuk Kelas ${schedule.classLabel} yang tidak ada.` });
        continue;
      }
      const clash = findScheduleClash(accepted, schedule);
      if (clash) ctx.addIssue({ code: "custom", path: ["schedules"], message: clash });
      accepted.push(schedule);
    }
  });

export type OnboardingDraftInput = z.input<typeof onboardingDraftSchema>;

export interface PeriodDates {
  year: { startDate: ISODate; endDate: ISODate };
  semesters: Array<{ number: 1 | 2; startDate: ISODate; endDate: ISODate; midtermDate: ISODate | null }>;
}

/**
 * Tanggal default dari label tahun ajaran (keputusan pemilik): tahun ajaran 1 Juli–30 Juni,
 * Semester 1 Juli–Desember, Semester 2 Januari–Juni, penanda UTS/PTS belum diatur.
 * Guru dapat menyesuaikan di Pengaturan.
 */
export function defaultPeriodDates(academicYearLabel: string): PeriodDates {
  const [first, second] = academicYearLabel.split("/").map(Number);
  return {
    year: { startDate: `${first}-07-01`, endDate: `${second}-06-30` },
    semesters: [
      { number: 1, startDate: `${first}-07-01`, endDate: `${first}-12-31`, midtermDate: null },
      { number: 2, startDate: `${second}-01-01`, endDate: `${second}-06-30`, midtermDate: null },
    ],
  };
}

/** Bentuk JSON yang diterima RPC `complete_onboarding`. */
export interface OnboardingPayload {
  display_name: string;
  school_name: string | null;
  academic_year: { label: string; start_date: string; end_date: string };
  semesters: Array<{ number: number; start_date: string; end_date: string; midterm_date: string | null }>;
  active_semester_number: number;
  classes: Array<{ grade_level: number; section: string }>;
  schedules: Array<{ class_label: string; weekday: number; start_time: string; end_time: string }>;
}

export function buildOnboardingPayload(draft: z.output<typeof onboardingDraftSchema>): OnboardingPayload {
  const dates = defaultPeriodDates(draft.academicYearLabel);
  return {
    display_name: draft.displayName,
    school_name: draft.schoolName ?? null,
    academic_year: { label: draft.academicYearLabel, start_date: dates.year.startDate, end_date: dates.year.endDate },
    semesters: dates.semesters.map((s) => ({
      number: s.number,
      start_date: s.startDate,
      end_date: s.endDate,
      midterm_date: s.midtermDate,
    })),
    active_semester_number: draft.semesterNumber,
    classes: draft.classes.map((c) => ({ grade_level: c.gradeLevel, section: c.section })),
    schedules: draft.schedules.map((s) => ({
      class_label: s.classLabel,
      weekday: s.weekday,
      start_time: s.startTime,
      end_time: s.endTime,
    })),
  };
}
