// Gabungkan supabase/migrations/*.sql menjadi satu file untuk SQL Editor Supabase (satu transaksi).
// Pakai hanya bila Supabase CLI tidak bisa mengakses project. Hasil di supabase/cloud/ (diabaikan Git).
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = "supabase/migrations";
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const versions = files.map((f) => f.split("_")[0]);
const body = files.map((f) => `-- ===== ${f} =====\n${readFileSync(join(dir, f), "utf8")}`).join("\n\n");
const out = `-- Rivora Fase B — bundel migration untuk SQL Editor (dibuat oleh scripts/bundle-migrations.mjs).
-- Jalankan SEKALI di project yang belum punya tabel Rivora. Semua atau tidak sama sekali (satu transaksi).
-- Sesudahnya, saat CLI sudah punya akses, sinkronkan riwayat migration:
--   supabase migration repair --status applied ${versions.join(" ")}
begin;

${body}

commit;
`;
mkdirSync("supabase/cloud", { recursive: true });
writeFileSync("supabase/cloud/fase_b_sql_editor.sql", out);
console.log(`supabase/cloud/fase_b_sql_editor.sql — ${files.length} migration, ${out.split("\n").length} baris`);
