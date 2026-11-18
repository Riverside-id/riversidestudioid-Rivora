import type { RivoraRepository } from "@/lib/data/repository";
import type { AcademicYear } from "@/lib/domain/types";

export interface ArchivedYearSummary {
  year: AcademicYear;
  semesterCount: number;
  classLabels: string[];
  plannedTopics: number;
  completedMeetings: number;
}

/** Ringkasan tahun ajaran berstatus `archived` (baca-saja; arsip bukan hapus — F10). */
export async function getArchiveOverview(repo: RivoraRepository): Promise<ArchivedYearSummary[]> {
  const years = (await repo.listAcademicYears()).filter((y) => y.status === "archived");

  return Promise.all(
    years.map(async (year) => {
      const [semesters, classes] = await Promise.all([
        repo.listSemesters(year.id),
        repo.listClasses(year.id, { includeArchived: true }),
      ]);
      const perSemester = await Promise.all(
        semesters.map(async (s) => {
          const [plans, meetings] = await Promise.all([
            repo.listLessonPlans(s.id),
            repo.listMeetingRecords(s.id),
          ]);
          return {
            plans: plans.length,
            completed: meetings.filter((m) => m.status === "completed").length,
          };
        }),
      );
      return {
        year,
        semesterCount: semesters.length,
        classLabels: classes.map((c) => c.displayName),
        plannedTopics: perSemester.reduce((sum, s) => sum + s.plans, 0),
        completedMeetings: perSemester.reduce((sum, s) => sum + s.completed, 0),
      };
    }),
  );
}
