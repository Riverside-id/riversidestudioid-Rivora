import { describe, expect, it } from "vitest";
import { storageErrorMessage } from "@/lib/data/errors";
import {
  checkMaterialFile,
  FILE_TOO_LARGE_ERROR,
  FILE_TYPE_ERROR,
  formatFileSize,
  MATERIAL_ACCEPT,
  materialStoragePath,
  opensInBrowser,
  parseOwnedStoragePath,
  titleFromFileName,
} from "@/lib/materials/file-rules";
import { createMaterialSchema, prepareUploadSchema } from "@/lib/validation/materials";

const OWNER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const FILE_ID = "33333333-3333-4333-8333-333333333333";

describe("aturan file materi", () => {
  it("menerima PDF, Word, dan PowerPoint dan menentukan tipe dari ekstensi", () => {
    expect(checkMaterialFile({ name: "Pecahan.pdf", size: 1000, type: "application/pdf" })).toEqual({
      ok: true,
      kind: "pdf",
      contentType: "application/pdf",
    });
    expect(checkMaterialFile({ name: "LKS.DOC", size: 1000, type: "application/msword" })).toMatchObject({ ok: true, kind: "doc" });
    expect(
      checkMaterialFile({
        name: "Modul ajar.docx",
        size: 1000,
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
    ).toMatchObject({ ok: true, kind: "docx" });
    expect(checkMaterialFile({ name: "Slide.pptx", size: 1000, type: "" })).toMatchObject({
      ok: true,
      kind: "pptx",
      contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });
    expect(checkMaterialFile({ name: "lama.ppt", size: 1000, type: "application/octet-stream" })).toMatchObject({ ok: true, kind: "ppt" });
  });

  it("menolak jenis lain, tipe yang tidak cocok, dan file kosong; ukuran tidak dibatasi aplikasi", () => {
    expect(checkMaterialFile({ name: "foto.jpg", size: 1000, type: "image/jpeg" })).toEqual({ ok: false, message: FILE_TYPE_ERROR });
    expect(checkMaterialFile({ name: "virus.pdf", size: 1000, type: "application/x-msdownload" })).toEqual({
      ok: false,
      message: FILE_TYPE_ERROR,
    });
    expect(checkMaterialFile({ name: "tanpa-ekstensi", size: 1000, type: "" })).toEqual({ ok: false, message: FILE_TYPE_ERROR });
    expect(checkMaterialFile({ name: "kosong.pdf", size: 0, type: "application/pdf" }).ok).toBe(false);
    expect(checkMaterialFile({ name: "besar.pdf", size: 250 * 1024 * 1024, type: "application/pdf" }).ok).toBe(true);
    expect(checkMaterialFile({ name: "modul.docx", size: 40 * 1024 * 1024, type: "" }).ok).toBe(true);
  });

  it("path Storage selalu di folder pemilik dan tidak bisa dipakai guru lain", () => {
    const path = materialStoragePath(OWNER, FILE_ID, "docx");
    expect(path).toBe(`${OWNER}/${FILE_ID}.docx`);
    expect(parseOwnedStoragePath(path, OWNER)).toBe("docx");
    expect(parseOwnedStoragePath(path, OTHER)).toBeNull();
    expect(parseOwnedStoragePath(`${OWNER}/../${FILE_ID}.pdf`, OWNER)).toBeNull();
    expect(parseOwnedStoragePath(`${OWNER}/${FILE_ID}.exe`, OWNER)).toBeNull();
  });

  it("judul awal, ukuran, accept, dan cara membuka", () => {
    expect(titleFromFileName("Pecahan_senilai-kelas4.pdf")).toBe("Pecahan senilai kelas4");
    expect(formatFileSize(2_516_582)).toBe("2,4 MB");
    expect(formatFileSize(850_000)).toBe("830 KB");
    expect(MATERIAL_ACCEPT).toContain(".docx");
    expect(MATERIAL_ACCEPT).toContain("application/msword");
    expect(opensInBrowser("pdf")).toBe(true);
    expect(opensInBrowser("docx")).toBe(false);
  });
});

describe("validasi form materi", () => {
  it("izin unggah: file kosong ditolak, ukuran besar diterima", () => {
    expect(prepareUploadSchema.safeParse({ fileName: "a.pdf", fileSize: 10, mimeType: "application/pdf" }).success).toBe(true);
    expect(prepareUploadSchema.safeParse({ fileName: "a.pdf", fileSize: 500 * 1024 * 1024, mimeType: "" }).success).toBe(true);
    expect(prepareUploadSchema.safeParse({ fileName: "a.pdf", fileSize: 0, mimeType: "" }).success).toBe(false);
    expect(prepareUploadSchema.safeParse({ fileName: " ", fileSize: 10, mimeType: "" }).success).toBe(false);
  });

  it("data materi: judul wajib, isian opsional kosong menjadi null", () => {
    const ok = createMaterialSchema.safeParse({
      path: `${OWNER}/${FILE_ID}.pdf`,
      fileName: "Pecahan.pdf",
      title: "  Pecahan Senilai ",
      description: "",
      topic: " Pecahan ",
      gradeLevel: "4",
    });
    expect(ok.success && ok.data).toEqual({
      path: `${OWNER}/${FILE_ID}.pdf`,
      fileName: "Pecahan.pdf",
      title: "Pecahan Senilai",
      description: null,
      topic: "Pecahan",
      gradeLevel: 4,
    });
    const noGrade = createMaterialSchema.safeParse({ path: "x", fileName: "a.pdf", title: "Ab", description: "", topic: "", gradeLevel: "" });
    expect(noGrade.success && noGrade.data.gradeLevel).toBeNull();
    expect(createMaterialSchema.safeParse({ path: "x", fileName: "a.pdf", title: "A", description: "", topic: "", gradeLevel: "" }).success).toBe(false);
    expect(createMaterialSchema.safeParse({ path: "x", fileName: "a.pdf", title: "Ab", description: "", topic: "", gradeLevel: "7" }).success).toBe(false);
  });
});

describe("pesan error Storage", () => {
  it("menerjemahkan batas ukuran, tipe, akses, dan koneksi", () => {
    expect(storageErrorMessage({ message: "The object exceeded the maximum allowed size", statusCode: "413" })).toBe(FILE_TOO_LARGE_ERROR);
    expect(storageErrorMessage({ message: "mime type text/plain is not supported", statusCode: "415" })).toMatch(/Jenis file/);
    expect(storageErrorMessage({ message: "new row violates row-level security policy", statusCode: "403" })).toMatch(/akses/);
    expect(storageErrorMessage({ name: "StorageUnknownError", message: "Failed to fetch" })).toMatch(/koneksi/);
  });
});
