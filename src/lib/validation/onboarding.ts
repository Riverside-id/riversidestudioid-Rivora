import { z } from "zod";
import { isLocalTime } from "@/lib/date";
import { WEEKDAY_LABEL } from "@/lib/domain/labels";
import { isValidAcademicYearLabel } from "@/lib/domain/period";
import { isValidTimeRange, timeRangesOverlap } from "@/lib/domain/schedule";
import type { GradeLevel, LocalTime, Weekday } from "@/lib/domain/types";
import { formatTimeRange } from "@/lib/date";
import { displayNameSchema } from "./auth";

/* Langkah 1 — Profil & periode */
export const periodStepSchema = z.object({
  displayName: displayNameSchema,
  schoolName: z
    .string()
    .trim()
    .max(80, { error: "Nama sekolah maksimal 80 huruf." })
    .optional()
    .transform((v) => (v ? v : undefined)),
  academicYearLabel: z
    .string()
    .trim()
    .refine(isValidAcademicYearLabel, {
      error: "Tulis tahun ajaran seperti 2026/2027 (tahun kedua = tahun pertama + 1).",
    }),
  semesterNumber: z.union([z.literal(1), z.literal(2)], {
    error: "Pilih Semester 1 (Ganjil) atau Semester 2 (Genap).",
  }),
});
export type PeriodStepInput = z.input<typeof periodStepSchema>;

/* Langkah 2 — Kelas */
export interface DraftClass {
  gradeLevel: GradeLevel;
  section: string;
}

export const classDraftSchema = z.object({
  gradeLevel: z.coerce
    .number()
    .int()
    .min(1, { error: "Pilih tingkat kelas 1–6." })
    .max(6, { error: "Pilih tingkat kelas 1–6." }),
  section: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{1,2}$/, { error: "Rombel berupa huruf, contoh A atau B." }),
});

export function classLabel(c: DraftClass): string {
  return `${c.gradeLevel}${c.section}`;
}

/** F03: rombel duplikat pada tahun ajaran yang sama ditolak secara konsisten. */
export function findDuplicateClass(existing: DraftClass[], candidate: DraftClass): boolean {
  return existing.some((c) => classLabel(c) === classLabel(candidate));
}

/* Langkah 3 — Jadwal */
export interface DraftSchedule {
  classLabel: string;
  weekday: Weekday;
  startTime: LocalTime;
  endTime: LocalTime;
}

export const scheduleDraftSchema = z
  .object({
    classLabel: z.string().min(1, { error: "Pilih kelas." }),
    weekday: z.coerce
      .number()
      .int()
      .min(1, { error: "Pilih hari." })
      .max(7, { error: "Pilih hari." }),
    startTime: z.string().refine(isLocalTime, { error: "Isi jam mulai." }),
    endTime: z.string().refine(isLocalTime, { error: "Isi jam selesai." }),
  })
  .refine((v) => !isLocalTime(v.startTime) || !isLocalTime(v.endTime) || isValidTimeRange(v.startTime, v.endTime), {
    error: "Jam selesai harus setelah jam mulai.",
    path: ["endTime"],
  });

/** Pesan bentrok yang mudah dipahami, atau `null` bila aman. */
export function findScheduleClash(existing: DraftSchedule[], candidate: DraftSchedule): string | null {
  const clash = existing.find(
    (s) => s.weekday === candidate.weekday && timeRangesOverlap(s, candidate),
  );
  if (!clash) return null;
  return `Bentrok dengan Kelas ${clash.classLabel} (${WEEKDAY_LABEL[clash.weekday]}, ${formatTimeRange(clash.startTime, clash.endTime)}).`;
}

/* Util */
export function issuesToFieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}

/** Tahun ajaran default dari tanggal: Juli–Desember → Y/Y+1, Januari–Juni → Y-1/Y. */
export function defaultAcademicYearLabel(isoDate: string): string {
  const [y, m] = isoDate.split("-").map(Number);
  return m >= 7 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

export function defaultSemesterNumber(isoDate: string): 1 | 2 {
  const m = Number(isoDate.split("-")[1]);
  return m >= 7 ? 1 : 2;
}
