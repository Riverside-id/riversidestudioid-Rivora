"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { errorState, getMutationContext } from "@/lib/server/mutation-context";
import { newAcademicYearSchema } from "@/lib/validation/academic-year";
import { pickValues, withValues, type ActionState } from "@/lib/validation/action-state";
import { defaultPeriodDates } from "@/lib/validation/onboarding-submit";
import { issuesToFieldErrors } from "@/lib/validation/onboarding";
import { idSchema } from "@/lib/validation/settings";
import { PERIOD_COOKIE } from "@/lib/server/request-context";
import { cookies } from "next/headers";

/** Mulai tahun ajaran baru: tahun aktif diarsipkan (tidak dihapus), rencana bisa disalin tanpa progres. */
export async function startNewAcademicYearAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const values = pickValues(form, ["label", "copyClasses", "copyPlans", "copySchedules"]);
  const parsed = newAcademicYearSchema.safeParse({
    label: String(form.get("label") ?? ""),
    copyClasses: form.get("copyClasses") === "on" ? "on" : "",
    copyPlans: form.get("copyPlans") === "on" ? "on" : "",
    copySchedules: form.get("copySchedules") === "on" ? "on" : "",
  });
  if (!parsed.success) return withValues({ status: "error", fieldErrors: issuesToFieldErrors(parsed.error) }, values);

  const ctx = await getMutationContext();
  if (!ctx.ok) return withValues(ctx.state, values);
  if (ctx.app.activeYear?.label === parsed.data.label) {
    return withValues({ status: "error", fieldErrors: { label: "Label ini sama dengan tahun ajaran yang sedang aktif." } }, values);
  }

  const dates = defaultPeriodDates(parsed.data.label);
  try {
    await ctx.mutations.startNewAcademicYear({
      label: parsed.data.label,
      start_date: dates.year.startDate,
      end_date: dates.year.endDate,
      semesters: dates.semesters.map((s) => ({
        number: s.number as 1 | 2,
        start_date: s.startDate,
        end_date: s.endDate,
        midterm_date: s.midtermDate,
      })),
      active_semester_number: 1,
      copy_classes: parsed.data.copyClasses,
      copy_plans: parsed.data.copyPlans,
      copy_schedules: parsed.data.copySchedules,
    });
  } catch (error) {
    return withValues(errorState(error), values);
  }
  // Pilihan semester lama tidak berlaku lagi.
  (await cookies()).delete(PERIOD_COOKIE);
  redirect("/dashboard");
}

/** Pulihkan tahun arsip menjadi aktif; tahun yang sedang aktif diarsipkan (dengan konfirmasi di UI). */
export async function activateArchivedYearAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = idSchema.safeParse(String(form.get("yearId") ?? ""));
  if (!parsed.success) return { status: "error", message: "Tahun ajaran tidak valid." };
  const ctx = await getMutationContext();
  if (!ctx.ok) return ctx.state;
  try {
    await ctx.mutations.activateArchivedYear(parsed.data);
  } catch (error) {
    return errorState(error);
  }
  (await cookies()).delete(PERIOD_COOKIE);
  refresh();
  return { status: "success", message: "Tahun ajaran dipulihkan dan kini aktif. Tahun sebelumnya tersimpan di Arsip." };
}
