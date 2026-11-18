/**
 * Bundel SQL Editor (jalur tanpa CLI): diterapkan di database kosong yang sudah punya akun,
 * lalu dicek dengan query baca-saja yang sama dengan yang dipakai di Supabase Cloud.
 * Selalu berjalan di PGlite (database baru per test), terlepas dari RIVORA_TEST_DB_URL.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { describe, expect, it } from "vitest";
import { buildSqlEditorBundle } from "../../scripts/bundle-migrations.mjs";

const CHECK_SQL = readFileSync("supabase/checks/cek_kondisi.sql", "utf8");

async function freshDatabase() {
  const db = new PGlite({ extensions: { btree_gist } });
  await db.exec(readFileSync(join(__dirname, "supabase-auth-stub.sql"), "utf8"));
  // Akun yang sudah ada sebelum migration (mis. dibuat lewat Dashboard).
  await db.exec("insert into auth.users (id, email) values (gen_random_uuid(), 'guru.lama@contoh.test')");
  return db;
}

async function check(db: PGlite): Promise<Record<string, string>> {
  const results = await db.exec(CHECK_SQL);
  const rows = results.at(-1)!.rows as { cek: string; hasil: string }[];
  return Object.fromEntries(rows.map((r) => [r.cek.slice(0, 1), r.hasil]));
}

describe("bundel SQL Editor (Supabase Cloud tanpa CLI)", () => {
  it("menerapkan migration, mencatat riwayat, dan menampilkan hasil cek", async () => {
    const db = await freshDatabase();
    const { sql, migrations } = buildSqlEditorBundle();

    const results = await db.exec(sql);
    const shown = Object.fromEntries(
      (results.at(-1)!.rows as { cek: string; hasil: string }[]).map((r) => [r.cek.slice(0, 1), r.hasil]),
    );

    expect(shown.A).toBe("academic_year_status, timerange");
    expect(shown.B).toBe(
      "academic_years (RLS aktif), profiles (RLS aktif), semesters (RLS aktif), subjects (RLS aktif), teaching_classes (RLS aktif), weekly_schedules (RLS aktif)",
    );
    expect(shown.D).toBe("17");
    expect(shown.E).toBe("on_auth_user_created");
    expect(shown.F).toBe("tidak ada");
    expect(shown.G).toBe(migrations.map((m) => `${m.version} ${m.name}`).join(", "));
    expect(shown.H).toBe("1 / 1"); // akun lama mendapat profil lewat backfill
    await db.close();
  });

  it("menjalankan ulang ditolak tanpa mengubah apa pun (satu transaksi)", async () => {
    const db = await freshDatabase();
    const { sql } = buildSqlEditorBundle();
    await db.exec(sql);
    const before = await check(db);

    await expect(db.exec(sql)).rejects.toThrow(/already exists/);
    await db.exec("rollback").catch(() => undefined);

    expect(await check(db)).toEqual(before);
    await db.close();
  });

  it("query cek aman dijalankan pada database yang belum dimigrasi", async () => {
    const db = await freshDatabase();
    const shown = await check(db);
    expect(shown.A).toBe("tidak ada");
    expect(shown.G).toBe("tabel riwayat belum ada");
    expect(shown.H).toBe("tabel profiles belum ada / 1");
    await db.close();
  });
});
