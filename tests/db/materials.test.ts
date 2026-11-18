/**
 * Test database Bank Materi (Fase C sebagian): tabel teaching_materials + kebijakan Storage "materi".
 * Default PGlite (tiruan auth & storage Supabase). Storage asli diuji lewat tests/integration.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type Queryable, type TestDb } from "./harness";

let db: TestDb;
let guruA: string;
let guruB: string;

const pathOf = (owner: string, kind = "pdf") => `${owner}/${randomUUID()}.${kind}`;

async function insertMaterial(q: Queryable, input: { path: string; kind?: string; size?: number; title?: string }) {
  const { rows } = await q.query<{ id: string }>(
    `insert into public.teaching_materials (title, kind, file_path, file_name, file_size, mime_type)
     values ($1, $2, $3, $4, $5, 'application/pdf') returning id`,
    [input.title ?? "Penjumlahan Dasar", input.kind ?? "pdf", input.path, "Penjumlahan Dasar.pdf", input.size ?? 2048],
  );
  return rows[0].id;
}

async function putObject(q: Queryable, name: string) {
  await q.query("insert into storage.objects (bucket_id, name) values ('materi', $1)", [name]);
}

beforeAll(async () => {
  db = await createTestDb();
  const suffix = Date.now();
  guruA = await db.createUser(`materi-a-${suffix}@contoh.test`, "Bu Rina");
  guruB = await db.createUser(`materi-b-${suffix}@contoh.test`, "Pak Dodi");
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe("bank materi — tabel teaching_materials", () => {
  it("guru menyimpan materi PDF, Word, dan PowerPoint di foldernya sendiri", async () => {
    for (const kind of ["pdf", "doc", "docx", "ppt", "pptx"]) {
      await db.as(guruA, (q) => insertMaterial(q, { path: pathOf(guruA, kind), kind, title: `Materi ${kind}` }));
    }
    const n = await db.as(guruA, async (q) => (await q.query<{ n: number }>("select count(*)::int as n from public.teaching_materials")).rows[0].n);
    expect(n).toBeGreaterThanOrEqual(5);
  });

  it("menolak file di folder guru lain, ekstensi ≠ jenis, dan ukuran > 10 MB", async () => {
    await expect(db.as(guruA, (q) => insertMaterial(q, { path: pathOf(guruB) }))).rejects.toThrow(/teaching_materials_file_path_owner/);
    await expect(db.as(guruA, (q) => insertMaterial(q, { path: pathOf(guruA, "docx"), kind: "pdf" }))).rejects.toThrow(
      /teaching_materials_file_path_owner/,
    );
    await expect(db.as(guruA, (q) => insertMaterial(q, { path: pathOf(guruA), size: 10 * 1024 * 1024 + 1 }))).rejects.toThrow(
      /teaching_materials_file_size_limit/,
    );
    await expect(db.as(guruA, (q) => insertMaterial(q, { path: `${guruA}/../rahasia.pdf` }))).rejects.toThrow(
      /teaching_materials_file_path_owner/,
    );
  });

  it("satu file hanya dirujuk satu materi (tanpa upload ganda tercampur)", async () => {
    const path = pathOf(guruA);
    await db.as(guruA, (q) => insertMaterial(q, { path }));
    await expect(db.as(guruA, (q) => insertMaterial(q, { path }))).rejects.toThrow(/teaching_materials_file_path_key/);
  });

  it("guru lain tidak bisa membaca atau mengubah materi milik guru A", async () => {
    const id = await db.as(guruA, (q) => insertMaterial(q, { path: pathOf(guruA), title: "Pecahan Senilai" }));
    const seen = await db.as(guruB, async (q) => (await q.query("select id from public.teaching_materials where id = $1", [id])).rows);
    expect(seen).toEqual([]);
    const updated = await db.as(guruB, async (q) =>
      (await q.query("update public.teaching_materials set title = 'Diretas' where id = $1 returning id", [id])).rows,
    );
    expect(updated).toEqual([]);
  });

  it("materi diarsipkan (archived_at), tidak bisa dihapus permanen oleh guru", async () => {
    const id = await db.as(guruA, (q) => insertMaterial(q, { path: pathOf(guruA) }));
    await expect(db.as(guruA, (q) => q.query("delete from public.teaching_materials where id = $1", [id]))).rejects.toThrow(
      /permission denied/,
    );
    const archived = await db.as(guruA, async (q) =>
      (await q.query("update public.teaching_materials set archived_at = now() where id = $1 returning id", [id])).rows,
    );
    expect(archived).toHaveLength(1);
  });

  it("pengunjung tanpa login tidak punya akses", async () => {
    await expect(db.as(null, (q) => q.query("select 1 from public.teaching_materials"))).rejects.toThrow(/permission denied/);
  });
});

describe("bank materi — Storage bucket 'materi'", () => {
  it("bucket privat, batas 10 MB, hanya PDF/Word/PowerPoint", async () => {
    const { rows } = await db.admin.query<{ public: boolean; file_size_limit: string; allowed_mime_types: string[] }>(
      "select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'materi'",
    );
    expect(rows[0].public).toBe(false);
    expect(Number(rows[0].file_size_limit)).toBe(10 * 1024 * 1024);
    expect(rows[0].allowed_mime_types.sort()).toEqual(
      [
        "application/msword",
        "application/pdf",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ].sort(),
    );
  });

  it("guru hanya bisa mengunggah ke folder miliknya", async () => {
    await db.as(guruA, (q) => putObject(q, pathOf(guruA)));
    await expect(db.as(guruA, (q) => putObject(q, pathOf(guruB)))).rejects.toThrow(/row-level security/);
    await expect(db.as(null, (q) => putObject(q, pathOf(guruA)))).rejects.toThrow(/row-level security/);
  });

  it("guru lain tidak bisa melihat file guru A", async () => {
    const name = pathOf(guruA);
    await db.as(guruA, (q) => putObject(q, name));
    const seenByB = await db.as(guruB, async (q) => (await q.query("select name from storage.objects where name = $1", [name])).rows);
    const seenByA = await db.as(guruA, async (q) => (await q.query("select name from storage.objects where name = $1", [name])).rows);
    expect(seenByB).toEqual([]);
    expect(seenByA).toHaveLength(1);
  });

  it("file yang dirujuk materi tidak bisa dihapus; unggahan gagal (belum dirujuk) bisa dibersihkan", async () => {
    const used = pathOf(guruA);
    const orphan = pathOf(guruA);
    await db.as(guruA, async (q) => {
      await putObject(q, used);
      await putObject(q, orphan);
      await insertMaterial(q, { path: used });
    });

    const deleteRows = (name: string) =>
      db.as(guruA, async (q) => (await q.query("delete from storage.objects where name = $1 returning name", [name])).rows);
    expect(await deleteRows(used)).toEqual([]);
    expect(await deleteRows(orphan)).toEqual([{ name: orphan }]);

    const deletedByB = await db.as(guruB, async (q) =>
      (await q.query("delete from storage.objects where name = $1 returning name", [used])).rows,
    );
    expect(deletedByB).toEqual([]);
  });
});
