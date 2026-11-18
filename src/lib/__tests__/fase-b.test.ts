import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/auth/redirect";
import { authErrorMessage, dbErrorMessage } from "@/lib/data/errors";
import { mapProfile, mapWeeklySchedule, toLocalTime } from "@/lib/data/supabase-mappers";
import { readSupabaseEnv } from "@/lib/supabase/env";
import { isProtectedPath } from "@/lib/supabase/proxy-session";
import { buildOnboardingPayload, defaultPeriodDates, onboardingDraftSchema } from "@/lib/validation/onboarding-submit";
import { createScheduleSchema, profileSettingsSchema, semesterDatesSchema } from "@/lib/validation/settings";

const UUID = "3f1c2a7e-8b4d-4c6e-9a1f-2b3c4d5e6f70";

describe("pemeta baris Supabase → domain", () => {
  it("jam Postgres 'HH:MM:SS' menjadi 'HH:MM'", () => {
    expect(toLocalTime("07:30:00")).toBe("07:30");
    const s = mapWeeklySchedule({
      id: "w", owner_id: "o", academic_year_id: "y", class_id: "c", semester_id: "s", weekday: 3,
      start_time: "10:00:00", end_time: "11:00:00", effective_from: "2026-07-01", effective_until: "2026-12-31",
      created_at: "", updated_at: "",
    });
    expect(s).toMatchObject({ weekday: 3, startTime: "10:00", endTime: "11:00", classId: "c" });
  });

  it("profil memetakan status onboarding", () => {
    const p = mapProfile({ user_id: "u", display_name: "Bu Rina", school_name: null, timezone: "Asia/Jakarta", onboarded_at: null, created_at: "", updated_at: "" });
    expect(p).toEqual({ userId: "u", displayName: "Bu Rina", schoolName: null, timezone: "Asia/Jakarta", onboardedAt: null });
  });
});

describe("pesan error berbahasa Indonesia", () => {
  it("constraint database", () => {
    expect(dbErrorMessage({ code: "23P01", message: 'violates exclusion constraint "weekly_schedules_no_overlap"' })).toBe(
      "Jadwal bentrok dengan jadwal lain pada hari dan jam yang sama.",
    );
    expect(dbErrorMessage({ code: "23505", message: 'duplicate key value violates unique constraint "teaching_classes_unique_rombel"' })).toMatch(/sudah ada/);
    expect(dbErrorMessage({ code: "RV001", message: "Tahun ajaran sudah diarsipkan dan hanya bisa dibaca." })).toMatch(/diarsipkan/);
    expect(dbErrorMessage({ code: "42501", message: "new row violates row-level security policy" })).toBe("Anda tidak memiliki akses ke data ini.");
    expect(dbErrorMessage({ code: "XX000", message: "internal" })).toBe("Terjadi kesalahan saat menyimpan. Coba lagi.");
  });

  it("Supabase Auth", () => {
    expect(authErrorMessage({ code: "invalid_credentials" })).toBe("Email atau kata sandi salah.");
    expect(authErrorMessage({ code: "email_not_confirmed" })).toMatch(/belum dikonfirmasi/);
    expect(authErrorMessage({ code: "over_email_send_rate_limit" })).toMatch(/Terlalu banyak/);
    expect(authErrorMessage({ status: 503 })).toMatch(/Layanan sedang bermasalah/);
    expect(authErrorMessage({ name: "AuthRetryableFetchError", status: 0 })).toMatch(/Tidak dapat terhubung/);
  });
});

describe("onboarding → payload RPC", () => {
  const draft = {
    displayName: "Bu Rina",
    schoolName: "",
    academicYearLabel: "2026/2027",
    semesterNumber: 1,
    classes: [{ gradeLevel: 1, section: "a" }, { gradeLevel: 3, section: "B" }],
    schedules: [{ classLabel: "1A", weekday: 3, startTime: "10:00", endTime: "11:00" }],
  };

  it("tanggal default: tahun 1 Jul–30 Jun, Smt 1 Jul–Des, Smt 2 Jan–Jun, UTS belum diatur", () => {
    expect(defaultPeriodDates("2026/2027")).toEqual({
      year: { startDate: "2026-07-01", endDate: "2027-06-30" },
      semesters: [
        { number: 1, startDate: "2026-07-01", endDate: "2026-12-31", midtermDate: null },
        { number: 2, startDate: "2027-01-01", endDate: "2027-06-30", midtermDate: null },
      ],
    });
  });

  it("membangun payload yang ternormalisasi", () => {
    const payload = buildOnboardingPayload(onboardingDraftSchema.parse(draft));
    expect(payload.school_name).toBeNull();
    expect(payload.classes).toEqual([{ grade_level: 1, section: "A" }, { grade_level: 3, section: "B" }]);
    expect(payload.active_semester_number).toBe(1);
    expect(payload.schedules[0]).toEqual({ class_label: "1A", weekday: 3, start_time: "10:00", end_time: "11:00" });
  });

  it("menolak kelas ganda, jadwal untuk kelas tak dikenal, dan jadwal bentrok", () => {
    const bad = onboardingDraftSchema.safeParse({
      ...draft,
      classes: [...draft.classes, { gradeLevel: 1, section: "A" }],
      schedules: [
        { classLabel: "1A", weekday: 3, startTime: "10:00", endTime: "11:00" },
        { classLabel: "3B", weekday: 3, startTime: "10:30", endTime: "11:30" },
        { classLabel: "6Z", weekday: 1, startTime: "07:00", endTime: "08:00" },
      ],
    });
    expect(bad.success).toBe(false);
    const messages = bad.error!.issues.map((i) => i.message);
    expect(messages).toContain("Kelas 1A tercatat dua kali.");
    expect(messages.some((m) => m.startsWith("Bentrok dengan Kelas 1A"))).toBe(true);
    expect(messages).toContain("Jadwal merujuk Kelas 6Z yang tidak ada.");
  });

  it("minimal satu kelas", () => {
    expect(onboardingDraftSchema.safeParse({ ...draft, classes: [], schedules: [] }).success).toBe(false);
  });
});

describe("validasi pengaturan & jadwal", () => {
  it("profil: zona waktu Indonesia saja, sekolah kosong → null", () => {
    expect(profileSettingsSchema.parse({ displayName: "Bu Rina", schoolName: " ", timezone: "Asia/Makassar" }).schoolName).toBeNull();
    expect(profileSettingsSchema.safeParse({ displayName: "Bu Rina", schoolName: "", timezone: "UTC" }).success).toBe(false);
  });

  it("tanggal semester & penanda UTS", () => {
    expect(semesterDatesSchema.safeParse({ semesterId: UUID, startDate: "2026-07-01", endDate: "2026-12-31", midtermDate: "" }).success).toBe(true);
    const outside = semesterDatesSchema.safeParse({ semesterId: UUID, startDate: "2026-07-01", endDate: "2026-12-31", midtermDate: "2027-01-05" });
    expect(outside.error!.issues[0].path).toEqual(["midtermDate"]);
    expect(semesterDatesSchema.safeParse({ semesterId: "bukan-uuid", startDate: "2026-07-01", endDate: "2026-12-31", midtermDate: "" }).success).toBe(false);
  });

  it("jadwal baru: kelas wajib UUID, jam berurutan", () => {
    expect(createScheduleSchema.safeParse({ classId: UUID, weekday: "2", startTime: "07:30", endTime: "08:40" }).success).toBe(true);
    expect(createScheduleSchema.safeParse({ classId: UUID, weekday: "2", startTime: "09:00", endTime: "08:00" }).success).toBe(false);
  });
});

describe("keamanan alur auth", () => {
  it("safeNextPath mencegah open redirect", () => {
    expect(safeNextPath("/onboarding", "/")).toBe("/onboarding");
    expect(safeNextPath("https://jahat.example", "/")).toBe("/");
    expect(safeNextPath("//jahat.example", "/")).toBe("/");
    expect(safeNextPath("/\\jahat.example", "/")).toBe("/");
    expect(safeNextPath(null, "/dashboard")).toBe("/dashboard");
  });

  it("proxy melindungi halaman setelah login, bukan halaman publik", () => {
    expect(isProtectedPath("/dashboard")).toBe(true);
    expect(isProtectedPath("/jadwal/abc_2026-11-18")).toBe(true);
    expect(isProtectedPath("/onboarding")).toBe(true);
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/reset-password")).toBe(false);
    expect(isProtectedPath("/auth/confirm")).toBe(false);
    expect(isProtectedPath("/jadwalku")).toBe(false);
  });

  it("env Supabase hanya membaca kunci publishable", () => {
    expect(readSupabaseEnv({})).toBeNull();
    expect(readSupabaseEnv({ NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x" })).toEqual({
      url: "http://127.0.0.1:54321",
      publishableKey: "sb_publishable_x",
    });
  });
});
