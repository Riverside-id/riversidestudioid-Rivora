import type { RivoraRepository } from "@/lib/data/repository";
import { calculateClassProgress, type ClassProgress } from "@/lib/domain/progress";
import type { AcademicYear, ISODate, LocalTime, MeetingStatus, Profile, Semester } from "@/lib/domain/types";

export interface ReportFilters {
  yearId?: string;
  /** ID semester, atau "semua". */
  semesterId?: string;
  classId?: string;
  from?: ISODate;
  to?: ISODate;
}

export interface ReportClassRow {
  classId: string;
  classLabel: string;
  archived: boolean;
  plannedSessions: number;
  completed: number;
  postponed: number;
  cancelled: number;
  progress: ClassProgress;
}

export interface ReportMeetingRow {
  date: ISODate;
  semesterNumber: 1 | 2;
  classLabel: string;
  startTime: LocalTime | null;
  endTime: LocalTime | null;
  topic: string | null;
  status: MeetingStatus;
  summary: string | null;
  notes: string | null;
}

export interface TeachingReport {
  profile: Profile | null;
  years: AcademicYear[];
  year: AcademicYear | null;
  semesters: Semester[];
  /** Semester terpilih; null = semua semester tahun itu. */
  semester: Semester | null;
  classOptions: { id: string; label: string; archived: boolean }[];
  filters: { yearId: string | null; semesterId: string; classId: string; from: string; to: string };
  classes: ReportClassRow[];
  meetings: ReportMeetingRow[];
  totals: { planned: number; completed: number; postponed: number; cancelled: number };
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Laporan mengajar dari data asli (F11): per kelas — rencana, selesai, ditunda, batal, progres; dan daftar
 * pertemuan yang dicatat. Hanya data milik guru yang login (repository + RLS). Progres per semester.
 */
export async function getTeachingReport(repo: RivoraRepository, input: ReportFilters): Promise<TeachingReport> {
  const [profile, years] = await Promise.all([repo.getProfile(), repo.listAcademicYears()]);
  const year = years.find((y) => y.id === input.yearId) ?? years.find((y) => y.status === "active") ?? years[0] ?? null;
  const from = input.from && ISO.test(input.from) ? input.from : "";
  const to = input.to && ISO.test(input.to) ? input.to : "";

  const emptyTotals = { planned: 0, completed: 0, postponed: 0, cancelled: 0 };
  if (!year) {
    return {
      profile, years, year, semesters: [], semester: null, classOptions: [],
      filters: { yearId: null, semesterId: "semua", classId: "", from, to },
      classes: [], meetings: [], totals: emptyTotals,
    };
  }

  const [semesters, allClasses] = await Promise.all([
    repo.listSemesters(year.id),
    repo.listClasses(year.id, { includeArchived: true }),
  ]);
  const semester =
    input.semesterId === "semua"
      ? null
      : (semesters.find((s) => s.id === input.semesterId) ??
        semesters.find((s) => s.id === year.activeSemesterId) ??
        semesters[0] ??
        null);
  const chosen = semester ? [semester] : semesters;
  const classId = allClasses.some((c) => c.id === input.classId) ? (input.classId as string) : "";
  const classes = allClasses.filter((c) => !classId || c.id === classId);

  const perSemester = await Promise.all(
    chosen.map(async (s) => {
      const [plans, meetings] = await Promise.all([repo.listLessonPlans(s.id), repo.listMeetingRecords(s.id)]);
      return { semester: s, plans, meetings };
    }),
  );

  const inRange = (date: ISODate) => (!from || date >= from) && (!to || date <= to);
  const rows: ReportClassRow[] = classes.map((c) => {
    let planned = 0;
    let completed = 0;
    let postponed = 0;
    let cancelled = 0;
    for (const { plans, meetings } of perSemester) {
      const classPlans = plans.filter((p) => p.classId === c.id);
      const classMeetings = meetings.filter((m) => m.classId === c.id);
      // Progres dihitung dari seluruh semester (rentang tanggal hanya menyaring daftar & jumlah status).
      const progress = calculateClassProgress(classPlans, classMeetings);
      if (progress.kind === "planned") {
        planned += progress.planned;
        completed += progress.completed;
      }
      const dated = classMeetings.filter((m) => inRange(m.actualDate ?? m.plannedDate));
      postponed += dated.filter((m) => m.status === "postponed").length;
      cancelled += dated.filter((m) => m.status === "cancelled").length;
    }
    return {
      classId: c.id,
      classLabel: c.displayName,
      archived: c.archivedAt !== null,
      plannedSessions: planned,
      completed,
      postponed,
      cancelled,
      progress: planned === 0 ? { kind: "no-plan" } : { kind: "planned", completed, planned, percent: Math.min(100, Math.round((completed / planned) * 100)) },
    };
  });

  const labelOf = new Map(allClasses.map((c) => [c.id, c.displayName]));
  const meetings: ReportMeetingRow[] = perSemester
    .flatMap(({ semester: s, plans, meetings: list }) => {
      const title = new Map(plans.map((p) => [p.id, p.title]));
      return list
        .filter((m) => (!classId || m.classId === classId) && (m.status !== "scheduled" || m.summary || m.notes))
        .map((m) => ({
          date: m.actualDate ?? m.plannedDate,
          semesterNumber: s.number,
          classLabel: labelOf.get(m.classId) ?? "–",
          startTime: m.startTime,
          endTime: m.endTime,
          topic: m.lessonPlanId ? (title.get(m.lessonPlanId) ?? null) : null,
          status: m.status,
          summary: m.summary,
          notes: m.notes,
        }));
    })
    .filter((m) => inRange(m.date))
    .sort((a, b) => (a.date === b.date ? a.classLabel.localeCompare(b.classLabel, "id") : a.date < b.date ? -1 : 1));

  return {
    profile,
    years,
    year,
    semesters,
    semester,
    classOptions: allClasses.map((c) => ({ id: c.id, label: c.displayName, archived: c.archivedAt !== null })),
    filters: { yearId: year.id, semesterId: semester?.id ?? "semua", classId, from, to },
    classes: rows,
    meetings,
    totals: rows.reduce(
      (t, r) => ({
        planned: t.planned + r.plannedSessions,
        completed: t.completed + r.completed,
        postponed: t.postponed + r.postponed,
        cancelled: t.cancelled + r.cancelled,
      }),
      emptyTotals,
    ),
  };
}

/* ------------------------------------------------------------------ CSV */

/** Sel CSV aman: tanda kutip ganda di-escape; awalan formula (= + - @) dinetralkan (CSV injection). */
export function csvCell(value: string | number | null | undefined): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** CSV UTF-8 (BOM, pemisah titik koma — terbaca langsung oleh Excel berbahasa Indonesia & Google Sheets). */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return `﻿${rows.map((r) => r.map(csvCell).join(";")).join("\r\n")}\r\n`;
}
