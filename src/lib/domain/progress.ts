import type { ClassLessonPlan, MeetingRecord } from "./types";

/**
 * Progres pelaksanaan materi (F08) — BUKAN nilai atau kemampuan siswa.
 * Rumus: pertemuan selesai / total pertemuan direncanakan × 100%.
 */
export type ClassProgress =
  | { kind: "no-plan" }
  | { kind: "planned"; completed: number; planned: number; percent: number };

/**
 * Hitung pertemuan selesai per rencana:
 * - hanya status `completed` dari tindakan guru (bukan karena tanggal lewat),
 * - sesi pengganti dan sesi yang digantikan dihitung satu kali,
 * - dibatasi `plannedSessions` agar tidak pernah > 100%.
 */
export function completedSessionsByPlan(
  plans: ClassLessonPlan[],
  meetings: MeetingRecord[],
): Map<string, number> {
  const planIds = new Set(plans.map((p) => p.id));
  const slotsByPlan = new Map<string, Set<string>>();

  for (const meeting of meetings) {
    if (meeting.status !== "completed" || !meeting.lessonPlanId) continue;
    if (!planIds.has(meeting.lessonPlanId)) continue;
    const slot = meeting.replacementForId ?? meeting.id;
    const slots = slotsByPlan.get(meeting.lessonPlanId) ?? new Set<string>();
    slots.add(slot);
    slotsByPlan.set(meeting.lessonPlanId, slots);
  }

  const result = new Map<string, number>();
  for (const plan of plans) {
    const unique = slotsByPlan.get(plan.id)?.size ?? 0;
    result.set(plan.id, Math.min(unique, Math.max(plan.plannedSessions, 0)));
  }
  return result;
}

export function calculateClassProgress(
  plans: ClassLessonPlan[],
  meetings: MeetingRecord[],
): ClassProgress {
  const planned = plans.reduce((sum, p) => sum + Math.max(p.plannedSessions, 0), 0);
  if (planned === 0) return { kind: "no-plan" };

  const byPlan = completedSessionsByPlan(plans, meetings);
  let completed = 0;
  for (const count of byPlan.values()) completed += count;

  const percent = Math.min(100, Math.round((completed / planned) * 100));
  return { kind: "planned", completed, planned, percent };
}

export interface NextLessonSuggestion {
  plan: ClassLessonPlan;
  /** Pertemuan ke-berapa untuk topik ini (mulai 1). */
  sessionNumber: number;
}

/** Saran materi berikutnya dari sisa rencana sesuai urutan (F06) — guru tetap bisa override. */
export function suggestNextLesson(
  plans: ClassLessonPlan[],
  meetings: MeetingRecord[],
): NextLessonSuggestion | null {
  const byPlan = completedSessionsByPlan(plans, meetings);
  const ordered = [...plans].sort((a, b) => a.sortOrder - b.sortOrder);
  for (const plan of ordered) {
    const done = byPlan.get(plan.id) ?? 0;
    if (done < plan.plannedSessions) return { plan, sessionNumber: done + 1 };
  }
  return null;
}
