"use server";

import { refresh } from "next/cache";
import type { GradeLevel, Weekday } from "@/lib/domain/types";
import { errorState, getMutationContext } from "@/lib/server/mutation-context";
import { pickValues, withValues, type ActionState } from "@/lib/validation/action-state";
import { classLabel, findScheduleClash, issuesToFieldErrors } from "@/lib/validation/onboarding";
import { createClassSchema, createScheduleSchema, idSchema } from "@/lib/validation/settings";

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
