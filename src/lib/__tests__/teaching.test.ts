import { describe, expect, it } from "vitest";
import { dbErrorMessage } from "@/lib/data/errors";
import { createLessonPlanSchema, saveMeetingSchema, updateClassSchema } from "@/lib/validation/teaching";

const CLASS_ID = "11111111-1111-4111-8111-111111111111";
const PLAN_ID = "22222222-2222-4222-8222-222222222222";

const meeting = (over: Record<string, string> = {}) => ({
  sessionId: `${CLASS_ID}_2026-07-15`,
  status: "completed",
  lessonPlanId: PLAN_ID,
  actualDate: "",
  summary: "",
  notes: "",
  replacementDate: "",
  replacementStart: "",
  replacementEnd: "",
  ...over,
});

describe("validasi rencana materi", () => {
  it("judul, jumlah pertemuan 1–60, penanda UTS opsional, materi opsional", () => {
    const ok = createLessonPlanSchema.safeParse({
      classId: CLASS_ID,
      title: " Penjumlahan Sederhana ",
      plannedSessions: "4",
      midtermSegment: "before",
      materialId: "",
    });
    expect(ok.success && ok.data).toEqual({
      classId: CLASS_ID,
      title: "Penjumlahan Sederhana",
      plannedSessions: 4,
      midtermSegment: "before",
      materialId: null,
    });
    const base = { classId: CLASS_ID, title: "Topik", midtermSegment: "", materialId: "" };
    expect(createLessonPlanSchema.safeParse({ ...base, plannedSessions: "0" }).success).toBe(false);
    expect(createLessonPlanSchema.safeParse({ ...base, plannedSessions: "61" }).success).toBe(false);
    expect(createLessonPlanSchema.safeParse({ ...base, plannedSessions: "2,5" }).success).toBe(false);
    expect(createLessonPlanSchema.safeParse({ ...base, plannedSessions: "2", midtermSegment: "tengah" }).success).toBe(false);
  });
});

describe("validasi catatan pertemuan", () => {
  it("Selesai dengan ringkasan & catatan opsional", () => {
    const r = saveMeetingSchema.safeParse(meeting({ summary: "  Membilang benda  ", notes: "" }));
    expect(r.success && r.data).toMatchObject({ status: "completed", summary: "Membilang benda", notes: null, replacementDate: null });
  });

  it("jadwal pengganti hanya untuk Ditunda, wajib jam, dan jam selesai setelah jam mulai", () => {
    expect(saveMeetingSchema.safeParse(meeting({ status: "completed", replacementDate: "2026-07-17", replacementStart: "09:00", replacementEnd: "10:00" })).success).toBe(false);
    expect(saveMeetingSchema.safeParse(meeting({ status: "postponed", replacementDate: "2026-07-17" })).success).toBe(false);
    expect(saveMeetingSchema.safeParse(meeting({ status: "postponed", replacementDate: "2026-07-17", replacementStart: "10:00", replacementEnd: "09:00" })).success).toBe(false);
    expect(saveMeetingSchema.safeParse(meeting({ status: "postponed", replacementDate: "2026-07-17", replacementStart: "09:00", replacementEnd: "10:00" })).success).toBe(true);
  });

  it("status tidak dikenal ditolak", () => {
    expect(saveMeetingSchema.safeParse(meeting({ status: "selesai-otomatis" })).success).toBe(false);
  });
});

describe("validasi edit kelas", () => {
  it("rombel huruf, tingkat 1–6", () => {
    expect(updateClassSchema.safeParse({ classId: CLASS_ID, gradeLevel: "2", section: "b" }).success).toBe(true);
    expect(updateClassSchema.safeParse({ classId: CLASS_ID, gradeLevel: "7", section: "A" }).success).toBe(false);
    expect(updateClassSchema.safeParse({ classId: CLASS_ID, gradeLevel: "2", section: "1" }).success).toBe(false);
  });
});

describe("pesan error database Tahap 1", () => {
  it("menjelaskan aturan riwayat dan duplikat dalam bahasa guru", () => {
    expect(dbErrorMessage({ code: "23503", message: 'violates foreign key constraint "meeting_records_plan_fk"' })).toMatch(/tidak bisa dihapus/);
    expect(dbErrorMessage({ code: "23505", message: 'duplicate key value violates unique constraint "meeting_records_replacement_key"' })).toMatch(/sudah punya jadwal pengganti/);
    expect(dbErrorMessage({ code: "RV005", message: "Jadwal pengganti hanya untuk pertemuan yang ditunda." })).toMatch(/ditunda/);
    expect(dbErrorMessage({ code: "RV006", message: "Rencana materi ini bukan untuk semester tersebut." })).toMatch(/semester/);
  });
});
