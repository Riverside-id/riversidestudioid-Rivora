import type { RivoraRepository } from "@/lib/data/repository";
import { completedSessionsByPlan } from "@/lib/domain/progress";
import type { MidtermSegment } from "@/lib/domain/types";
import type { AppContext } from "./app-context";
import { buildClassProgress, type ClassProgressItem } from "./dashboard";
import { EMPTY_SEMESTER_DATA, loadSemesterData } from "./semester-data";

export interface TopicProgress {
  planId: string;
  title: string;
  materialTitle: string | null;
  plannedSessions: number;
  completedSessions: number;
  midtermSegment: MidtermSegment | null;
}

export interface ClassProgressDetail extends ClassProgressItem {
  topics: TopicProgress[];
}

export async function getProgressOverview(
  repo: RivoraRepository,
  ctx: AppContext,
): Promise<ClassProgressDetail[]> {
  const [data, materials] = await Promise.all([
    ctx.activeYear && ctx.selectedSemester
      ? loadSemesterData(repo, ctx.activeYear, ctx.selectedSemester)
      : Promise.resolve(EMPTY_SEMESTER_DATA),
    repo.listMaterials(),
  ]);
  const materialTitle = new Map(materials.map((m) => [m.id, m.title]));

  return buildClassProgress(data).map((item) => {
    const plans = data.plans
      .filter((p) => p.classId === item.classId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const done = completedSessionsByPlan(
      plans,
      data.meetings.filter((m) => m.classId === item.classId),
    );
    return {
      ...item,
      topics: plans.map((p) => ({
        planId: p.id,
        title: p.title,
        materialTitle: p.materialId ? (materialTitle.get(p.materialId) ?? null) : null,
        plannedSessions: p.plannedSessions,
        completedSessions: done.get(p.id) ?? 0,
        midtermSegment: p.midtermSegment,
      })),
    };
  });
}
