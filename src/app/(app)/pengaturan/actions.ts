"use server";

import { refresh } from "next/cache";
import { errorState, getMutationContext } from "@/lib/server/mutation-context";
import { pickValues, withValues, type ActionState } from "@/lib/validation/action-state";
import { issuesToFieldErrors } from "@/lib/validation/onboarding";
import { profileSettingsSchema, semesterDatesSchema } from "@/lib/validation/settings";

const text = (form: FormData, key: string) => String(form.get(key) ?? "");

export async function updateProfileAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return withValues(await updateProfile(form), pickValues(form, ["displayName", "schoolName", "timezone"]));
}

async function updateProfile(form: FormData): Promise<ActionState> {
  const parsed = profileSettingsSchema.safeParse({
    displayName: text(form, "displayName"),
    schoolName: text(form, "schoolName"),
    timezone: text(form, "timezone"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: issuesToFieldErrors(parsed.error) };

  const ctx = await getMutationContext();
  if (!ctx.ok) return ctx.state;
  try {
    await ctx.mutations.updateProfile(parsed.data);
  } catch (error) {
    return errorState(error);
  }
  refresh();
  return { status: "success", message: "Profil disimpan." };
}

export async function updateSemesterAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return withValues(await updateSemester(form), pickValues(form, ["startDate", "endDate", "midtermDate"]));
}

async function updateSemester(form: FormData): Promise<ActionState> {
  const parsed = semesterDatesSchema.safeParse({
    semesterId: text(form, "semesterId"),
    startDate: text(form, "startDate"),
    endDate: text(form, "endDate"),
    midtermDate: text(form, "midtermDate"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: issuesToFieldErrors(parsed.error) };

  const ctx = await getMutationContext();
  if (!ctx.ok) return ctx.state;
  // Hanya semester milik tahun ajaran aktif yang bisa diubah dari layar ini.
  if (!ctx.app.semesters.some((s) => s.id === parsed.data.semesterId)) {
    return { status: "error", message: "Semester tidak ditemukan di tahun ajaran aktif." };
  }
  try {
    await ctx.mutations.updateSemester(parsed.data);
  } catch (error) {
    return errorState(error);
  }
  refresh();
  return { status: "success", message: "Tanggal semester disimpan." };
}
