"use server";

import { refresh } from "next/cache";
import { errorState, getMutationContext } from "@/lib/server/mutation-context";
import type { ActionState } from "@/lib/validation/action-state";
import { createMaterialSchema, prepareUploadSchema, type CreateMaterialInput } from "@/lib/validation/materials";
import { issuesToFieldErrors } from "@/lib/validation/onboarding";
import { idSchema } from "@/lib/validation/settings";

export type PrepareUploadResult =
  | { ok: true; path: string; token: string; contentType: string }
  | { ok: false; message: string };

/**
 * Langkah 1 unggah materi: server memeriksa jenis & ukuran file, lalu memberi izin unggah
 * sekali pakai ke folder milik guru di Storage. File dikirim langsung dari browser ke Storage
 * (tidak lewat server aplikasi), sehingga tidak terkena batas ukuran request server.
 */
export async function prepareMaterialUploadAction(input: {
  fileName: string;
  fileSize: number;
  mimeType: string;
}): Promise<PrepareUploadResult> {
  const parsed = prepareUploadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "File tidak valid." };

  const ctx = await getMutationContext();
  if (!ctx.ok) return { ok: false, message: ctx.state.status === "error" ? (ctx.state.message ?? "Gagal.") : "Gagal." };
  try {
    const ticket = await ctx.mutations.prepareMaterialUpload(parsed.data);
    return { ok: true, ...ticket };
  } catch (error) {
    const state = errorState(error);
    return { ok: false, message: state.status === "error" ? (state.message ?? "Gagal.") : "Gagal." };
  }
}

/** Langkah 2 unggah materi: simpan judul, topik, tingkat, dan deskripsi untuk file yang sudah diunggah. */
export async function createMaterialAction(input: CreateMaterialInput): Promise<ActionState> {
  const parsed = createMaterialSchema.safeParse(input);
  if (!parsed.success) return { status: "error", fieldErrors: issuesToFieldErrors(parsed.error) };

  const ctx = await getMutationContext();
  if (!ctx.ok) return ctx.state;
  try {
    await ctx.mutations.createMaterial(parsed.data);
  } catch (error) {
    return errorState(error);
  }
  refresh();
  return { status: "success", message: `Materi "${parsed.data.title}" tersimpan.` };
}

export async function archiveMaterialAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = idSchema.safeParse(String(form.get("materialId") ?? ""));
  if (!parsed.success) return { status: "error", message: "Materi tidak valid." };
  const ctx = await getMutationContext();
  if (!ctx.ok) return ctx.state;
  try {
    await ctx.mutations.archiveMaterial(parsed.data);
  } catch (error) {
    return errorState(error);
  }
  refresh();
  return { status: "success", message: "Materi dipindahkan ke arsip. File tetap tersimpan." };
}
