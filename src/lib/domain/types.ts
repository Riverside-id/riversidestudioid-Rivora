/**
 * Domain types — cermin model data PRD §9 (camelCase di TypeScript, snake_case di Supabase nanti).
 * Semua entitas privat dimiliki satu guru (`ownerId`); otorisasi sungguhan ditegakkan RLS di Fase B.
 */

/** Tanggal kalender lokal guru, format `YYYY-MM-DD`. */
export type ISODate = string;
/** Jam lokal guru, format `HH:MM` 24 jam. */
export type LocalTime = string;
/** Hari ISO-8601: 1 = Senin … 7 = Minggu. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
/** Tingkat SD. */
export type GradeLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface Profile {
  userId: string;
  displayName: string;
  schoolName: string | null;
  timezone: string;
}

export type AcademicYearStatus = "active" | "planned" | "archived";

export interface AcademicYear {
  id: string;
  ownerId: string;
  /** Contoh `2026/2027`. */
  label: string;
  startDate: ISODate;
  endDate: ISODate;
  status: AcademicYearStatus;
  /**
   * Satu semester aktif per tahun ajaran (PRD §6). Disimpan di tahun ajaran agar "hanya satu"
   * terjamin secara struktur, bukan lewat flag di tiap semester.
   */
  activeSemesterId: string | null;
}

export type SemesterNumber = 1 | 2;

export interface Semester {
  id: string;
  academicYearId: string;
  number: SemesterNumber;
  startDate: ISODate;
  endDate: ISODate;
  /** Penanda tengah semester (UTS/PTS). `null` = penanda dinonaktifkan. Bukan pergantian semester. */
  midtermDate: ISODate | null;
}

export interface TeachingClass {
  id: string;
  ownerId: string;
  academicYearId: string;
  gradeLevel: GradeLevel;
  /** Kode rombel, contoh `A`, `B`. */
  section: string;
  /** Contoh `1A`. */
  displayName: string;
}

export interface WeeklySchedule {
  id: string;
  classId: string;
  semesterId: string;
  weekday: Weekday;
  startTime: LocalTime;
  endTime: LocalTime;
  effectiveFrom: ISODate;
  effectiveUntil: ISODate | null;
}

export type MaterialKind = "pdf" | "ppt" | "pptx" | "video" | "link" | "note";

export interface TeachingMaterial {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  topic: string | null;
  gradeLevel: GradeLevel | null;
  tags: string[];
  kind: MaterialKind;
  /** Path di Supabase Storage (bucket privat). */
  filePath: string | null;
  externalUrl: string | null;
  createdAt: string;
}

export type MidtermSegment = "before" | "after";

export interface ClassLessonPlan {
  id: string;
  classId: string;
  semesterId: string;
  materialId: string | null;
  title: string;
  sortOrder: number;
  plannedSessions: number;
  midtermSegment: MidtermSegment | null;
}

export type MeetingStatus = "scheduled" | "completed" | "postponed" | "cancelled";

export interface MeetingRecord {
  id: string;
  classId: string;
  semesterId: string;
  weeklyScheduleId: string | null;
  lessonPlanId: string | null;
  plannedDate: ISODate;
  actualDate: ISODate | null;
  /** Diisi untuk sesi pengganti/pengecualian yang tidak mengikuti jam jadwal rutin. */
  startTime: LocalTime | null;
  endTime: LocalTime | null;
  status: MeetingStatus;
  notes: string | null;
  /** Sesi pengganti menunjuk pertemuan yang ditunda, agar tidak terhitung ganda. */
  replacementForId: string | null;
}
