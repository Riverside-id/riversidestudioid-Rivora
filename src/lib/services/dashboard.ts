import type { RivoraRepository } from "@/lib/data/repository";
import { isDateInSemester } from "@/lib/domain/period";
import { calculateClassProgress, type ClassProgress } from "@/lib/domain/progress";
import type { GradeLevel, ISODate } from "@/lib/domain/types";
import type { AppContext } from "./app-context";
import { EMPTY_SEMESTER_DATA, loadSemesterData } from "./semester-data";
import { buildSessionsForDate, type SemesterData, type TeachingSession } from "./sessions";

export interface ClassProgressItem {
  classId: string;
  classLabel: string;
  gradeLevel: GradeLevel;
  progress: ClassProgress;
}

export interface DashboardData {
  today: ISODate;
  stats: {
    activeClasses: number;
    todaySessions: number;
    savedMaterials: number;
  };
  todaySessions: TeachingSession[];
  classProgress: ClassProgressItem[];
  /** `false` bila tanggal hari ini di luar rentang semester yang sedang dilihat. */
  todayInSelectedSemester: boolean;
}

export function buildClassProgress(data: SemesterData): ClassProgressItem[] {
  return data.classes.map((cls) => ({
    classId: cls.id,
    classLabel: cls.displayName,
    gradeLevel: cls.gradeLevel,
    progress: calculateClassProgress(
      data.plans.filter((p) => p.classId === cls.id),
      data.meetings.filter((m) => m.classId === cls.id),
    ),
  }));
}

export async function getDashboardData(
  repo: RivoraRepository,
  ctx: AppContext,
  today: ISODate,
): Promise<DashboardData> {
  const { activeYear, selectedSemester } = ctx;
  const [materials, data] = await Promise.all([
    repo.listMaterials(),
    activeYear && selectedSemester
      ? loadSemesterData(repo, activeYear, selectedSemester)
      : Promise.resolve(EMPTY_SEMESTER_DATA),
  ]);

  const todayInSelectedSemester = selectedSemester
    ? isDateInSemester(selectedSemester, today)
    : false;
  const todaySessions = todayInSelectedSemester ? buildSessionsForDate(today, data) : [];

  return {
    today,
    stats: {
      activeClasses: data.classes.length,
      todaySessions: todaySessions.length,
      savedMaterials: materials.length,
    },
    todaySessions,
    classProgress: buildClassProgress(data),
    todayInSelectedSemester,
  };
}
