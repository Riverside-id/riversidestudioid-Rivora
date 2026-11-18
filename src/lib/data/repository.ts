import type {
  AcademicYear,
  ClassLessonPlan,
  MeetingRecord,
  MeetingStatusEvent,
  Profile,
  Semester,
  TeachingClass,
  TeachingMaterial,
  WeeklySchedule,
} from "@/lib/domain/types";

/**
 * Kontrak akses data untuk SATU guru yang sedang login.
 *
 * Implementasi:
 * - `FixtureRepository` (Fase A) — data demo di memori, hanya untuk development/preview.
 * - `SupabaseRepository` (Fase B) — query Supabase; kepemilikan ditegakkan RLS + cek server,
 *   bukan hanya filter frontend (PRD §9).
 *
 * Semua method async agar pemanggil tidak perlu berubah saat beralih ke Supabase.
 */
export interface RivoraRepository {
  readonly source: DataSource;
  getProfile(): Promise<Profile | null>;
  listAcademicYears(): Promise<AcademicYear[]>;
  listSemesters(academicYearId: string): Promise<Semester[]>;
  /** Default hanya kelas aktif; `includeArchived` untuk arsip & riwayat. */
  listClasses(academicYearId: string, options?: { includeArchived?: boolean }): Promise<TeachingClass[]>;
  listWeeklySchedules(semesterId: string): Promise<WeeklySchedule[]>;
  listMaterials(): Promise<TeachingMaterial[]>;
  /** Materi yang diarsipkan (file tetap tersimpan). */
  listArchivedMaterials(): Promise<TeachingMaterial[]>;
  listLessonPlans(semesterId: string): Promise<ClassLessonPlan[]>;
  listMeetingRecords(semesterId: string): Promise<MeetingRecord[]>;
  /** Histori perubahan status untuk pertemuan tertentu (urut waktu). */
  listMeetingStatusEvents(meetingIds: string[]): Promise<MeetingStatusEvent[]>;
}

export type DataSource = "fixture" | "supabase";
