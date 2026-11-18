"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { getRepository } from "@/lib/data";
import { PERIOD_COOKIE } from "@/lib/server/request-context";
import { resolveAppContext } from "@/lib/services/app-context";

const semesterIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[A-Za-z0-9_-]+$/);

export type SelectSemesterResult = { ok: true } | { ok: false; message: string };

/** Mengganti semester yang DILIHAT (bukan mengubah semester aktif guru). */
export async function selectSemester(semesterId: string): Promise<SelectSemesterResult> {
  const parsed = semesterIdSchema.safeParse(semesterId);
  if (!parsed.success) return { ok: false, message: "Pilihan periode tidak valid." };

  // Validasi di server: semester harus milik tahun ajaran aktif guru ini.
  const ctx = await resolveAppContext(getRepository(), { requestedSemesterId: parsed.data });
  if (ctx.selectedSemester?.id !== parsed.data) {
    return { ok: false, message: "Periode tidak ditemukan." };
  }

  (await cookies()).set(PERIOD_COOKIE, parsed.data, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 180,
  });
  refresh();
  return { ok: true };
}
