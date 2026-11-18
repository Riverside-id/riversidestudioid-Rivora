import { z } from "zod";
/** Langkah 1: data file dari browser (dicek ulang di server sebelum izin unggah diberikan). */
export const prepareUploadSchema = z.object({
  fileName: z.string().trim().min(1, { error: "Pilih file materi." }).max(200, { error: "Nama file terlalu panjang." }),
  // Tanpa batas atas dari aplikasi; Storage menolak bila melewati batas global project.
  fileSize: z.number().int().min(1, { error: "File kosong. Pilih file lain." }),
  mimeType: z.string().max(200),
});

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, { error: message })
    .transform((v) => (v === "" ? null : v));

/** Langkah 2: data materi setelah file berhasil diunggah. */
export const createMaterialSchema = z.object({
  path: z.string().min(1).max(200),
  fileName: z.string().trim().min(1).max(200),
  title: z
    .string()
    .trim()
    .min(2, { error: "Judul materi minimal 2 karakter." })
    .max(120, { error: "Judul materi maksimal 120 karakter." }),
  description: optionalText(500, "Deskripsi maksimal 500 karakter."),
  topic: optionalText(80, "Topik maksimal 80 karakter."),
  gradeLevel: z
    .enum(["", "1", "2", "3", "4", "5", "6"], { error: "Pilih tingkat kelas 1–6." })
    .transform((v) => (v === "" ? null : (Number(v) as 1 | 2 | 3 | 4 | 5 | 6))),
});

export type CreateMaterialInput = z.input<typeof createMaterialSchema>;
