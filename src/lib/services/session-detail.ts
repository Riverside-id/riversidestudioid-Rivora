import type { RivoraRepository } from "@/lib/data/repository";
import { completedSessionsByPlan } from "@/lib/domain/progress";
import { parseOccurrenceId } from "@/lib/domain/schedule";
import type {
  ISODate,
  LocalTime,
  MaterialKind,
  MeetingRecord,
  MeetingStatus,
  MeetingStatusEvent,
  MidtermSegment,
} from "@/lib/domain/types";
import type { AppContext } from "./app-context";
import { findSession } from "./schedule";
import { loadSemesterData } from "./semester-data";
import type { TeachingSession } from "./sessions";

export interface PlanOption {
  id: string;
  title: string;
  plannedSessions: number;
  completedSessions: number;
  midtermSegment: MidtermSegment | null;
}

export interface SessionMaterial {
  id: string;
  title: string;
  kind: MaterialKind;
  hasFile: boolean;
}

export interface LinkedSession {
  id: string;
  date: ISODate;
  startTime: LocalTime;
  endTime: LocalTime;
  status: MeetingStatus;
}

export interface SessionPageData {
  session: TeachingSession;
  record: MeetingRecord | null;
  /** Topik rencana kelas ini (urut) untuk dipilih sebagai materi pertemuan. */
  plans: PlanOption[];
  material: SessionMaterial | null;
  /** Pertemuan ini ditunda dan sudah punya pengganti. */
  replacement: LinkedSession | null;
  /** Pertemuan ini adalah pengganti untuk pertemuan lain. */
  replacementFor: LinkedSession | null;
  events: MeetingStatusEvent[];
}

function linked(record: MeetingRecord | undefined): LinkedSession | null {
  if (!record || !record.startTime || !record.endTime) return null;
  return { id: record.id, date: record.plannedDate, startTime: record.startTime, endTime: record.endTime, status: record.status };
}

/** Semua data untuk halaman detail sesi (`/jadwal/[id]`) pada semester terpilih. */
export async function getSessionPageData(
  repo: RivoraRepository,
  ctx: AppContext,
  sessionId: string,
): Promise<SessionPageData | null> {
  if (!ctx.activeYear || !ctx.selectedSemester) return null;
  const [data, materials] = await Promise.all([
    loadSemesterData(repo, ctx.activeYear, ctx.selectedSemester),
    repo.listMaterials(),
  ]);
  const session = findSession(data, sessionId);
  if (!session) return null;

  const occurrence = parseOccurrenceId(session.id);
  const record =
    (occurrence
      ? data.meetings.find((m) => m.weeklyScheduleId === occurrence.scheduleId && m.plannedDate === occurrence.date)
      : data.meetings.find((m) => m.id === session.id)) ?? null;

  const classPlans = data.plans.filter((p) => p.classId === session.classId).sort((a, b) => a.sortOrder - b.sortOrder);
  const done = completedSessionsByPlan(classPlans, data.meetings.filter((m) => m.classId === session.classId));

  const materialId = session.lesson?.materialId ?? null;
  const found = materialId ? materials.find((m) => m.id === materialId) : undefined;

  return {
    session,
    record,
    plans: classPlans.map((p) => ({
      id: p.id,
      title: p.title,
      plannedSessions: p.plannedSessions,
      completedSessions: done.get(p.id) ?? 0,
      midtermSegment: p.midtermSegment,
    })),
    material: found ? { id: found.id, title: found.title, kind: found.kind, hasFile: Boolean(found.filePath) } : null,
    replacement: record ? linked(data.meetings.find((m) => m.replacementForId === record.id)) : null,
    replacementFor: record?.replacementForId ? linked(data.meetings.find((m) => m.id === record.replacementForId)) : null,
    events: record ? await repo.listMeetingStatusEvents([record.id]) : [],
  };
}
