"use server";

import { refresh } from "next/cache";
import type { GradeLevel, Weekday } from "@/lib/domain/types";
import { errorState, getMutationContext } from "@/lib/server/mutation-context";
import { pickValues, withValues, type ActionState } from "@/lib/validation/action-state";
import { classLabel, findScheduleClash, issuesToFieldErrors } from "@/lib/validation/onboarding";
import { createClassSchema, createScheduleSchema, idSchema } from "@/lib/validation/settings";
import { saveMeetingSchema, updateClassSchema } from "@/lib/validation/teaching";
import { formatLongDate, formatTimeRange } from "@/lib/date";
import { isDateInSemester } from "@/lib/domain/period";
import { parseOccurrenceId, timeRangesOverlap } from "@/lib/domain/schedule";
import type { MeetingStatus } from "@/lib/domain/types";
import { findSession } from "@/lib/services/schedule";
import { loadSemesterData } from "@/lib/services/semester-data";
import { buildSessionsForDate } from "@/lib/services/sessions";

const text = (form: FormData, key: string) => String(form.get(key) ?? "");

export async function createClassAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return withValues(await createClass(form), pickValues(form, ["gradeLevel", "section"]));
}

async function createClass(form: FormData): Promise<ActionState> {
  const parsed = createClassSchema.safeParse({ gradeLevel: text(form, "gradeLevel"), section: text(form, "section") });
  if (!parsed.success) return { status: "error", fieldErrors: issuesToFieldErrors(parsed.error) };

  const ctx = await getMutationContext();
  if (!ctx.ok) return ctx.state;
  if (!ctx.app.activeYear) return { status: "error", message: "Belum ada tahun ajaran aktif." };

  const gradeLevel = parsed.data.gradeLevel as GradeLevel;
  const label = classLabel({ gradeLevel, section: parsed.data.section });
  try {
    await ctx.mutations.createClass({ academicYearId: ctx.app.activeYear.id, gradeLevel, section: parsed.data.section });
  } catch (error) {
    return errorState(error);
  }
  refresh();
  return { status: "success", message: `Kelas ${label} ditambahkan.` };
}

export async function archiveClassAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = idSchema.safeParse(text(form, "classId"));
  if (!parsed.success) return { status: "error", message: "Kelas tidak valid." };
  const ctx = await getMutationContext();
  if (!ctx.ok) return ctx.state;
  try {
    await ctx.mutations.archiveClass(parsed.data);
  } catch (error) {
    return errorState(error);
  }
  refresh();
  return { status: "success", message: "Kelas diarsipkan. Riwayatnya tetap tersimpan." };
}

export async function createScheduleAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return withValues(await createSchedule(form), pickValues(form, ["classId", "weekday", "startTime", "endTime"]));
}

async function createSchedule(form: FormData): Promise<ActionState> {
  const parsed = createScheduleSchema.safeParse({
    classId: text(form, "classId"),
    weekday: text(form, "weekday"),
    startTime: text(form, "startTime"),
    endTime: text(form, "endTime"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: issuesToFieldErrors(parsed.error) };

  const ctx = await getMutationContext();
  if (!ctx.ok) return ctx.state;
  const { activeYear, selectedSemester } = ctx.app;
  if (!activeYear || !selectedSemester) return { status: "error", message: "Belum ada semester untuk dijadwalkan." };

  const [classes, schedules] = await Promise.all([
    ctx.repo.listClasses(activeYear.id),
    ctx.repo.listWeeklySchedules(selectedSemester.id),
  ]);
  const cls = classes.find((c) => c.id === parsed.data.classId);
  if (!cls) return { status: "error", fieldErrors: { classId: "Kelas tidak ditemukan di tahun ajaran ini." } };

  // Pesan bentrok yang menyebut kelasnya; database tetap menolak bila ada yang lolos.
  const labelById = new Map(classes.map((c) => [c.id, c.displayName]));
  const clash = findScheduleClash(
    schedules.map((s) => ({ classLabel: labelById.get(s.classId) ?? "lain", weekday: s.weekday, startTime: s.startTime, endTime: s.endTime })),
    { classLabel: cls.displayName, weekday: parsed.data.weekday as Weekday, startTime: parsed.data.startTime, endTime: parsed.data.endTime },
  );
  if (clash) return { status: "error", fieldErrors: { startTime: clash } };

  try {
    await ctx.mutations.createWeeklySchedule({
      academicYearId: activeYear.id,
      semesterId: selectedSemester.id,
      classId: cls.id,
      weekday: parsed.data.weekday as Weekday,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      effectiveFrom: selectedSemester.startDate,
      effectiveUntil: selectedSemester.endDate,
    });
  } catch (error) {
    return errorState(error);
  }
  refresh();
  return { status: "success", message: `Jadwal Kelas ${cls.displayName} disimpan.` };
}

export async function deleteScheduleAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = idSchema.safeParse(text(form, "scheduleId"));
  if (!parsed.success) return { status: "error", message: "Jadwal tidak valid." };
  const ctx = await getMutationContext();
  if (!ctx.ok) return ctx.state;
  try {
    await ctx.mutations.deleteWeeklySchedule(parsed.data);
  } catch (error) {
    return errorState(error);
  }
  refresh();
  return { status: "success", message: "Jadwal dihapus." };
}

/* ------------------------------------------------------------------ Pelaksanaan pertemuan (F07) */

const STATUS_SAVED: Record<MeetingStatus, string> = {
  completed: "Pertemuan ditandai Selesai. Progres kelas diperbarui.",
  postponed: "Pertemuan ditandai Ditunda. Materi belum dihitung selesai.",
  cancelled: "Pertemuan ditandai Batal. Riwayat tetap tersimpan.",
  scheduled: "Status dikembalikan ke Terjadwal.",
};

export async function saveMeetingAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const keys = ["status", "lessonPlanId", "actualDate", "summary", "notes", "replacementDate", "replacementStart", "replacementEnd"];
  return withValues(await saveMeeting(form), pickValues(form, keys));
}

async function saveMeeting(form: FormData): Promise<ActionState> {
  const parsed = saveMeetingSchema.safeParse({
    sessionId: text(form, "sessionId"),
    status: text(form, "status"),
    lessonPlanId: text(form, "lessonPlanId"),
    actualDate: text(form, "actualDate"),
    summary: text(form, "summary"),
    notes: text(form, "notes"),
    replacementDate: text(form, "replacementDate"),
    replacementStart: text(form, "replacementStart"),
    replacementEnd: text(form, "replacementEnd"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: issuesToFieldErrors(parsed.error) };
  const input = parsed.data;

  const ctx = await getMutationContext();
  if (!ctx.ok) return ctx.state;
  const { activeYear, selectedSemester } = ctx.app;
  if (!activeYear || !selectedSemester) return { status: "error", message: "Belum ada semester aktif." };

  const data = await loadSemesterData(ctx.repo, activeYear, selectedSemester);
  const session = findSession(data, input.sessionId);
  if (!session) return { status: "error", message: "Pertemuan tidak ditemukan di semester ini." };

  if (input.lessonPlanId && !data.plans.some((p) => p.id === input.lessonPlanId && p.classId === session.classId)) {
    return { status: "error", fieldErrors: { lessonPlanId: "Pilih topik dari rencana kelas ini." } };
  }

  // Jadwal pengganti: di dalam semester dan tidak bentrok dengan sesi lain pada tanggal itu.
  if (input.replacementDate) {
    if (!isDateInSemester(selectedSemester, input.replacementDate)) {
      return { status: "error", fieldErrors: { replacementDate: "Tanggal pengganti harus berada di dalam semester ini." } };
    }
    const clash = buildSessionsForDate(input.replacementDate, data).find(
      (s) =>
        s.id !== session.id &&
        s.status !== "postponed" &&
        s.status !== "cancelled" &&
        timeRangesOverlap(s, { startTime: input.replacementStart, endTime: input.replacementEnd }),
    );
    if (clash) {
      return {
        status: "error",
        fieldErrors: { replacementStart: `Bentrok dengan Kelas ${clash.classLabel} (${formatTimeRange(clash.startTime, clash.endTime)}).` },
      };
    }
  }

  const occurrence = parseOccurrenceId(session.id);
  try {
    const recordId = await ctx.mutations.saveMeeting({
      target: occurrence ? { kind: "occurrence", ...occurrence } : { kind: "record", recordId: session.id },
      status: input.status,
      lessonPlanId: input.lessonPlanId,
      actualDate: input.status === "completed" ? (input.actualDate ?? session.date) : null,
      summary: input.summary,
      notes: input.notes,
    });
    if (input.replacementDate) {
      await ctx.mutations.createReplacement({
        postponedRecordId: recordId,
        date: input.replacementDate,
        startTime: input.replacementStart,
        endTime: input.replacementEnd,
      });
    }
  } catch (error) {
    return errorState(error);
  }
  refresh();
  return {
    status: "success",
    message: input.replacementDate
      ? `Pertemuan ditunda dan jadwal pengganti dibuat untuk ${formatLongDate(input.replacementDate)}.`
      : STATUS_SAVED[input.status],
  };
}

/* ------------------------------------------------------------------ Edit kelas */

export async function updateClassAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return withValues(await updateClass(form), pickValues(form, ["gradeLevel", "section"]));
}

async function updateClass(form: FormData): Promise<ActionState> {
  const parsed = updateClassSchema.safeParse({
    classId: text(form, "classId"),
    gradeLevel: text(form, "gradeLevel"),
    section: text(form, "section"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: issuesToFieldErrors(parsed.error) };

  const ctx = await getMutationContext();
  if (!ctx.ok) return ctx.state;
  if (!ctx.app.activeYear) return { status: "error", message: "Belum ada tahun ajaran aktif." };

  const classes = await ctx.repo.listClasses(ctx.app.activeYear.id);
  if (!classes.some((c) => c.id === parsed.data.classId)) return { status: "error", message: "Kelas tidak ditemukan." };
  const gradeLevel = parsed.data.gradeLevel as GradeLevel;
  const label = classLabel({ gradeLevel, section: parsed.data.section });
  if (classes.some((c) => c.id !== parsed.data.classId && c.displayName === label)) {
    return { status: "error", fieldErrors: { section: `Kelas ${label} sudah ada di tahun ajaran ini.` } };
  }
  try {
    await ctx.mutations.updateClass({ classId: parsed.data.classId, gradeLevel, section: parsed.data.section });
  } catch (error) {
    return errorState(error);
  }
  refresh();
  return { status: "success", message: `Kelas diubah menjadi ${label}. Riwayatnya tetap tersimpan.` };
}
