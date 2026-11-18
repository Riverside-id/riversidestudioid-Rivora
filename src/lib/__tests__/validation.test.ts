import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "@/lib/validation/auth";
import {
  classDraftSchema,
  defaultAcademicYearLabel,
  defaultSemesterNumber,
  findDuplicateClass,
  findScheduleClash,
  periodStepSchema,
  scheduleDraftSchema,
} from "@/lib/validation/onboarding";

describe("validasi auth", () => {
  it("pesan error berbahasa Indonesia", () => {
    const result = loginSchema.safeParse({ email: "bukan-email", password: "" });
    expect(result.success).toBe(false);
    const messages = result.error!.issues.map((i) => i.message);
    expect(messages).toContain("Format email belum benar. Contoh: nama@sekolah.sch.id");
    expect(messages).toContain("Kata sandi wajib diisi.");
  });

  it("konfirmasi kata sandi harus sama", () => {
    const result = registerSchema.safeParse({
      displayName: "Bu Sari",
      email: "guru@contoh.sch.id",
      password: "rahasia123",
      confirmPassword: "rahasia124",
    });
    expect(result.success).toBe(false);
    expect(result.error!.issues[0].path).toEqual(["confirmPassword"]);
  });
});

describe("validasi onboarding", () => {
  it("langkah periode", () => {
    expect(
      periodStepSchema.safeParse({ displayName: "Bu Sari", academicYearLabel: "2026/2027", semesterNumber: 1 }).success,
    ).toBe(true);
    expect(
      periodStepSchema.safeParse({ displayName: "Bu Sari", academicYearLabel: "2026/2028", semesterNumber: 1 }).success,
    ).toBe(false);
  });

  it("rombel dinormalisasi dan duplikat ditolak (F03)", () => {
    const parsed = classDraftSchema.parse({ gradeLevel: "1", section: " a " });
    expect(parsed).toEqual({ gradeLevel: 1, section: "A" });
    expect(findDuplicateClass([{ gradeLevel: 1, section: "A" }], { gradeLevel: 1, section: "A" })).toBe(true);
    expect(findDuplicateClass([{ gradeLevel: 1, section: "A" }], { gradeLevel: 1, section: "B" })).toBe(false);
    expect(classDraftSchema.safeParse({ gradeLevel: 7, section: "A" }).success).toBe(false);
  });

  it("jam selesai harus setelah jam mulai", () => {
    const r = scheduleDraftSchema.safeParse({ classLabel: "1A", weekday: 1, startTime: "10:00", endTime: "09:00" });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0].path).toEqual(["endTime"]);
  });

  it("mendeteksi bentrok dengan pesan jelas", () => {
    const existing = [{ classLabel: "3B", weekday: 3 as const, startTime: "10:00", endTime: "11:00" }];
    expect(findScheduleClash(existing, { classLabel: "6A", weekday: 3, startTime: "11:00", endTime: "12:00" })).toBeNull();
    expect(findScheduleClash(existing, { classLabel: "6A", weekday: 3, startTime: "10:30", endTime: "11:30" })).toBe(
      "Bentrok dengan Kelas 3B (Rabu, 10.00 – 11.00).",
    );
  });

  it("tahun ajaran & semester default dari tanggal", () => {
    expect(defaultAcademicYearLabel("2026-11-18")).toBe("2026/2027");
    expect(defaultAcademicYearLabel("2027-02-01")).toBe("2026/2027");
    expect(defaultSemesterNumber("2026-11-18")).toBe(1);
    expect(defaultSemesterNumber("2027-02-01")).toBe(2);
  });
});
