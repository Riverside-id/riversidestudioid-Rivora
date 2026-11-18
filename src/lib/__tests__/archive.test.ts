import { describe, expect, it } from "vitest";
import type { RivoraRepository } from "@/lib/data/repository";
import type { AcademicYear, TeachingClass } from "@/lib/domain/types";
import { getArchiveOverview } from "@/lib/services/archive";

const year: AcademicYear = {
  id: "y1",
  ownerId: "u",
  label: "2025/2026",
  startDate: "2025-07-01",
  endDate: "2026-06-30",
  status: "archived",
  activeSemesterId: null,
} as AcademicYear;

const cls = (id: string, label: string, archivedAt: string | null) =>
  ({ id, ownerId: "u", academicYearId: "y1", gradeLevel: 1, section: label.slice(1), displayName: label, archivedAt }) as TeachingClass;

describe("ringkasan arsip tahun ajaran", () => {
  it("kelas yang diarsipkan tetap dihitung", async () => {
    const all = [cls("c1", "1A", null), cls("c2", "1B", "2026-03-01T00:00:00Z")];
    const repo = {
      listAcademicYears: async () => [year],
      listSemesters: async () => [],
      listClasses: async (_id: string, options?: { includeArchived?: boolean }) =>
        options?.includeArchived ? all : all.filter((c) => c.archivedAt === null),
    } as unknown as RivoraRepository;
    const [summary] = await getArchiveOverview(repo);
    expect(summary.classLabels).toEqual(["1A", "1B"]);
  });
});
