import { z } from "zod";
import { isValidAcademicYearLabel } from "@/lib/domain/period";

const checkbox = z
  .union([z.literal("on"), z.literal("")])
  .optional()
  .transform((v) => v === "on");

/** Mulai tahun ajaran baru (F09). Tanggal default: 1 Juli–30 Juni; bisa diubah di Pengaturan. */
export const newAcademicYearSchema = z
  .object({
    label: z
      .string()
      .trim()
      .refine(isValidAcademicYearLabel, { error: "Tulis tahun ajaran seperti 2027/2028 (tahun kedua = tahun pertama + 1)." }),
    copyClasses: checkbox,
    copyPlans: checkbox,
    copySchedules: checkbox,
  })
  .transform((v) => ({ ...v, copyPlans: v.copyClasses && v.copyPlans, copySchedules: v.copyClasses && v.copySchedules }));

/** "2026/2027" → "2027/2028". */
export function nextAcademicYearLabel(label: string | null | undefined, today: string): string {
  if (label && isValidAcademicYearLabel(label)) {
    const first = Number(label.slice(0, 4)) + 1;
    return `${first}/${first + 1}`;
  }
  const year = Number(today.slice(0, 4));
  return `${year}/${year + 1}`;
}
