import type { GradeLevel, ISODate, LocalTime, Weekday } from "@/lib/domain/types";
import type { Json } from "@/lib/supabase/database.types";
import type { RivoraSupabaseClient } from "@/lib/supabase/server";
import type { OnboardingPayload } from "@/lib/validation/onboarding-submit";
import { toDataError } from "./errors";

/**
 * Operasi tulis untuk satu guru terverifikasi. Input SUDAH divalidasi Zod di Server Action;
 * database menegakkan ulang kepemilikan (RLS), keunikan, bentrok jadwal, dan arsip baca-saja.
 */
export interface RivoraMutations {
  completeOnboarding(payload: OnboardingPayload): Promise<void>;
  updateProfile(input: { displayName: string; schoolName: string | null; timezone: string }): Promise<void>;
  updateSemester(input: {
    semesterId: string;
    startDate: ISODate;
    endDate: ISODate;
    midtermDate: ISODate | null;
  }): Promise<void>;
  createClass(input: { academicYearId: string; gradeLevel: GradeLevel; section: string }): Promise<void>;
  archiveClass(classId: string): Promise<void>;
  createWeeklySchedule(input: {
    academicYearId: string;
    semesterId: string;
    classId: string;
    weekday: Weekday;
    startTime: LocalTime;
    endTime: LocalTime;
    effectiveFrom: ISODate;
    effectiveUntil: ISODate;
  }): Promise<void>;
  deleteWeeklySchedule(scheduleId: string): Promise<void>;
}

export function createSupabaseMutations(client: RivoraSupabaseClient, userId: string): RivoraMutations {
  /** Update/hapus yang tidak mengenai baris apa pun = bukan milik guru ini (RLS) atau tidak ada. */
  const ensureAffected = (rows: unknown[] | null) => {
    if (!rows || rows.length === 0) {
      throw toDataError({ code: "42501", message: "row-level security" });
    }
  };

  return {
    async completeOnboarding(payload) {
      // Payload sudah tervalidasi Zod dan hanya berisi nilai JSON primitif.
      const { error } = await client.rpc("complete_onboarding", { payload: payload as unknown as Json });
      if (error) throw toDataError(error);
    },

    async updateProfile({ displayName, schoolName, timezone }) {
      const { data, error } = await client
        .from("profiles")
        .update({ display_name: displayName, school_name: schoolName, timezone })
        .eq("user_id", userId)
        .select("user_id");
      if (error) throw toDataError(error);
      ensureAffected(data);
    },

    async updateSemester({ semesterId, startDate, endDate, midtermDate }) {
      const { data, error } = await client
        .from("semesters")
        .update({ start_date: startDate, end_date: endDate, midterm_date: midtermDate })
        .eq("id", semesterId)
        .eq("owner_id", userId)
        .select("id");
      if (error) throw toDataError(error);
      ensureAffected(data);
    },

    async createClass({ academicYearId, gradeLevel, section }) {
      const { error } = await client.from("teaching_classes").insert({
        academic_year_id: academicYearId,
        grade_level: gradeLevel,
        section,
        display_name: `${gradeLevel}${section}`,
      });
      if (error) throw toDataError(error);
    },

    async archiveClass(classId) {
      const { data, error } = await client
        .from("teaching_classes")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", classId)
        .eq("owner_id", userId)
        .is("archived_at", null)
        .select("id");
      if (error) throw toDataError(error);
      ensureAffected(data);
    },

    async createWeeklySchedule(input) {
      const { error } = await client.from("weekly_schedules").insert({
        academic_year_id: input.academicYearId,
        semester_id: input.semesterId,
        class_id: input.classId,
        weekday: input.weekday,
        start_time: input.startTime,
        end_time: input.endTime,
        effective_from: input.effectiveFrom,
        effective_until: input.effectiveUntil,
      });
      if (error) throw toDataError(error);
    },

    async deleteWeeklySchedule(scheduleId) {
      const { data, error } = await client
        .from("weekly_schedules")
        .delete()
        .eq("id", scheduleId)
        .eq("owner_id", userId)
        .select("id");
      if (error) throw toDataError(error);
      ensureAffected(data);
    },
  };
}
