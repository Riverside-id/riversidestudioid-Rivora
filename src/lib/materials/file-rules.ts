import type { MaterialFileKind } from "@/lib/domain/types";

/**
 * Aturan file materi — dipakai di browser (validasi awal) dan server (validasi ulang).
 * Database dan bucket Storage menegakkan aturan yang sama (migration 20261118200000).
 */

export const MATERIAL_BUCKET = "materi";

/** PRD §10: batas awal 10 MB per file. Sama dengan file_size_limit bucket. */
export const MAX_MATERIAL_BYTES = 10 * 1024 * 1024;

export const MATERIAL_FILE_TYPES: Record<MaterialFileKind, { mime: string; label: string }> = {
  pdf: { mime: "application/pdf", label: "PDF" },
  doc: { mime: "application/msword", label: "Word (.doc)" },
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", label: "Word (.docx)" },
  ppt: { mime: "application/vnd.ms-powerpoint", label: "PowerPoint (.ppt)" },
  pptx: { mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", label: "PowerPoint (.pptx)" },
};

export const MATERIAL_FILE_KINDS = Object.keys(MATERIAL_FILE_TYPES) as MaterialFileKind[];

/** Nilai atribut `accept` untuk input file. */
export const MATERIAL_ACCEPT = [
  ...MATERIAL_FILE_KINDS.map((k) => `.${k}`),
  ...MATERIAL_FILE_KINDS.map((k) => MATERIAL_FILE_TYPES[k].mime),
].join(",");

/** Sebagian browser/OS tidak mengenali tipe Office dan mengirim tipe kosong atau generik. */
const GENERIC_MIME = new Set(["", "application/octet-stream", "application/zip", "application/x-zip-compressed"]);

export const FILE_TYPE_ERROR = "Jenis file belum didukung. Unggah PDF, Word (DOC/DOCX), atau PowerPoint (PPT/PPTX).";
export const FILE_SIZE_ERROR = "Ukuran file melebihi 10 MB. Kecilkan atau pisahkan file, lalu coba lagi.";
export const FILE_EMPTY_ERROR = "File kosong. Pilih file lain.";

export function isMaterialFileKind(value: string): value is MaterialFileKind {
  return (MATERIAL_FILE_KINDS as string[]).includes(value);
}

export function fileExtension(fileName: string): string {
  const match = /\.([A-Za-z0-9]+)$/.exec(fileName.trim());
  return match ? match[1].toLowerCase() : "";
}

export type FileCheck =
  | { ok: true; kind: MaterialFileKind; contentType: string }
  | { ok: false; message: string };

/** Jenis ditentukan dari ekstensi; tipe MIME dari browser hanya boleh cocok atau generik. */
export function checkMaterialFile(file: { name: string; size: number; type: string }): FileCheck {
  const ext = fileExtension(file.name);
  if (!isMaterialFileKind(ext)) return { ok: false, message: FILE_TYPE_ERROR };
  const expected = MATERIAL_FILE_TYPES[ext].mime;
  const type = (file.type ?? "").toLowerCase();
  if (type !== expected && !GENERIC_MIME.has(type)) return { ok: false, message: FILE_TYPE_ERROR };
  if (file.size <= 0) return { ok: false, message: FILE_EMPTY_ERROR };
  if (file.size > MAX_MATERIAL_BYTES) return { ok: false, message: FILE_SIZE_ERROR };
  return { ok: true, kind: ext, contentType: expected };
}

/** Path objek di bucket: "<owner_id>/<uuid>.<ekstensi>" (nama asli disimpan terpisah di database). */
export function materialStoragePath(ownerId: string, fileId: string, kind: MaterialFileKind): string {
  return `${ownerId}/${fileId}.${kind}`;
}

const STORAGE_PATH = /^([0-9a-f-]{36})\/([0-9a-f-]{36})\.(pdf|doc|docx|ppt|pptx)$/;

/** Path valid milik guru ini → jenis filenya; selain itu null. */
export function parseOwnedStoragePath(path: string, ownerId: string): MaterialFileKind | null {
  const match = STORAGE_PATH.exec(path);
  if (!match || match[1] !== ownerId) return null;
  return match[3] as MaterialFileKind;
}

/** Judul awal dari nama file: "Pecahan_senilai-kelas4.pdf" → "Pecahan senilai kelas4". */
export function titleFromFileName(fileName: string): string {
  return fileName
    .replace(/\.[A-Za-z0-9]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

/** "2,4 MB", "850 KB" (format Indonesia). */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toLocaleString("id-ID", { maximumFractionDigits: 1 })} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString("id-ID")} KB`;
}

/** PDF bisa dibuka langsung di browser; Word/PowerPoint diunduh. */
export function opensInBrowser(kind: MaterialFileKind): boolean {
  return kind === "pdf";
}
