import type { ISODate, MidtermSegment, Semester } from "./types";

/**
 * Aturan periode akademik tiga lapis (PRD §6):
 * Tahun ajaran → Semester (1 Ganjil / 2 Genap) → penanda Sebelum/Setelah UTS/PTS.
 * UTS/PTS hanya penanda di dalam semester, tidak pernah pergantian semester/tahun.
 */

const YEAR_LABEL = /^(\d{4})\/(\d{4})$/;

/** `2026/2027` valid; tahun kedua harus tepat tahun pertama + 1. */
export function isValidAcademicYearLabel(label: string): boolean {
  const match = YEAR_LABEL.exec(label.trim());
  if (!match) return false;
  return Number(match[2]) === Number(match[1]) + 1;
}

export function isDateInSemester(semester: Semester, date: ISODate): boolean {
  return date >= semester.startDate && date <= semester.endDate;
}

export function findSemesterForDate(semesters: Semester[], date: ISODate): Semester | null {
  return semesters.find((s) => isDateInSemester(s, date)) ?? null;
}

/**
 * Segmen UTS untuk sebuah tanggal — hanya untuk filter/saran tampilan.
 * Mengembalikan `null` bila penanda dinonaktifkan atau tanggal di luar semester.
 * Hasil ini TIDAK PERNAH dipakai untuk menandai materi terlaksana.
 */
export function midtermSegmentForDate(semester: Semester, date: ISODate): MidtermSegment | null {
  if (!semester.midtermDate || !isDateInSemester(semester, date)) return null;
  return date < semester.midtermDate ? "before" : "after";
}

export type SemesterDateIssue =
  | "start-after-end"
  | "midterm-outside-semester"
  | "outside-academic-year";

/** Validasi tanggal semester terhadap tahun ajarannya (dipakai form Fase B/D). */
export function validateSemesterDates(
  semester: Pick<Semester, "startDate" | "endDate" | "midtermDate">,
  year: { startDate: ISODate; endDate: ISODate },
): SemesterDateIssue[] {
  const issues: SemesterDateIssue[] = [];
  if (semester.startDate > semester.endDate) issues.push("start-after-end");
  if (
    semester.midtermDate &&
    (semester.midtermDate <= semester.startDate || semester.midtermDate >= semester.endDate)
  ) {
    issues.push("midterm-outside-semester");
  }
  if (semester.startDate < year.startDate || semester.endDate > year.endDate) {
    issues.push("outside-academic-year");
  }
  return issues;
}
