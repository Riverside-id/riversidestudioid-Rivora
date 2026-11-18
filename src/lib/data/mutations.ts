import { randomUUID } from "node:crypto";
import type { GradeLevel, ISODate, LocalTime, MeetingStatus, MidtermSegment, Weekday } from "@/lib/domain/types";
import {
  checkMaterialFile,
  MATERIAL_BUCKET,
  MATERIAL_FILE_TYPES,
  materialStoragePath,
  opensInBrowser,
  parseOwnedStoragePath,
} from "@/lib/materials/file-rules";
import type { Json } from "@/lib/supabase/database.types";
import type { RivoraSupabaseClient } from "@/lib/supabase/server";
import type { OnboardingPayload } from "@/lib/validation/onboarding-submit";
import { DataError, toDataError, toStorageError } from "./errors";

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
  /** Langkah 1 unggah: izin unggah langsung dari browser ke Storage (signed upload URL). */
  prepareMaterialUpload(input: { fileName: string; fileSize: number; mimeType: string }): Promise<MaterialUploadTicket>;
  /** Langkah 2 unggah: file sudah ada di Storage → simpan data materinya. */
  createMaterial(input: {
    path: string;
    fileName: string;
    title: string;
    description: string | null;
    topic: string | null;
    gradeLevel: GradeLevel | null;
  }): Promise<void>;
  archiveMaterial(materialId: string): Promise<void>;
  restoreMaterial(materialId: string): Promise<void>;
  restoreClass(classId: string): Promise<void>;

  /** Arsipkan tahun aktif & mulai tahun baru dalam satu transaksi (RPC). Progres tidak disalin. */
  startNewAcademicYear(payload: NewAcademicYearPayload): Promise<string>;
  /** Pulihkan tahun arsip menjadi aktif; tahun aktif sekarang diarsipkan (RPC). */
  activateArchivedYear(yearId: string): Promise<void>;
  /** Signed URL berdurasi pendek: PDF dibuka di browser, Word/PowerPoint diunduh. */
  getMaterialFileUrl(materialId: string): Promise<string>;

  updateClass(input: { classId: string; gradeLevel: GradeLevel; section: string }): Promise<void>;

  createLessonPlan(input: {
    academicYearId: string;
    classId: string;
    semesterId: string;
    title: string;
    plannedSessions: number;
    midtermSegment: MidtermSegment | null;
    materialId: string | null;
  }): Promise<void>;
  updateLessonPlan(input: {
    planId: string;
    title: string;
    plannedSessions: number;
    midtermSegment: MidtermSegment | null;
    materialId: string | null;
  }): Promise<void>;
  moveLessonPlan(input: { planId: string; direction: "up" | "down" }): Promise<void>;
  /** Ditolak database bila rencana sudah punya catatan pelaksanaan. */
  deleteLessonPlan(planId: string): Promise<void>;

  /**
   * Catat pelaksanaan satu pertemuan (Selesai/Ditunda/Batal/Terjadwal). Untuk jadwal rutin, catatan
   * dibuat atau diperbarui per kejadian (jadwal + tanggal) sehingga tidak pernah ganda.
   */
  saveMeeting(input: {
    target: MeetingTarget;
    status: MeetingStatus;
    lessonPlanId: string | null;
    actualDate: ISODate | null;
    summary: string | null;
    notes: string | null;
  }): Promise<string>;
  /** Jadwal pengganti untuk pertemuan yang ditunda (tanggal & jam sendiri, tidak mengubah jadwal mingguan). */
  createReplacement(input: { postponedRecordId: string; date: ISODate; startTime: LocalTime; endTime: LocalTime }): Promise<void>;
}

export interface NewAcademicYearPayload {
  label: string;
  start_date: ISODate;
  end_date: ISODate;
  semesters: Array<{ number: 1 | 2; start_date: ISODate; end_date: ISODate; midterm_date: ISODate | null }>;
  active_semester_number: 1 | 2;
  copy_classes: boolean;
  copy_plans: boolean;
  copy_schedules: boolean;
}

export type MeetingTarget = { kind: "occurrence"; scheduleId: string; date: ISODate } | { kind: "record"; recordId: string };

export interface MaterialUploadTicket {
  path: string;
  token: string;
  contentType: string;
}

/** Signed URL file materi berlaku 2 menit (PRD §10: durasi pendek). */
export const MATERIAL_URL_TTL_SECONDS = 120;

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

    async prepareMaterialUpload({ fileName, fileSize, mimeType }) {
      const check = checkMaterialFile({ name: fileName, size: fileSize, type: mimeType });
      if (!check.ok) throw new DataError(check.message, "FILE");
      const path = materialStoragePath(userId, randomUUID(), check.kind);
      // RLS Storage memeriksa folder milik guru saat signed upload URL dibuat.
      const { data, error } = await client.storage.from(MATERIAL_BUCKET).createSignedUploadUrl(path);
      if (error) throw toStorageError(error);
      return { path: data.path, token: data.token, contentType: check.contentType };
    },

    async createMaterial({ path, fileName, title, description, topic, gradeLevel }) {
      const kind = parseOwnedStoragePath(path, userId);
      if (!kind) throw new DataError("File materi tidak valid. Unggah ulang file Anda.", "FILE");

      // Ukuran & tipe diambil dari Storage (bukan dari klaim browser).
      const bucket = client.storage.from(MATERIAL_BUCKET);
      const { data: info, error: infoError } = await bucket.info(path);
      if (infoError || !info) throw toStorageError(infoError ?? { message: "not found" });
      const size = Number(info.size ?? 0);
      const contentType = (info.contentType ?? "").toLowerCase();
      if (size <= 0 || contentType !== MATERIAL_FILE_TYPES[kind].mime) {
        await bucket.remove([path]);
        throw new DataError("File tidak sesuai aturan (jenis file). Unggah ulang file Anda.", "FILE");
      }

      const { error } = await client.from("teaching_materials").insert({
        title,
        description,
        topic,
        grade_level: gradeLevel,
        kind,
        file_path: path,
        file_name: fileName,
        file_size: size,
        mime_type: contentType,
      });
      if (error) {
        // Bersihkan unggahan yang tidak jadi dirujuk (policy hanya mengizinkan file yang belum dipakai).
        await bucket.remove([path]);
        throw toDataError(error);
      }
    },

    async archiveMaterial(materialId) {
      const { data, error } = await client
        .from("teaching_materials")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", materialId)
        .eq("owner_id", userId)
        .is("archived_at", null)
        .select("id");
      if (error) throw toDataError(error);
      ensureAffected(data);
    },

    async updateClass({ classId, gradeLevel, section }) {
      const { data, error } = await client
        .from("teaching_classes")
        .update({ grade_level: gradeLevel, section, display_name: `${gradeLevel}${section}` })
        .eq("id", classId)
        .eq("owner_id", userId)
        .is("archived_at", null)
        .select("id");
      if (error) throw toDataError(error);
      ensureAffected(data);
    },

    async createLessonPlan(input) {
      const { data: last, error: lastError } = await client
        .from("class_lesson_plans")
        .select("sort_order")
        .eq("owner_id", userId)
        .eq("class_id", input.classId)
        .eq("semester_id", input.semesterId)
        .order("sort_order", { ascending: false })
        .limit(1);
      if (lastError) throw toDataError(lastError);
      const { error } = await client.from("class_lesson_plans").insert({
        academic_year_id: input.academicYearId,
        class_id: input.classId,
        semester_id: input.semesterId,
        title: input.title,
        planned_sessions: input.plannedSessions,
        midterm_segment: input.midtermSegment,
        material_id: input.materialId,
        sort_order: (last?.[0]?.sort_order ?? -1) + 1,
      });
      if (error) throw toDataError(error);
    },

    async updateLessonPlan({ planId, title, plannedSessions, midtermSegment, materialId }) {
      const { data, error } = await client
        .from("class_lesson_plans")
        .update({ title, planned_sessions: plannedSessions, midterm_segment: midtermSegment, material_id: materialId })
        .eq("id", planId)
        .eq("owner_id", userId)
        .select("id");
      if (error) throw toDataError(error);
      ensureAffected(data);
    },

    async moveLessonPlan({ planId, direction }) {
      const { data: plan, error } = await client
        .from("class_lesson_plans")
        .select("class_id, semester_id")
        .eq("id", planId)
        .eq("owner_id", userId)
        .maybeSingle();
      if (error) throw toDataError(error);
      if (!plan) throw toDataError({ code: "42501", message: "row-level security" });

      const { data: siblings, error: listError } = await client
        .from("class_lesson_plans")
        .select("id, sort_order")
        .eq("owner_id", userId)
        .eq("class_id", plan.class_id)
        .eq("semester_id", plan.semester_id)
        .order("sort_order")
        .order("created_at");
      if (listError) throw toDataError(listError);

      const order = siblings.map((p) => p.id);
      const index = order.indexOf(planId);
      const target = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= order.length) return;
      [order[index], order[target]] = [order[target], order[index]];

      // Tulis ulang urutan 0..n-1 hanya untuk baris yang berubah.
      for (const [i, id] of order.entries()) {
        if (siblings.find((p) => p.id === id)?.sort_order === i) continue;
        const { error: updateError } = await client
          .from("class_lesson_plans")
          .update({ sort_order: i })
          .eq("id", id)
          .eq("owner_id", userId);
        if (updateError) throw toDataError(updateError);
      }
    },

    async deleteLessonPlan(planId) {
      const { data, error } = await client
        .from("class_lesson_plans")
        .delete()
        .eq("id", planId)
        .eq("owner_id", userId)
        .select("id");
      if (error) throw toDataError(error);
      ensureAffected(data);
    },

    async saveMeeting({ target, status, lessonPlanId, actualDate, summary, notes }) {
      const fields = {
        status,
        lesson_plan_id: lessonPlanId,
        actual_date: status === "completed" ? actualDate : null,
        summary,
        notes,
      };

      if (target.kind === "record") {
        const { data, error } = await client
          .from("meeting_records")
          .update(fields)
          .eq("id", target.recordId)
          .eq("owner_id", userId)
          .select("id");
        if (error) throw toDataError(error);
        ensureAffected(data);
        return target.recordId;
      }

      // Kejadian jadwal rutin: kelas, semester, tahun, dan jam diambil dari jadwal milik guru (RLS).
      const { data: schedule, error: scheduleError } = await client
        .from("weekly_schedules")
        .select("id, academic_year_id, class_id, semester_id, start_time, end_time")
        .eq("id", target.scheduleId)
        .eq("owner_id", userId)
        .maybeSingle();
      if (scheduleError) throw toDataError(scheduleError);
      if (!schedule) throw toDataError({ code: "42501", message: "row-level security" });

      const { data, error } = await client
        .from("meeting_records")
        .upsert(
          {
            ...fields,
            academic_year_id: schedule.academic_year_id,
            class_id: schedule.class_id,
            semester_id: schedule.semester_id,
            weekly_schedule_id: schedule.id,
            planned_date: target.date,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
          },
          { onConflict: "weekly_schedule_id,planned_date" },
        )
        .select("id")
        .single();
      if (error) throw toDataError(error);
      return data.id;
    },

    async createReplacement({ postponedRecordId, date, startTime, endTime }) {
      const { data: original, error: readError } = await client
        .from("meeting_records")
        .select("academic_year_id, class_id, semester_id, lesson_plan_id")
        .eq("id", postponedRecordId)
        .eq("owner_id", userId)
        .maybeSingle();
      if (readError) throw toDataError(readError);
      if (!original) throw toDataError({ code: "42501", message: "row-level security" });

      const { error } = await client.from("meeting_records").insert({
        academic_year_id: original.academic_year_id,
        class_id: original.class_id,
        semester_id: original.semester_id,
        lesson_plan_id: original.lesson_plan_id,
        replacement_for_id: postponedRecordId,
        planned_date: date,
        start_time: startTime,
        end_time: endTime,
      });
      if (error) throw toDataError(error);
    },

    async restoreMaterial(materialId) {
      const { data, error } = await client
        .from("teaching_materials")
        .update({ archived_at: null })
        .eq("id", materialId)
        .eq("owner_id", userId)
        .not("archived_at", "is", null)
        .select("id");
      if (error) throw toDataError(error);
      ensureAffected(data);
    },

    async restoreClass(classId) {
      const { data, error } = await client
        .from("teaching_classes")
        .update({ archived_at: null })
        .eq("id", classId)
        .eq("owner_id", userId)
        .not("archived_at", "is", null)
        .select("id");
      if (error) throw toDataError(error);
      ensureAffected(data);
    },

    async startNewAcademicYear(payload) {
      const { data, error } = await client.rpc("start_new_academic_year", { payload: payload as unknown as Json });
      if (error) throw toDataError(error);
      return data;
    },

    async activateArchivedYear(yearId) {
      const { error } = await client.rpc("activate_archived_year", { year_id: yearId });
      if (error) throw toDataError(error);
    },

    async getMaterialFileUrl(materialId) {
      // Materi yang sudah diarsipkan tetap bisa dibuka (rujukan arsip, PRD F09).
      const { data: row, error } = await client
        .from("teaching_materials")
        .select("kind, file_path, file_name")
        .eq("id", materialId)
        .eq("owner_id", userId)
        .maybeSingle();
      if (error) throw toDataError(error);
      const kind = row?.file_path ? parseOwnedStoragePath(row.file_path, userId) : null;
      if (!row?.file_path || !kind) throw new DataError("File materi tidak ditemukan.", "NOT_FOUND");

      const { data, error: signError } = await client.storage
        .from(MATERIAL_BUCKET)
        .createSignedUrl(row.file_path, MATERIAL_URL_TTL_SECONDS, {
          download: opensInBrowser(kind) ? undefined : (row.file_name ?? true),
        });
      if (signError) throw toStorageError(signError);
      return data.signedUrl;
    },
  };
}
