import type { RivoraRepository } from "@/lib/data/repository";
import { calculateClassProgress, completedSessionsByPlan, suggestNextLesson, type ClassProgress } from "@/lib/domain/progress";
import type { ISODate, LocalTime, MaterialKind, MeetingStatus, MidtermSegment, TeachingClass } from "@/lib/domain/types";
import { occurrenceId } from "@/lib/domain/schedule";
import type { AppContext } from "./app-context";
import { loadSemesterData } from "./semester-data";

export interface PlanItem {
  id: string;
  title: string;
  plannedSessions: number;
  completedSessions: number;
  midtermSegment: MidtermSegment | null;
  materialId: string | null;
  materialTitle: string | null;
  materialKind: MaterialKind | null;
  /** Sudah dipakai di catatan pertemuan → tidak bisa dihapus (riwayat). */
  hasRecords: boolean;
}

export interface MaterialOption {
  id: string;
  title: string;
  kind: MaterialKind;
}

export interface HistoryItem {
  /** ID untuk tautan `/jadwal/[id]`. */
  sessionId: string;
  date: ISODate;
  startTime: LocalTime | null;
  endTime: LocalTime | null;
  status: MeetingStatus;
  topic: string | null;
  summary: string | null;
  notes: string | null;
  isReplacement: boolean;
}

export interface ClassPlanPage {
  cls: TeachingClass;
  /** Kelas diarsipkan: riwayat tetap bisa dibaca, rencana tidak bisa diubah. */
  archived: boolean;
  plans: PlanItem[];
  progress: ClassProgress;
  next: { title: string; sessionNumber: number; plannedSessions: number } | null;
  materials: MaterialOption[];
  history: HistoryItem[];
}

/** Rencana materi + riwayat pelaksanaan satu kelas pada semester terpilih. */
export async function getClassPlanPage(
  repo: RivoraRepository,
  ctx: AppContext,
  classId: string,
): Promise<ClassPlanPage | null> {
  if (!ctx.activeYear || !ctx.selectedSemester) return null;
  const [data, materials, allClasses] = await Promise.all([
    loadSemesterData(repo, ctx.activeYear, ctx.selectedSemester),
    repo.listMaterials(),
    repo.listClasses(ctx.activeYear.id, { includeArchived: true }),
  ]);
  const cls = allClasses.find((c) => c.id === classId);
  if (!cls) return null;

  const plans = data.plans.filter((p) => p.classId === classId).sort((a, b) => a.sortOrder - b.sortOrder);
  const meetings = data.meetings.filter((m) => m.classId === classId);
  const done = completedSessionsByPlan(plans, meetings);
  const materialById = new Map(materials.map((m) => [m.id, m]));
  const planTitle = new Map(plans.map((p) => [p.id, p.title]));
  const suggestion = suggestNextLesson(plans, meetings);

  return {
    cls,
    archived: cls.archivedAt !== null,
    plans: plans.map((p) => {
      const material = p.materialId ? materialById.get(p.materialId) : undefined;
      return {
        id: p.id,
        title: p.title,
        plannedSessions: p.plannedSessions,
        completedSessions: done.get(p.id) ?? 0,
        midtermSegment: p.midtermSegment,
        materialId: p.materialId,
        materialTitle: material?.title ?? null,
        materialKind: material?.kind ?? null,
        hasRecords: meetings.some((m) => m.lessonPlanId === p.id),
      };
    }),
    progress: calculateClassProgress(plans, meetings),
    next: suggestion
      ? { title: suggestion.plan.title, sessionNumber: suggestion.sessionNumber, plannedSessions: suggestion.plan.plannedSessions }
      : null,
    materials: materials.map((m) => ({ id: m.id, title: m.title, kind: m.kind })),
    history: meetings
      .filter((m) => m.status !== "scheduled" || m.summary || m.notes)
      .map((m) => ({
        sessionId: m.weeklyScheduleId ? occurrenceId(m.weeklyScheduleId, m.plannedDate) : m.id,
        date: m.actualDate ?? m.plannedDate,
        startTime: m.startTime,
        endTime: m.endTime,
        status: m.status,
        topic: m.lessonPlanId ? (planTitle.get(m.lessonPlanId) ?? null) : null,
        summary: m.summary,
        notes: m.notes,
        isReplacement: m.replacementForId !== null,
      }))
      .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1)),
  };
}
