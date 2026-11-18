"use server";

import { refresh } from "next/cache";
import { errorState, getMutationContext } from "@/lib/server/mutation-context";
import { pickValues, withValues, type ActionState } from "@/lib/validation/action-state";
import { issuesToFieldErrors } from "@/lib/validation/onboarding";
import { idSchema } from "@/lib/validation/settings";
import { createLessonPlanSchema, moveLessonPlanSchema, updateLessonPlanSchema } from "@/lib/validation/teaching";

const text = (form: FormData, key: string) => String(form.get(key) ?? "");
const PLAN_FIELDS = ["title", "plannedSessions", "midtermSegment", "materialId"];

/** Rencana materi selalu untuk tahun ajaran aktif & semester terpilih di server (bukan dari browser). */
export async function createLessonPlanAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return withValues(await createLessonPlan(form), pickValues(form, PLAN_FIELDS));
}

async function createLessonPlan(form: FormData): Promise<ActionState> {
  const parsed = createLessonPlanSchema.safeParse({
    classId: text(form, "classId"),
    title: text(form, "title"),
    plannedSessions: text(form, "plannedSessions"),
    midtermSegment: text(form, "midtermSegment"),
    materialId: text(form, "materialId"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: issuesToFieldErrors(parsed.error) };

  const ctx = await getMutationContext();
  if (!ctx.ok) return ctx.state;
  const { activeYear, selectedSemester } = ctx.app;
  if (!activeYear || !selectedSemester) return { status: "error", message: "Belum ada semester aktif." };

  const classes = await ctx.repo.listClasses(activeYear.id);
  if (!classes.some((c) => c.id === parsed.data.classId)) return { status: "error", message: "Kelas tidak ditemukan." };

  try {
    await ctx.mutations.createLessonPlan({
      academicYearId: activeYear.id,
      semesterId: selectedSemester.id,
      ...parsed.data,
    });
  } catch (error) {
    return errorState(error);
  }
  refresh();
  return { status: "success", message: `Topik "${parsed.data.title}" ditambahkan ke rencana.` };
}

export async function updateLessonPlanAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return withValues(await updateLessonPlan(form), pickValues(form, PLAN_FIELDS));
}

async function updateLessonPlan(form: FormData): Promise<ActionState> {
  const parsed = updateLessonPlanSchema.safeParse({
    planId: text(form, "planId"),
    title: text(form, "title"),
    plannedSessions: text(form, "plannedSessions"),
    midtermSegment: text(form, "midtermSegment"),
    materialId: text(form, "materialId"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: issuesToFieldErrors(parsed.error) };

  const ctx = await getMutationContext();
  if (!ctx.ok) return ctx.state;
  try {
    await ctx.mutations.updateLessonPlan(parsed.data);
  } catch (error) {
    return errorState(error);
  }
  refresh();
  return { status: "success", message: "Rencana diperbarui. Catatan pertemuan yang sudah ada tidak berubah." };
}

export async function moveLessonPlanAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = moveLessonPlanSchema.safeParse({ planId: text(form, "planId"), direction: text(form, "direction") });
  if (!parsed.success) return { status: "error", message: "Rencana tidak valid." };
  const ctx = await getMutationContext();
  if (!ctx.ok) return ctx.state;
  try {
    await ctx.mutations.moveLessonPlan(parsed.data);
  } catch (error) {
    return errorState(error);
  }
  refresh();
  return { status: "success", message: "Urutan diperbarui." };
}

export async function deleteLessonPlanAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = idSchema.safeParse(text(form, "planId"));
  if (!parsed.success) return { status: "error", message: "Rencana tidak valid." };
  const ctx = await getMutationContext();
  if (!ctx.ok) return ctx.state;
  try {
    await ctx.mutations.deleteLessonPlan(parsed.data);
  } catch (error) {
    return errorState(error);
  }
  refresh();
  return { status: "success", message: "Topik dihapus dari rencana." };
}
