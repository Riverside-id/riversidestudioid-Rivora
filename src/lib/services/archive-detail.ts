import type { RivoraRepository } from "@/lib/data/repository";
import { calculateClassProgress, completedSessionsByPlan, type ClassProgress } from "@/lib/domain/progress";
import type {
  AcademicYear,
  ISODate,
  LocalTime,
  MaterialKind,
  MeetingStatus,
  MidtermSegment,
  Semester,
  Weekday,
} from "@/lib/domain/types";

export interface ArchiveTopic {
  title: string;
  plannedSessions: number;
  completedSessions: number;
  midtermSegment: MidtermSegment | null;
  materialId: string | null;
  materialTitle: string | null;
  materialKind: MaterialKind | null;
}

export interface ArchiveMeeting {
  id: string;
  date: ISODate;
  startTime: LocalTime | null;
  endTime: LocalTime | null;
  status: MeetingStatus;
  topic: string | null;
  summary: string | null;
  notes: string | null;
}

export interface ArchiveClassView {
  id: string;
  label: string;
  archived: boolean;
  progress: ClassProgress;
  schedules: { weekday: Weekday; startTime: LocalTime; endTime: LocalTime }[];
  topics: ArchiveTopic[];
  meetings: ArchiveMeeting[];
}

export interface ArchiveDetail {
  year: AcademicYear;
  semesters: Semester[];
  semester: Semester | null;
  classOptions: { id: string; label: string; archived: boolean }[];
  classes: ArchiveClassView[];
  query: string;
  totals: { classes: number; topics: number; completed: number; meetings: number };
}

/**
 * Isi satu tahun ajaran arsip (baca-saja): per kelas — jadwal, rencana & progres, riwayat pertemuan.
 * Kelas yang diarsipkan tetap ditampilkan. Filter: semester, kelas, dan teks (topik/ringkasan/catatan).
 */
export async function getArchiveDetail(
  repo: RivoraRepository,
  yearId: string,
  filters: { semesterId?: string; classId?: string; q?: string },
): Promise<ArchiveDetail | null> {
  const year = (await repo.listAcademicYears()).find((y) => y.id === yearId && y.status === "archived");
  if (!year) return null;

  const [semesters, allClasses, materials, archivedMaterials] = await Promise.all([
    repo.listSemesters(year.id),
    repo.listClasses(year.id, { includeArchived: true }),
    repo.listMaterials(),
    repo.listArchivedMaterials(),
  ]);
  const semester =
    semesters.find((s) => s.id === filters.semesterId) ??
    semesters.find((s) => s.id === year.activeSemesterId) ??
    semesters[0] ??
    null;
  const query = (filters.q ?? "").trim();
  const classOptions = allClasses.map((c) => ({ id: c.id, label: c.displayName, archived: c.archivedAt !== null }));
  const empty = { year, semesters, semester, classOptions, query };
  if (!semester) return { ...empty, classes: [], totals: { classes: 0, topics: 0, completed: 0, meetings: 0 } };

  const [schedules, plans, meetings] = await Promise.all([
    repo.listWeeklySchedules(semester.id),
    repo.listLessonPlans(semester.id),
    repo.listMeetingRecords(semester.id),
  ]);
  const material = new Map([...materials, ...archivedMaterials].map((m) => [m.id, m]));
  const needle = query.toLowerCase();
  const matches = (...texts: (string | null)[]) => !needle || texts.some((t) => t?.toLowerCase().includes(needle));

  const classes = allClasses
    .filter((c) => !filters.classId || c.id === filters.classId)
    .map((c) => {
      const classPlans = plans.filter((p) => p.classId === c.id).sort((a, b) => a.sortOrder - b.sortOrder);
      const classMeetings = meetings.filter((m) => m.classId === c.id);
      const done = completedSessionsByPlan(classPlans, classMeetings);
      const title = new Map(classPlans.map((p) => [p.id, p.title]));
      return {
        id: c.id,
        label: c.displayName,
        archived: c.archivedAt !== null,
        progress: calculateClassProgress(classPlans, classMeetings),
        schedules: schedules
          .filter((s) => s.classId === c.id)
          .map((s) => ({ weekday: s.weekday, startTime: s.startTime, endTime: s.endTime }))
          .sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime)),
        topics: classPlans
          .map((p) => {
            const m = p.materialId ? material.get(p.materialId) : undefined;
            return {
              title: p.title,
              plannedSessions: p.plannedSessions,
              completedSessions: done.get(p.id) ?? 0,
              midtermSegment: p.midtermSegment,
              materialId: p.materialId,
              materialTitle: m?.title ?? null,
              materialKind: m?.kind ?? null,
            };
          })
          .filter((t) => matches(t.title, t.materialTitle)),
        meetings: classMeetings
          .filter((m) => m.status !== "scheduled" || m.summary || m.notes)
          .map((m) => ({
            id: m.id,
            date: m.actualDate ?? m.plannedDate,
            startTime: m.startTime,
            endTime: m.endTime,
            status: m.status,
            topic: m.lessonPlanId ? (title.get(m.lessonPlanId) ?? null) : null,
            summary: m.summary,
            notes: m.notes,
          }))
          .filter((m) => matches(m.topic, m.summary, m.notes))
          .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
      };
    })
    .filter((c) => !needle || c.topics.length > 0 || c.meetings.length > 0 || c.label.toLowerCase().includes(needle));

  return {
    ...empty,
    classes,
    totals: {
      classes: allClasses.length,
      topics: plans.length,
      completed: meetings.filter((m) => m.status === "completed").length,
      meetings: meetings.filter((m) => m.status !== "scheduled").length,
    },
  };
}
