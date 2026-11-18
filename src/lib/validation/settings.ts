import { z } from "zod";
import { isISODate, isLocalTime } from "@/lib/date";
import { isValidTimeRange } from "@/lib/domain/schedule";
import { displayNameSchema } from "./auth";
import { classDraftSchema } from "./onboarding";

/** V1: zona waktu Indonesia (sama dengan constraint database). */
export const TIMEZONE_OPTIONS = [
  { value: "Asia/Jakarta", label: "WIB — Waktu Indonesia Barat" },
  { value: "Asia/Makassar", label: "WITA — Waktu Indonesia Tengah" },
  { value: "Asia/Jayapura", label: "WIT — Waktu Indonesia Timur" },
] as const;

const timezoneValues = TIMEZONE_OPTIONS.map((t) => t.value) as [string, ...string[]];

export const profileSettingsSchema = z.object({
  displayName: displayNameSchema,
  schoolName: z
    .string()
    .trim()
    .max(80, { error: "Nama sekolah maksimal 80 huruf." })
    .transform((v) => (v ? v : null)),
  timezone: z.enum(timezoneValues, { error: "Pilih zona waktu." }),
});

const isoDate = (label: string) =>
  z.string().refine(isISODate, { error: `${label} belum diisi dengan benar.` });

export const semesterDatesSchema = z
  .object({
    semesterId: z.uuid({ error: "Semester tidak valid." }),
    startDate: isoDate("Tanggal mulai"),
    endDate: isoDate("Tanggal selesai"),
    midtermDate: z
      .string()
      .transform((v) => (v ? v : null))
      .refine((v) => v === null || isISODate(v), { error: "Tanggal UTS/PTS belum benar." }),
  })
  .refine((v) => v.startDate < v.endDate, { error: "Tanggal selesai harus setelah tanggal mulai.", path: ["endDate"] })
  .refine((v) => v.midtermDate === null || (v.midtermDate > v.startDate && v.midtermDate < v.endDate), {
    error: "Tanggal UTS/PTS harus berada di dalam semester.",
    path: ["midtermDate"],
  });

export const newPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, { error: "Kata sandi minimal 8 karakter." })
      .max(72, { error: "Kata sandi maksimal 72 karakter." }),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, { error: "Kata sandi tidak sama.", path: ["confirmPassword"] });

export const createClassSchema = classDraftSchema;

export const createScheduleSchema = z
  .object({
    classId: z.uuid({ error: "Pilih kelas." }),
    weekday: z.coerce.number().int().min(1, { error: "Pilih hari." }).max(7, { error: "Pilih hari." }),
    startTime: z.string().refine(isLocalTime, { error: "Isi jam mulai." }),
    endTime: z.string().refine(isLocalTime, { error: "Isi jam selesai." }),
  })
  .refine((v) => !isLocalTime(v.startTime) || !isLocalTime(v.endTime) || isValidTimeRange(v.startTime, v.endTime), {
    error: "Jam selesai harus setelah jam mulai.",
    path: ["endTime"],
  });

export const idSchema = z.uuid({ error: "Data tidak valid." });
