# Hasil Pengujian Rivora

Catatan jujur per lingkungan. "Lulus di PGlite" **bukan** berarti lulus di Supabase asli.

## Fase B — status per 18 November 2026

| Lapisan | Lingkungan | Perintah | Hasil |
|---|---|---|---|
| Lint | lokal | `npm run lint` | ✅ bersih |
| Typecheck | lokal | `npm run typecheck` | ✅ bersih |
| Unit + komponen | lokal (Node/jsdom) | `npm test` | ✅ lulus (bagian dari 102 test) |
| Database: migration, RLS dua akun, constraint, trigger, RPC | **PGlite** (Postgres 17 WASM + tiruan skema `auth`, tanpa default privileges) | `npm test` / `npm run test:db` | ✅ 35 skenario lulus |
| Rollback migration (migrate → rollback → migrate) | PGlite | skrip `supabase/rollback/fase_b_down.sql` | ✅ bersih |
| Build production (mode fixture & mode supabase) | lokal | `npm run build` | ✅ |
| Gerbang auth mode supabase tanpa server (proxy → /login, pesan koneksi) | lokal | manual di browser | ✅ |
| **Auth + RLS dua akun lewat HTTP** | **Supabase Cloud** `efawovyrzkvgdphgkuuj` | `npm run test:integration` | ⏳ **belum dijalankan** — menunggu persetujuan migration remote + kunci uji |
| Database suite terhadap Postgres Cloud | Supabase Cloud | `npm run test:db:supabase` (butuh `RIVORA_TEST_DB_URL`) | ⏳ opsional, belum dijalankan |
| Alur daftar/konfirmasi email/reset di browser | Supabase Cloud | manual | ⏳ belum — perlu konfigurasi Auth Cloud (Site URL, Redirect URLs) |

### Hosting Vercel (production, commit `34d8918` / Fase A)

| Cek | Hasil |
|---|---|
| Deployment `rivora-ifoqlty68` | ✅ Ready; production `https://rivora-rust.vercel.app` |
| `/`, `/login`, `/register`, `/onboarding` | ✅ HTTP 200, tampilan sesuai desain |
| `/dashboard`, `/jadwal` | ✅ terkunci pengaman demo ("Halaman belum bisa dimuat"), tanpa data contoh |
| Halaman tidak ada | ✅ HTTP 404 |
| Penyebab error sebelumnya | `404 DEPLOYMENT_NOT_FOUND`: domain sudah ada tetapi belum pernah ada deployment yang berhasil |

### Skenario integrasi yang disiapkan untuk Supabase Cloud (`tests/integration/supabase-auth-rls.test.ts`)

1. Login dua akun guru, sesi & profil terpisah.
2. Guru B tidak bisa **membaca** data guru A (5 tabel).
3. Guru B tidak bisa **mengubah/menghapus/menyisipkan** ke data guru A.
4. CRUD kelas: tambah, duplikat ditolak, arsip (data tetap ada).
5. CRUD jadwal + bentrok: 11.00–12.00 boleh setelah 10.00–11.00; 10.30–11.30 ditolak; hapus.
6. CRUD periode: tanggal & penanda UTS/PTS; UTS di luar semester ditolak.
7. Semester Ganjil & Genap terpisah.
8. Pergantian tahun ajaran: 2026/2027 diarsipkan tetap utuh & baca-saja; 2027/2028 aktif & independen.
9. Pengunjung tanpa login ditolak.
10. Setelah keluar, akses berakhir.

Akun uji `rivora-uji-*@example.com` dibuat lewat Admin API dan dihapus beserta seluruh datanya di akhir run.
Test ke Cloud hanya berjalan bila `RIVORA_TEST_ALLOW_CLOUD=true`.

### Keterbatasan yang diketahui

- PGlite meniru `auth.uid()` dan peran Supabase, tetapi bukan GoTrue/PostgREST asli.
- Email bawaan Supabase Cloud hanya mengirim ke anggota tim project dan kuotanya kecil; uji daftar lewat email
  untuk guru sungguhan butuh SMTP sendiri.
- Template email bawaan Cloud memakai alur `code` (PKCE) yang hanya berhasil di browser yang sama dengan saat
  mendaftar. Template `token_hash` (di `supabase/templates/`) direkomendasikan untuk Cloud.

## Fase A

Lint, typecheck, 53 test, dan build lulus pada 18 November 2026 (lihat riwayat commit `34d8918`).
Screenshot Beranda Fase B identik piksel-per-piksel dengan Fase A (desktop 1440, tablet 820, ponsel 390).
