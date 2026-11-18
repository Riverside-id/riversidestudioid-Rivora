/**
 * Bundel SQL Editor (jalur tanpa CLI): diterapkan di database yang sudah punya akun,
 * lalu dicek dengan query baca-saja yang sama dengan yang dipakai di Supabase Cloud.
 * Selalu berjalan di PGlite (database baru per test), terlepas dari RIVORA_TEST_DB_URL.
 */
import { copyFileSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { describe, expect, it } from "vitest";
import { buildSqlEditorBundle } from "../../scripts/bundle-migrations.mjs";

const CHECK_SQL = readFileSync("supabase/checks/cek_kondisi.sql", "utf8");
const FASE_C = "20261118200000";

async function freshDatabase() {
  const db = new PGlite({ extensions: { btree_gist } });
  await db.exec(readFileSync(join(__dirname, "supabase-auth-stub.sql"), "utf8"));
  // Akun yang sudah ada sebelum migration (mis. dibuat lewat Dashboard).
  await db.exec("insert into auth.users (id, email) values (gen_random_uuid(), 'guru.lama@contoh.test')");
  return db;
}

function rowsToMap(rows: unknown[]): Record<string, string> {
  return Object.fromEntries((rows as { cek: string; hasil: string }[]).map((r) => [r.cek.slice(0, 1), r.hasil]));
}

async function check(db: PGlite): Promise<Record<string, string>> {
  return rowsToMap((await db.exec(CHECK_SQL)).at(-1)!.rows);
}

describe("bundel SQL Editor (Supabase Cloud tanpa CLI)", { timeout: 30_000 }, () => {
  it("menerapkan semua migration, mencatat riwayat, dan menampilkan hasil cek", async () => {
    const db = await freshDatabase();
    const { sql, migrations } = buildSqlEditorBundle();

    const shown = rowsToMap((await db.exec(sql)).at(-1)!.rows);

    expect(shown.A).toBe("academic_year_status, timerange");
    expect(shown.B).toBe(
      "academic_years (RLS aktif), profiles (RLS aktif), semesters (RLS aktif), subjects (RLS aktif), " +
        "teaching_classes (RLS aktif), teaching_materials (RLS aktif), weekly_schedules (RLS aktif)",
    );
    expect(shown.D).toBe("20");
    expect(shown.E).toBe("on_auth_user_created");
    expect(shown.F).toBe("tidak ada");
    expect(shown.G).toBe(migrations.map((m) => `${m.version} ${m.name}`).join(", "));
    expect(shown.H).toBe("1 / 1"); // akun lama mendapat profil lewat backfill
    expect(shown.I).toBe("privat, batas 10 MB, 5 tipe file, 3 policy");
    await db.close();
  });

  it("--since hanya membundel migration baru untuk project yang sudah berjalan", async () => {
    const db = await freshDatabase();
    // Kondisi Cloud saat ini: hanya migration Fase B yang sudah diterapkan.
    const faseBDir = mkdtempSync(join(tmpdir(), "rivora-fase-b-"));
    for (const f of readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql") && f < FASE_C)) {
      copyFileSync(join("supabase/migrations", f), join(faseBDir, f));
    }
    await db.exec(buildSqlEditorBundle({ migrationsDir: faseBDir }).sql);
    rmSync(faseBDir, { recursive: true, force: true });
    expect((await check(db)).I).toBe("bucket materi belum ada");

    const { sql, migrations } = buildSqlEditorBundle({ since: FASE_C });
    expect(migrations).toEqual([{ version: FASE_C, name: "fase_c_materi" }]);
    expect(sql).not.toMatch(/create table public\.profiles/);

    const shown = rowsToMap((await db.exec(sql)).at(-1)!.rows);
    expect(shown.B).toContain("teaching_materials (RLS aktif)");
    expect(shown.G.split(", ")).toContain(`${FASE_C} fase_c_materi`);
    expect(shown.I).toBe("privat, batas 10 MB, 5 tipe file, 3 policy");
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
    expect(shown.I).toBe("bucket materi belum ada");
    await db.close();
  });
});
