// Gabungkan supabase/migrations/*.sql menjadi satu file untuk SQL Editor Supabase.
// Dipakai bila Supabase CLI tidak bisa mengakses project. Hasil di supabase/cloud/ (diabaikan Git).
//
// Isi bundel:
//   1. Semua migration dalam SATU transaksi (gagal sebagian = tidak ada yang berubah).
//   2. Pencatatan riwayat di supabase_migrations.schema_migrations (setara
//      `supabase migration repair --status applied`), supaya `supabase db push` nanti tidak mengulang.
//   3. Sesudah commit: query cek baca-saja (supabase/checks/cek_kondisi.sql) → tampil di panel Results.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/** @param {{ migrationsDir?: string; checkFile?: string }} [options] */
export function buildSqlEditorBundle(options = {}) {
  const migrationsDir = options.migrationsDir ?? "supabase/migrations";
  const checkFile = options.checkFile ?? "supabase/checks/cek_kondisi.sql";

  const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  const migrations = files.map((f) => ({
    version: f.split("_")[0],
    name: f.replace(/^\d+_/, "").replace(/\.sql$/, ""),
    sql: readFileSync(join(migrationsDir, f), "utf8"),
    file: f,
  }));
  const body = migrations.map((m) => `-- ===== ${m.file} =====\n${m.sql}`).join("\n\n");
  const historyRows = migrations.map((m) => `  ('${m.version}', '${m.name}')`).join(",\n");

  const sql = `-- Rivora — bundel migration untuk SQL Editor (dibuat oleh scripts/bundle-migrations.mjs).
-- Jalankan SEKALI di project yang belum punya tabel Rivora. Semua atau tidak sama sekali (satu transaksi).
-- Bila muncul "already exists", migration sudah pernah diterapkan: jangan ulangi, jalankan
-- supabase/checks/cek_kondisi.sql untuk memeriksa kondisinya.
begin;

${body}

-- ===== Riwayat migration (setara 'supabase migration repair --status applied') =====
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (version text not null primary key);
alter table supabase_migrations.schema_migrations add column if not exists statements text[];
alter table supabase_migrations.schema_migrations add column if not exists name text;
insert into supabase_migrations.schema_migrations (version, name) values
${historyRows}
on conflict (version) do nothing;

commit;

-- ===== Cek kondisi (hanya membaca) — hasil tampil di panel Results =====
${readFileSync(checkFile, "utf8")}`;

  return { sql, migrations: migrations.map(({ version, name }) => ({ version, name })) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { sql, migrations } = buildSqlEditorBundle();
  mkdirSync("supabase/cloud", { recursive: true });
  writeFileSync("supabase/cloud/fase_b_sql_editor.sql", sql);
  console.log(`supabase/cloud/fase_b_sql_editor.sql — ${migrations.length} migration, ${sql.split("\n").length} baris`);
}
