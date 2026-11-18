import type {
  AcademicYear,
  ClassLessonPlan,
  MeetingRecord,
  MeetingStatus,
  MeetingStatusEvent,
  GradeLevel,
  Profile,
  Semester,
  SemesterNumber,
  TeachingClass,
  TeachingMaterial,
  WeeklySchedule,
  Weekday,
} from "@/lib/domain/types";
import type { TableRow } from "@/lib/supabase/database.types";

/** Postgres `time` dikirim sebagai "07:30:00" → domain memakai "07:30". */
export function toLocalTime(value: string): string {
  return value.slice(0, 5);
}

export function mapProfile(row: TableRow<"profiles">): Profile {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    schoolName: row.school_name,
    timezone: row.timezone,
    onboardedAt: row.onboarded_at,
  };
}

export function mapAcademicYear(row: TableRow<"academic_years">): AcademicYear {
  return {
    id: row.id,
    ownerId: row.owner_id,
    label: row.label,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    activeSemesterId: row.active_semester_id,
  };
}

export function mapSemester(row: TableRow<"semesters">): Semester {
  return {
    id: row.id,
    academicYearId: row.academic_year_id,
    number: row.number as SemesterNumber,
    startDate: row.start_date,
    endDate: row.end_date,
    midtermDate: row.midterm_date,
  };
}

export function mapTeachingClass(row: TableRow<"teaching_classes">): TeachingClass {
  return {
    id: row.id,
    ownerId: row.owner_id,
    academicYearId: row.academic_year_id,
    gradeLevel: row.grade_level as GradeLevel,
    section: row.section,
    displayName: row.display_name,
    archivedAt: row.archived_at,
  };
}

const MATERIAL_KINDS: readonly TeachingMaterial["kind"][] = ["pdf", "doc", "docx", "ppt", "pptx", "video", "link", "note"];

export function mapTeachingMaterial(row: TableRow<"teaching_materials">): TeachingMaterial {
  const kind = MATERIAL_KINDS.find((k) => k === row.kind);
  if (!kind) throw new Error(`Jenis materi tidak dikenal: ${row.kind}`);
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description,
    topic: row.topic,
    gradeLevel: row.grade_level as GradeLevel | null,
    tags: row.tags,
    kind,
    filePath: row.file_path,
    fileName: row.file_name,
    fileSize: row.file_size === null ? null : Number(row.file_size),
    externalUrl: row.external_url,
    createdAt: row.created_at,
    archivedAt: row.archived_at,
  };
}

const MEETING_STATUSES: readonly MeetingStatus[] = ["scheduled", "completed", "postponed", "cancelled"];

function toMeetingStatus(value: string): MeetingStatus {
  const status = MEETING_STATUSES.find((s) => s === value);
  if (!status) throw new Error(`Status pertemuan tidak dikenal: ${value}`);
  return status;
}

export function mapLessonPlan(row: TableRow<"class_lesson_plans">): ClassLessonPlan {
  return {
    id: row.id,
    classId: row.class_id,
    semesterId: row.semester_id,
    materialId: row.material_id,
    title: row.title,
    sortOrder: row.sort_order,
    plannedSessions: row.planned_sessions,
    midtermSegment: row.midterm_segment === "before" || row.midterm_segment === "after" ? row.midterm_segment : null,
  };
}

export function mapMeetingRecord(row: TableRow<"meeting_records">): MeetingRecord {
  return {
    id: row.id,
    classId: row.class_id,
    semesterId: row.semester_id,
    weeklyScheduleId: row.weekly_schedule_id,
    lessonPlanId: row.lesson_plan_id,
    plannedDate: row.planned_date,
    actualDate: row.actual_date,
    startTime: toLocalTime(row.start_time),
    endTime: toLocalTime(row.end_time),
    status: toMeetingStatus(row.status),
    summary: row.summary,
    notes: row.notes,
    replacementForId: row.replacement_for_id,
  };
}

export function mapMeetingStatusEvent(row: TableRow<"meeting_status_events">): MeetingStatusEvent {
  return {
    id: row.id,
    meetingId: row.meeting_id,
    fromStatus: row.from_status === null ? null : toMeetingStatus(row.from_status),
    toStatus: toMeetingStatus(row.to_status),
    changedAt: row.changed_at,
  };
}

export function mapWeeklySchedule(row: TableRow<"weekly_schedules">): WeeklySchedule {
  return {
    id: row.id,
    classId: row.class_id,
    semesterId: row.semester_id,
    weekday: row.weekday as Weekday,
    startTime: toLocalTime(row.start_time),
    endTime: toLocalTime(row.end_time),
    effectiveFrom: row.effective_from,
    effectiveUntil: row.effective_until,
  };
}
