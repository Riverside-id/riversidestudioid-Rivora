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
const TANPA_BATAS = "20261118210000";

/** Bundel berisi migration SEBELUM versi tertentu (meniru kondisi Cloud pada saat itu). */
function bundleBefore(version: string): string {
  const dir = mkdtempSync(join(tmpdir(), "rivora-migrasi-"));
  for (const f of readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql") && f < version)) {
    copyFileSync(join("supabase/migrations", f), join(dir, f));
  }
  const { sql } = buildSqlEditorBundle({ migrationsDir: dir });
  rmSync(dir, { recursive: true, force: true });
  return sql;
}

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
    expect(shown.I).toBe("privat, tanpa batas bucket, 5 tipe file, 3 policy");
    await db.close();
  });

  it("--since hanya membundel migration baru untuk project yang sudah berjalan", async () => {
    const db = await freshDatabase();
    // Hanya migration Fase B yang sudah diterapkan.
    await db.exec(bundleBefore(FASE_C));
    expect((await check(db)).I).toBe("bucket materi belum ada");

    const { sql, migrations } = buildSqlEditorBundle({ since: FASE_C });
    expect(migrations.map((m) => m.version)).toEqual([FASE_C, TANPA_BATAS]);
    expect(sql).not.toMatch(/create table public\.profiles/);

    const shown = rowsToMap((await db.exec(sql)).at(-1)!.rows);
    expect(shown.B).toContain("teaching_materials (RLS aktif)");
    expect(shown.G.split(", ")).toContain(`${FASE_C} fase_c_materi`);
    expect(shown.I).toBe("privat, tanpa batas bucket, 5 tipe file, 3 policy");
    await db.close();
  });

  it("kondisi Cloud 18 Nov (materi batas 10 MB) → migration tanpa batas ukuran", async () => {
    const db = await freshDatabase();
    await db.exec(bundleBefore(TANPA_BATAS));
    expect((await check(db)).I).toBe("privat, batas 10 MB, 5 tipe file, 3 policy");

    const { sql, migrations } = buildSqlEditorBundle({ since: TANPA_BATAS });
    expect(migrations).toEqual([{ version: TANPA_BATAS, name: "materi_tanpa_batas_ukuran" }]);
    const shown = rowsToMap((await db.exec(sql)).at(-1)!.rows);
    expect(shown.I).toBe("privat, tanpa batas bucket, 5 tipe file, 3 policy");
    expect(shown.G.split(", ")).toContain(`${TANPA_BATAS} materi_tanpa_batas_ukuran`);
    expect(shown.D).toBe("20");
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
