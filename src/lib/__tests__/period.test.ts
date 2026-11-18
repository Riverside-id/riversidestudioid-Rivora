import { describe, expect, it } from "vitest";
import {
  findSemesterForDate,
  isValidAcademicYearLabel,
  midtermSegmentForDate,
  validateSemesterDates,
} from "@/lib/domain/period";
import type { Semester } from "@/lib/domain/types";

const ganjil: Semester = { id: "s1", academicYearId: "y", number: 1, startDate: "2026-07-13", endDate: "2026-12-18", midtermDate: "2026-09-28" };
const genap: Semester = { id: "s2", academicYearId: "y", number: 2, startDate: "2027-01-04", endDate: "2027-06-25", midtermDate: null };

describe("periode akademik tiga lapis (PRD §6)", () => {
  it("label tahun ajaran harus berurutan", () => {
    expect(isValidAcademicYearLabel("2026/2027")).toBe(true);
    expect(isValidAcademicYearLabel("2026/2028")).toBe(false);
    expect(isValidAcademicYearLabel("2026-2027")).toBe(false);
  });

  it("Skenario B: setelah UTS tetap Semester Ganjil", () => {
    expect(findSemesterForDate([ganjil, genap], "2026-10-15")?.id).toBe("s1");
    expect(midtermSegmentForDate(ganjil, "2026-09-01")).toBe("before");
    expect(midtermSegmentForDate(ganjil, "2026-10-15")).toBe("after");
  });

  it("penanda UTS boleh dinonaktifkan", () => {
    expect(midtermSegmentForDate(genap, "2027-03-01")).toBeNull();
  });

  it("tanggal di luar semester tidak punya segmen", () => {
    expect(midtermSegmentForDate(ganjil, "2027-01-10")).toBeNull();
    expect(findSemesterForDate([ganjil, genap], "2026-12-25")).toBeNull();
  });

  it("validasi tanggal semester", () => {
    const year = { startDate: "2026-07-13", endDate: "2027-06-25" };
    expect(validateSemesterDates(ganjil, year)).toEqual([]);
    expect(
      validateSemesterDates({ startDate: "2026-12-01", endDate: "2026-07-01", midtermDate: "2027-02-01" }, year),
    ).toEqual(["start-after-end", "midterm-outside-semester"]);
    expect(validateSemesterDates({ ...ganjil, startDate: "2026-06-01" }, year)).toContain("outside-academic-year");
  });
});
