import { buildDemoDataset, type DemoScenario } from "./fixtures/demo-data";
import type { RivoraRepository } from "./repository";

/** Repository berbasis data demo di memori. Mengembalikan salinan agar data sumber tidak termutasi. */
export function createFixtureRepository(scenario: DemoScenario = "lengkap"): RivoraRepository {
  const data = buildDemoDataset(scenario);
  const copy = <T>(value: T): T => structuredClone(value);

  return {
    source: "fixture",
    async getProfile() {
      return copy(data.profile);
    },
    async listAcademicYears() {
      return copy(data.academicYears);
    },
    async listSemesters(academicYearId) {
      return copy(
        data.semesters
          .filter((s) => s.academicYearId === academicYearId)
          .sort((a, b) => a.number - b.number),
      );
    },
    async listClasses(academicYearId, options) {
      return copy(
        data.classes
          .filter((c) => c.academicYearId === academicYearId && (options?.includeArchived || c.archivedAt === null))
          .sort(
            (a, b) => a.gradeLevel - b.gradeLevel || a.section.localeCompare(b.section, "id"),
          ),
      );
    },
    async listWeeklySchedules(semesterId) {
      return copy(data.schedules.filter((s) => s.semesterId === semesterId));
    },
    async listMaterials() {
      return copy(
        [...data.materials].sort(
          (a, b) => (a.gradeLevel ?? 0) - (b.gradeLevel ?? 0) || a.title.localeCompare(b.title, "id"),
        ),
      );
    },
    async listArchivedMaterials() {
      return [];
    },
    async listLessonPlans(semesterId) {
      return copy(
        data.lessonPlans
          .filter((p) => p.semesterId === semesterId)
          .sort((a, b) => a.sortOrder - b.sortOrder),
      );
    },
    async listMeetingRecords(semesterId) {
      return copy(data.meetings.filter((m) => m.semesterId === semesterId));
    },
    async listMeetingStatusEvents() {
      // Data contoh tidak menyimpan histori status.
      return [];
    },
  };
}
