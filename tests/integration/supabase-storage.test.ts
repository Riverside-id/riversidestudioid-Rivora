/**
 * Integrasi Supabase Storage SUNGGUHAN — Bank Materi (bucket "materi").
 * Variabel & persetujuan sama dengan supabase-auth-rls.test.ts (lihat .env.example).
 * Akun uji `rivora-uji-materi-*` dan file-filenya dihapus di akhir.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DataError } from "@/lib/data/errors";
import { createSupabaseMutations, type RivoraMutations } from "@/lib/data/mutations";
import { createSupabaseRepository } from "@/lib/data/supabase-repository";
import { MATERIAL_BUCKET, MAX_MATERIAL_BYTES } from "@/lib/materials/file-rules";
import type { Database } from "@/lib/supabase/database.types";

const url = process.env.RIVORA_TEST_SUPABASE_URL;
const publishableKey = process.env.RIVORA_TEST_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.RIVORA_TEST_SUPABASE_SECRET_KEY;
const isLocal = Boolean(url && /^https?:\/\/(localhost|127\.0\.0\.1)/.test(url));
const enabled = Boolean(url && publishableKey && secretKey && (isLocal || process.env.RIVORA_TEST_ALLOW_CLOUD === "true"));

const TEST_PREFIX = "rivora-uji-materi-";
const PASSWORD = `Uji-${crypto.randomUUID().slice(0, 12)}-9`;
const noSession = { auth: { persistSession: false, autoRefreshToken: false } } as const;
type Client = SupabaseClient<Database>;
type Teacher = { client: Client; userId: string; mutations: RivoraMutations };

const PDF_BYTES = new TextEncoder().encode("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

async function signIn(email: string): Promise<Teacher> {
  const client = createClient<Database>(url!, publishableKey!, noSession);
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error || !data.user) throw error ?? new Error("login gagal");
  return { client, userId: data.user.id, mutations: createSupabaseMutations(client, data.user.id) };
}

/** Alur yang sama dengan aplikasi: izin unggah (server) → unggah dari browser → simpan materi (server). */
async function uploadMaterial(t: Teacher, fileName: string, bytes: Uint8Array, title: string) {
  const ticket = await t.mutations.prepareMaterialUpload({ fileName, fileSize: bytes.byteLength, mimeType: "" });
  const browser = createClient(url!, publishableKey!, noSession);
  const { error } = await browser.storage
    .from(MATERIAL_BUCKET)
    .uploadToSignedUrl(ticket.path, ticket.token, bytes, { contentType: ticket.contentType, upsert: false });
  if (error) throw error;
  await t.mutations.createMaterial({ path: ticket.path, fileName, title, description: null, topic: "Pecahan", gradeLevel: 4 });
  return ticket.path;
}

describe.skipIf(!enabled)(`Supabase ${isLocal ? "lokal" : "Cloud"}: Storage Bank Materi dua akun guru`, () => {
  let admin: Client;
  const created: string[] = [];
  const paths: string[] = [];
  let a: Teacher;
  let b: Teacher;
  let pathA: string;

  beforeAll(async () => {
    admin = createClient<Database>(url!, secretKey!, noSession);
    const { data: existing } = await admin.auth.admin.listUsers({ perPage: 200 });
    for (const u of existing?.users ?? []) {
      if (u.email?.startsWith(TEST_PREFIX)) await admin.auth.admin.deleteUser(u.id);
    }
    const stamp = Date.now();
    const emails = [`${TEST_PREFIX}a-${stamp}@example.com`, `${TEST_PREFIX}b-${stamp}@example.com`];
    for (const email of emails) {
      const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
      if (error) throw error;
      created.push(data.user.id);
    }
    a = await signIn(emails[0]);
    b = await signIn(emails[1]);
    pathA = await uploadMaterial(a, "Pecahan Senilai.pdf", PDF_BYTES, "Pecahan Senilai");
    paths.push(pathA);
  }, 90_000);

  afterAll(async () => {
    if (paths.length > 0) await admin?.storage.from(MATERIAL_BUCKET).remove(paths);
    for (const id of created) await admin?.auth.admin.deleteUser(id);
  }, 60_000);

  it("guru mengunggah PDF: tersimpan di foldernya dengan ukuran dari Storage", async () => {
    const list = await createSupabaseRepository(a.client, a.userId).listMaterials();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ title: "Pecahan Senilai", kind: "pdf", fileName: "Pecahan Senilai.pdf", fileSize: PDF_BYTES.byteLength });
    expect(pathA.startsWith(`${a.userId}/`)).toBe(true);
  });

  it("file dibuka lewat signed URL berdurasi pendek", async () => {
    const id = (await createSupabaseRepository(a.client, a.userId).listMaterials())[0].id;
    const signed = await a.mutations.getMaterialFileUrl(id);
    expect(signed).toMatch(/token=/);
    const res = await fetch(signed);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/pdf");
  });

  it("guru B tidak bisa melihat, membuka, atau memakai file guru A", async () => {
    expect(await createSupabaseRepository(b.client, b.userId).listMaterials()).toEqual([]);
    const { data: signed } = await b.client.storage.from(MATERIAL_BUCKET).createSignedUrl(pathA, 60);
    expect(signed).toBeNull();
    const { data: downloaded } = await b.client.storage.from(MATERIAL_BUCKET).download(pathA);
    expect(downloaded).toBeNull();
    await expect(
      b.mutations.createMaterial({ path: pathA, fileName: "x.pdf", title: "Curian", description: null, topic: null, gradeLevel: null }),
    ).rejects.toBeInstanceOf(DataError);
    const { error: uploadError } = await b.client.storage
      .from(MATERIAL_BUCKET)
      .upload(`${a.userId}/${crypto.randomUUID()}.pdf`, PDF_BYTES, { contentType: "application/pdf" });
    expect(uploadError).not.toBeNull();
  });

  it("pengunjung tanpa login tidak bisa membuka file", async () => {
    const anon = createClient(url!, publishableKey!, noSession);
    const { data } = await anon.storage.from(MATERIAL_BUCKET).createSignedUrl(pathA, 60);
    expect(data).toBeNull();
  });

  it("bucket menolak jenis file lain dan file > 10 MB", async () => {
    const own = (ext: string) => `${a.userId}/${crypto.randomUUID()}.${ext}`;
    const { error: typeError } = await a.client.storage
      .from(MATERIAL_BUCKET)
      .upload(own("pdf"), new TextEncoder().encode("halo"), { contentType: "text/plain" });
    expect(typeError).not.toBeNull();

    await expect(a.mutations.prepareMaterialUpload({ fileName: "foto.jpg", fileSize: 10, mimeType: "image/jpeg" })).rejects.toBeInstanceOf(DataError);

    const big = new Uint8Array(MAX_MATERIAL_BYTES + 1024);
    const { error: sizeError } = await a.client.storage.from(MATERIAL_BUCKET).upload(own("pdf"), big, { contentType: "application/pdf" });
    expect(sizeError).not.toBeNull();
  }, 60_000);

  it("arsip: materi hilang dari daftar, file tetap ada dan tetap bisa dibuka", async () => {
    const id = (await createSupabaseRepository(a.client, a.userId).listMaterials())[0].id;
    await a.mutations.archiveMaterial(id);
    expect(await createSupabaseRepository(a.client, a.userId).listMaterials()).toEqual([]);

    const { data: removed } = await a.client.storage.from(MATERIAL_BUCKET).remove([pathA]);
    expect(removed ?? []).toEqual([]);
    const { data: stillThere } = await admin.storage.from(MATERIAL_BUCKET).exists(pathA);
    expect(stillThere).toBe(true);
    expect(await a.mutations.getMaterialFileUrl(id)).toMatch(/token=/);
  });
});
