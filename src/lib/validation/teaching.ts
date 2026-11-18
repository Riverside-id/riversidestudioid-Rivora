import { z } from "zod";
import { isISODate, isLocalTime } from "@/lib/date";
import { isValidTimeRange } from "@/lib/domain/schedule";
import { classDraftSchema } from "./onboarding";

/** Isian opsional: kosong → null. */
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, { error: message })
    .transform((v) => (v === "" ? null : v));

const optionalUuid = z.union([z.literal(""), z.uuid({ error: "Pilihan tidak valid." })]).transform((v) => (v === "" ? null : v));

/** Isi rencana materi (F06). */
const lessonPlanFields = {
  title: z
    .string()
    .trim()
    .min(2, { error: "Judul topik minimal 2 karakter." })
    .max(120, { error: "Judul topik maksimal 120 karakter." }),
  plannedSessions: z.coerce
    .number({ error: "Isi jumlah pertemuan." })
    .int({ error: "Jumlah pertemuan berupa angka bulat." })
    .min(1, { error: "Minimal 1 pertemuan." })
    .max(60, { error: "Maksimal 60 pertemuan." }),
  midtermSegment: z
    .enum(["", "before", "after"], { error: "Pilihan UTS/PTS tidak valid." })
    .transform((v) => (v === "" ? null : v)),
  materialId: optionalUuid,
};

export const createLessonPlanSchema = z.object({ classId: z.uuid({ error: "Kelas tidak valid." }), ...lessonPlanFields });
export const updateLessonPlanSchema = z.object({ planId: z.uuid({ error: "Rencana tidak valid." }), ...lessonPlanFields });
export const moveLessonPlanSchema = z.object({
  planId: z.uuid({ error: "Rencana tidak valid." }),
  direction: z.enum(["up", "down"]),
});

export const MEETING_STATUSES = ["scheduled", "completed", "postponed", "cancelled"] as const;

/** Catatan pelaksanaan satu pertemuan (F07) + jadwal pengganti opsional (F04). */
export const saveMeetingSchema = z
  .object({
    sessionId: z.string().min(1).max(100),
    status: z.enum(MEETING_STATUSES, { error: "Pilih status pertemuan." }),
    lessonPlanId: optionalUuid,
    actualDate: z
      .union([z.literal(""), z.string().refine(isISODate, { error: "Tanggal tidak valid." })])
      .transform((v) => (v === "" ? null : v)),
    summary: optionalText(1000, "Ringkasan maksimal 1.000 karakter."),
    notes: optionalText(1000, "Catatan maksimal 1.000 karakter."),
    replacementDate: z
      .union([z.literal(""), z.string().refine(isISODate, { error: "Tanggal pengganti tidak valid." })])
      .transform((v) => (v === "" ? null : v)),
    replacementStart: z.union([z.literal(""), z.string().refine(isLocalTime, { error: "Isi jam mulai." })]),
    replacementEnd: z.union([z.literal(""), z.string().refine(isLocalTime, { error: "Isi jam selesai." })]),
  })
  .superRefine((v, ctx) => {
    if (!v.replacementDate) return;
    if (v.status !== "postponed") {
      ctx.addIssue({ code: "custom", path: ["replacementDate"], message: "Jadwal pengganti hanya untuk pertemuan yang ditunda." });
    }
    if (!v.replacementStart) ctx.addIssue({ code: "custom", path: ["replacementStart"], message: "Isi jam mulai pengganti." });
    if (!v.replacementEnd) ctx.addIssue({ code: "custom", path: ["replacementEnd"], message: "Isi jam selesai pengganti." });
    if (v.replacementStart && v.replacementEnd && !isValidTimeRange(v.replacementStart, v.replacementEnd)) {
      ctx.addIssue({ code: "custom", path: ["replacementEnd"], message: "Jam selesai harus setelah jam mulai." });
    }
  });

export const updateClassSchema = classDraftSchema.extend({ classId: z.uuid({ error: "Kelas tidak valid." }) });
