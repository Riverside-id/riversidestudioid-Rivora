import type {
  AcademicYear,
  GradeLevel,
  Profile,
  Semester,
  SemesterNumber,
  TeachingClass,
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
