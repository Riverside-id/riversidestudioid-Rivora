import type { RivoraSupabaseClient } from "@/lib/supabase/server";
import { toDataError } from "./errors";
import type { RivoraRepository } from "./repository";
import {
  mapAcademicYear,
  mapProfile,
  mapSemester,
  mapTeachingClass,
  mapTeachingMaterial,
  mapWeeklySchedule,
} from "./supabase-mappers";

/**
 * Repository Supabase untuk satu guru terverifikasi.
 * RLS adalah penjaga utama; filter owner_id di sini adalah lapisan tambahan (defense in depth),
 * bukan satu-satunya proteksi (PRD §9).
 *
 * Rencana materi dan catatan pelaksanaan baru dibuat tabelnya di Fase C — sampai saat itu
 * mengembalikan daftar kosong sehingga UI menampilkan empty state yang sudah ada.
 */
export function createSupabaseRepository(client: RivoraSupabaseClient, userId: string): RivoraRepository {
  return {
    source: "supabase",

    async getProfile() {
      const { data, error } = await client.from("profiles").select("*").eq("user_id", userId).maybeSingle();
      if (error) throw toDataError(error);
      return data ? mapProfile(data) : null;
    },

    async listAcademicYears() {
      const { data, error } = await client
        .from("academic_years")
        .select("*")
        .eq("owner_id", userId)
        .order("start_date", { ascending: false });
      if (error) throw toDataError(error);
      return data.map(mapAcademicYear);
    },

    async listSemesters(academicYearId) {
      const { data, error } = await client
        .from("semesters")
        .select("*")
        .eq("owner_id", userId)
        .eq("academic_year_id", academicYearId)
        .order("number");
      if (error) throw toDataError(error);
      return data.map(mapSemester);
    },

    async listClasses(academicYearId) {
      const { data, error } = await client
        .from("teaching_classes")
        .select("*")
        .eq("owner_id", userId)
        .eq("academic_year_id", academicYearId)
        .is("archived_at", null)
        .order("grade_level")
        .order("section");
      if (error) throw toDataError(error);
      return data.map(mapTeachingClass);
    },

    async listWeeklySchedules(semesterId) {
      const { data, error } = await client
        .from("weekly_schedules")
        .select("*")
        .eq("owner_id", userId)
        .eq("semester_id", semesterId)
        .order("weekday")
        .order("start_time");
      if (error) throw toDataError(error);
      return data.map(mapWeeklySchedule);
    },

    async listMaterials() {
      const { data, error } = await client
        .from("teaching_materials")
        .select("*")
        .eq("owner_id", userId)
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      if (error) throw toDataError(error);
      return data.map(mapTeachingMaterial);
    },
    async listLessonPlans() {
      return [];
    },
    async listMeetingRecords() {
      return [];
    },
  };
}
