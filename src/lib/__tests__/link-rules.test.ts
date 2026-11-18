import { describe, expect, it } from "vitest";
import { materialOpenTarget } from "@/components/materi/material-open-link";
import { checkExternalUrl, linkHost } from "@/lib/materials/link-rules";
import { createLinkMaterialSchema, createNoteMaterialSchema } from "@/lib/validation/materials";

describe("validasi tautan materi", () => {
  it("menerima http/https dan melengkapi https:// bila tanpa skema", () => {
    expect(checkExternalUrl("https://www.youtube.com/watch?v=abc")).toMatchObject({ ok: true, host: "youtube.com" });
    expect(checkExternalUrl("youtube.com/watch?v=abc")).toMatchObject({ ok: true, url: "https://youtube.com/watch?v=abc" });
    expect(checkExternalUrl("HTTP://contoh.sch.id/modul")).toMatchObject({ ok: true, url: "http://contoh.sch.id/modul" });
  });

  it("menolak skema berbahaya, kredensial, dan alamat tidak lengkap", () => {
    for (const bad of ["javascript:alert(1)", "JavaScript:alert(1)", "data:text/html,hi", "file:///etc/passwd", "vbscript:x", "ftp://contoh.id/a"]) {
      expect(checkExternalUrl(bad).ok, bad).toBe(false);
    }
    expect(checkExternalUrl("https://user:pass@contoh.id").ok).toBe(false);
    expect(checkExternalUrl("halo").ok).toBe(false);
    expect(checkExternalUrl("").ok).toBe(false);
    expect(checkExternalUrl(`https://contoh.id/${"a".repeat(2100)}`).ok).toBe(false);
    expect(linkHost("https://www.contoh.id/x")).toBe("contoh.id");
  });

  it("skema form tautan & catatan", () => {
    const base = { title: "Video Pecahan", description: "", topic: "", gradeLevel: "" };
    expect(createLinkMaterialSchema.safeParse({ ...base, kind: "video", url: "https://youtu.be/x" }).success).toBe(true);
    expect(createLinkMaterialSchema.safeParse({ ...base, kind: "file", url: "https://youtu.be/x" }).success).toBe(false);
    expect(createNoteMaterialSchema.safeParse({ ...base, body: "  " }).success).toBe(false);
    expect(createNoteMaterialSchema.safeParse({ ...base, body: "x".repeat(20001) }).success).toBe(false);
    expect(createNoteMaterialSchema.safeParse({ ...base, body: "1. Apersepsi" }).success).toBe(true);
  });

  it("cara membuka materi sesuai jenis (tautan tidak aman tidak pernah dijadikan href)", () => {
    const m = { id: "m1", title: "T", filePath: null, externalUrl: null };
    expect(materialOpenTarget({ ...m, kind: "video", externalUrl: "https://youtu.be/x" })).toMatchObject({ external: true, label: "Tonton video" });
    expect(materialOpenTarget({ ...m, kind: "link", externalUrl: "javascript:alert(1)" })).toBeNull();
    expect(materialOpenTarget({ ...m, kind: "note" })).toMatchObject({ href: "/materi/m1", external: false });
    expect(materialOpenTarget({ ...m, kind: "pdf", filePath: "u/f.pdf" })).toMatchObject({ href: "/materi/m1/berkas", label: "Buka PDF" });
    expect(materialOpenTarget({ ...m, kind: "docx", filePath: "u/f.docx" })).toMatchObject({ label: "Unduh" });
  });
});
