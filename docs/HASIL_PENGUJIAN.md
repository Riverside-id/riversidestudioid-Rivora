# Hasil Pengujian Rivora

Catatan jujur per lingkungan. "Lulus di PGlite" **bukan** berarti lulus di Supabase asli.

## Fase C (sebagian): Bank Materi — unggah PDF/Word/PowerPoint, 18 November 2026

| Lapisan | Lingkungan | Perintah | Hasil |
|---|---|---|---|
| Aturan file (jenis dari ekstensi, MIME cocok/generik, file kosong ditolak, ukuran bebas, path milik guru), validasi form, pesan error Storage | lokal | `src/lib/__tests__/materials.test.ts` | ✅ 7 test |
| Form unggah (tolak jenis/ukuran, judul dari nama file, alur izin → unggah → simpan, error Storage) | jsdom | `src/components/__tests__/upload-material-form.test.tsx` | ✅ 4 test |
| Tabel `teaching_materials` + RLS dua guru + policy Storage (folder sendiri, tidak lintas akun, file terpakai tak bisa dihapus) + bucket privat 5 tipe (tanpa batas ukuran sejak migration `20261118210000`) | **PGlite** + tiruan skema `storage` | `tests/db/materials.test.ts` | ✅ 10 skenario |
| Bundel SQL Editor `--since` (hanya migration baru untuk Cloud yang sudah berisi Fase B) | PGlite | `tests/db/sql-editor-bundle.test.ts` | ✅ |
| Transisi Cloud: materi batas 10 MB → tanpa batas (`--since 20261118210000`) | PGlite | `tests/db/sql-editor-bundle.test.ts` | ✅ |
| **Migration `20261118210000_materi_tanpa_batas_ukuran`** | **Supabase Cloud** | SQL Editor | ⏳ menunggu persetujuan SQL |
| Tampilan Materi (kartu, Unduh/Buka PDF, form unggah desktop & ponsel, pesan mode demo) | lokal, browser | manual | ✅ desain Fase A dipertahankan |
| **Storage asli**: unggah via signed URL, buka via signed URL, guru B & anon ditolak, bucket tolak tipe lain, file 11 MB diterima, arsip menjaga file | **Supabase Cloud** | `tests/integration/supabase-storage.test.ts` | ⏳ **belum** — menunggu persetujuan migration + secret key |

## Fase B — status per 18 November 2026

| Lapisan | Lingkungan | Perintah | Hasil |
|---|---|---|---|
| Lint | lokal | `npm run lint` | ✅ bersih |
| Typecheck | lokal | `npm run typecheck` | ✅ bersih |
| Unit + komponen | lokal (Node/jsdom) | `npm test` | ✅ lulus (bagian dari 105 test) |
| Database: migration, RLS dua akun, constraint, trigger, RPC | **PGlite** (Postgres 17 WASM + tiruan skema `auth`, tanpa default privileges) | `npm test` / `npm run test:db` | ✅ 35 skenario lulus |
| Rollback migration (migrate → rollback → migrate) | PGlite | skrip `supabase/rollback/fase_b_down.sql` | ✅ bersih |
| Build production (mode fixture & mode supabase) | lokal | `npm run build` | ✅ |
| Gerbang auth mode supabase tanpa server (proxy → /login, pesan koneksi) | lokal | manual di browser | ✅ |
| Bundel SQL Editor: terapkan, catat riwayat, tolak run ulang secara atomik | PGlite | `tests/db/sql-editor-bundle.test.ts` | ✅ 3 skenario lulus |
| **Migration Fase B diterapkan** (disetujui pemilik) | **Supabase Cloud** `efawovyrzkvgdphgkuuj` | bundel `npm run db:bundle` lewat SQL Editor | ✅ 18 Nov 2026 |
| **Struktur di Cloud**: 2 tipe, 6 tabel RLS aktif, 17 policy, anon tanpa hak, trigger `on_auth_user_created`, 4 versi riwayat migration, akun lama dapat profil (1/1) | **Supabase Cloud** | `supabase/checks/cek_kondisi.sql` (baca-saja) | ✅ sesuai harapan, sama dengan PGlite |
| Kunci publishable + Auth Cloud hidup | **Supabase Cloud** | `GET /auth/v1/health`, login akun tak dikenal | ✅ 200; login salah → `invalid_credentials` |
| Pengunjung tanpa login (anon) lewat REST | **Supabase Cloud** | `GET/POST /rest/v1/<tabel>`, `POST /rest/v1/rpc/complete_onboarding` | ✅ 6 tabel + RPC ditolak `42501 permission denied` |
| Build production mode supabase terhadap Cloud | lokal (`next start`) | `/dashboard`, `/jadwal`, `/onboarding`, `/pengaturan` | ✅ 307 → `/login`; `/login`, `/register` 200; route tak dikenal 404 |
| **Auth + RLS dua akun lewat HTTP** | **Supabase Cloud** `efawovyrzkvgdphgkuuj` | `npm run test:integration` | ⏳ **belum dijalankan** — menunggu secret key di `.env.test.local` |
| Database suite terhadap Postgres Cloud | Supabase Cloud | `npm run test:db:supabase` (butuh `RIVORA_TEST_DB_URL`) | ⏳ opsional, belum dijalankan |
| Alur daftar/konfirmasi email/reset di browser | Supabase Cloud | manual | ⏳ belum — perlu konfigurasi Auth Cloud (Site URL, Redirect URLs) |

### Hosting Vercel — status 18 Nov 2026 sore

| Cek | Hasil |
|---|---|
| Env **Preview** (`RIVORA_DATA_SOURCE=supabase`, URL + publishable key Supabase) | ✅ diisi; Preview `rivora-hcystix4p` dideploy ulang & Ready (dilindungi Vercel Authentication) |
| Deployment production `rivora-fi78zx991` (13.26 WIB, dipromosikan dari Preview Fase B lewat dashboard) | ⚠️ kode Fase B **tanpa env Production** → mode demo ditolak → "Halaman belum bisa dimuat" |
| Env **Production** (`RIVORA_DATA_SOURCE=supabase`, URL + publishable key, `NEXT_PUBLIC_SITE_URL`) | ✅ diisi dengan izin pemilik |
| Redeploy production `rivora-5d783nzju` → `https://rivora-rust.vercel.app` | ✅ Ready |
| `/`, `/login`, `/register`, `/forgot-password`, `/reset-password` | ✅ 200, desain Fase A, tanpa banner "Data demo" |
| `/dashboard`, `/jadwal`, `/onboarding`, `/pengaturan` tanpa login | ✅ 307 → `/login` |
| Login/daftar sungguhan di production | ⏳ belum diuji — perlu Auth URL Configuration di Supabase + akun guru |

### Hosting Vercel (production awal, commit `34d8918` / Fase A)

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
