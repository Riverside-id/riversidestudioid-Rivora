import type { RivoraRepository } from "@/lib/data/repository";
import type { AcademicYear, Semester } from "@/lib/domain/types";
import type { SemesterData } from "./sessions";

/** Muat semua data satu semester (kelas milik tahun ajarannya + jadwal, rencana, realisasi). */
export async function loadSemesterData(
  repo: RivoraRepository,
  year: AcademicYear,
  semester: Semester,
): Promise<SemesterData> {
  const [classes, schedules, plans, meetings] = await Promise.all([
    repo.listClasses(year.id),
    repo.listWeeklySchedules(semester.id),
    repo.listLessonPlans(semester.id),
    repo.listMeetingRecords(semester.id),
  ]);
  return { classes, schedules, plans, meetings };
}

export const EMPTY_SEMESTER_DATA: SemesterData = {
  classes: [],
  schedules: [],
  plans: [],
  meetings: [],
};
