import { randomUUID } from "node:crypto";
import type { GradeLevel, ISODate, LocalTime, Weekday } from "@/lib/domain/types";
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
  /** Signed URL berdurasi pendek: PDF dibuka di browser, Word/PowerPoint diunduh. */
  getMaterialFileUrl(materialId: string): Promise<string>;
}

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
