# rivora.

**Atur Kelas, Fokus Mengajar.** — Rivora Teacher Personal V1, produk Riverside Studio.

Aplikasi web pribadi untuk **satu guru Matematika SD** yang mengajar beberapa kelas: jadwal mengajar,
materi, dan progres pelaksanaan pembelajaran per kelas, per semester, per tahun ajaran.

- Kebutuhan resmi: `PRD_Rivora_V1_Claude.md` (dipegang pemilik produk)
- Rencana implementasi per fitur F01–F12: [`docs/RENCANA_IMPLEMENTASI.md`](docs/RENCANA_IMPLEMENTASI.md)
- Panduan desain & token: [`docs/DESAIN.md`](docs/DESAIN.md)
- Arsitektur data, RLS, dan penyimpangan dari PRD: [`docs/ARSITEKTUR_DATA.md`](docs/ARSITEKTUR_DATA.md)
- Hasil pengujian per lingkungan: [`docs/HASIL_PENGUJIAN.md`](docs/HASIL_PENGUJIAN.md)
- Screenshot preview: [`docs/screenshots/`](docs/screenshots/)

## Status

| Fase | Status |
|---|---|
| A — Foundation & UI | Selesai, di `main` |
| B — Auth & Data | Di `feature/fase-b` (PR ke `main`); migration **sudah diterapkan** ke Supabase Cloud (18 Nov 2026) |
| C — Teaching Core | Belum |
| D — Periode & Arsip | Belum |
| E — QA & Staging | Belum |

Aplikasi punya dua mode (variabel `RIVORA_DATA_SOURCE`):

- **`fixture`** — data demo tanpa login, untuk pengembangan UI. Banner "Data demo" selalu tampil.
- **`supabase`** — login guru (Supabase Auth), data tersimpan di Postgres dengan RLS per akun.

Fase B mencakup: daftar/masuk/keluar/lupa & reset sandi (konfirmasi email wajib), onboarding tersimpan ke
database dalam satu transaksi, tahun ajaran & semester (tanggal default otomatis, bisa diubah), kelas +
mata pelajaran (Matematika), jadwal mingguan dengan pencegahan bentrok di database, arsip kelas, dan
pengaturan profil/periode/kata sandi.

> **Status pengujian Fase B:** migrasi, RLS dua akun, constraint, trigger, dan RPC lulus di **PGlite**
> (Postgres WASM + tiruan skema `auth` Supabase). Di **Supabase Cloud** migration sudah diterapkan dan struktur
> (tabel, RLS, policy, hak akses, trigger) sudah dicek. Test integrasi Auth + RLS lewat HTTP terhadap Cloud
> **belum dijalankan** — menunggu kunci API di `.env.test.local`. Rincian: `docs/HASIL_PENGUJIAN.md`.

## Menjalankan lokal

Prasyarat: Node.js ≥ 22.12 (LTS 22 direkomendasikan, lihat `.nvmrc`), npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Buka http://localhost:3000. Alur cepat: `/` → **Masuk** (isi email/sandi apa saja yang valid formatnya) → Beranda.

### Mode Supabase Cloud (keputusan pemilik: tanpa Docker)

Project: `efawovyrzkvgdphgkuuj` (`https://efawovyrzkvgdphgkuuj.supabase.co`).

1. Isi `.env.local`: `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (publishable, bukan secret).
2. Terapkan migration (**hanya dengan persetujuan pemilik**). Status: Fase B sudah diterapkan 18 Nov 2026 lewat SQL Editor.

   **Jalur A — CLI** (akun CLI harus punya akses ke project):

   ```bash
   supabase login
   ```

   ```bash
   supabase link --project-ref efawovyrzkvgdphgkuuj
   ```

   ```bash
   supabase db push --dry-run
   ```

   ```bash
   supabase db push
   ```

   **Jalur B — SQL Editor** (tanpa CLI): `npm run db:bundle` → tempel isi `supabase/cloud/fase_b_sql_editor.sql`
   ke Dashboard → SQL Editor → Run. Satu transaksi, riwayat migration ikut dicatat, dan hasil cek tampil di Results.
   Jika muncul `already exists`, migration sudah pernah diterapkan: jangan ulangi.

   Cek kondisi kapan saja (hanya membaca): jalankan `supabase/checks/cek_kondisi.sql` di SQL Editor.
   Pembatalan darurat (menghapus data Fase B): `supabase/rollback/fase_b_down.sql`.
3. Dashboard → Authentication → URL Configuration: Site URL `http://localhost:3000`, Redirect URLs `http://localhost:3000/**`
   dan URL Vercel (lihat bagian Hosting). Sign In / Providers → Email: konfirmasi email **aktif**, panjang sandi minimal 8.
   Disarankan: Email Templates *Confirm signup* & *Reset password* memakai isi `supabase/templates/*.html` (tautan `token_hash`).
4. Ubah `RIVORA_DATA_SOURCE=supabase` di `.env.local`, lalu `npm run dev`.
5. Test integrasi ke Cloud: isi `.env.test.local` (lihat `.env.example`, bagian "Khusus test"), lalu:

   ```bash
   npm run test:integration
   ```

### Mode Supabase lokal (opsional, butuh Docker Desktop atau OrbStack)

```bash
npm run db:start
```

Salin `API URL` dan `Publishable key` dari keluaran perintah di atas ke `.env.local`, lalu set
`RIVORA_DATA_SOURCE=supabase`:

```bash
npm run dev
```

Email konfirmasi/reset ditangkap Mailpit lokal di http://127.0.0.1:54324. Menerapkan ulang migrasi dari nol:

```bash
npm run db:reset
```

Tips demo (mode fixture):

- `RIVORA_DEMO_TODAY=2026-11-18` di `.env.local` → "hari ini" tetap Rabu dengan 4 sesi (untuk screenshot).
- `RIVORA_DEMO_SCENARIO=kosong` → tampilan guru baru tanpa kelas (empty state).
- Ganti semester di pemilih periode → data Semester Genap terpisah dari Ganjil.

### Skrip

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan |
| `npm run lint` | ESLint (`eslint-config-next`) |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `npm test` | Vitest: unit, komponen (jsdom), dan test database di PGlite |
| `npm run test:db:supabase` | Test database yang sama terhadap Postgres Supabase lokal |
| `npm run test:integration` | Auth + RLS dua akun lewat HTTP ke Supabase (butuh variabel `RIVORA_TEST_*`) |
| `npm run db:bundle` | Bundel migration + riwayat + cek untuk SQL Editor Supabase |
| `npm run db:start` / `db:stop` / `db:reset` | Supabase lokal (Docker) |
| `npm run db:types` | Regenerasi `src/lib/supabase/database.types.ts` dari database lokal |
| `npm run build` | Build production |
| `npm run check` | Semua di atas berurutan |

Menjalankan build production secara lokal dengan data demo:

```bash
npm run build
```

```bash
RIVORA_ALLOW_DEMO_DATA=true npm start
```

Tanpa `RIVORA_ALLOW_DEMO_DATA=true`, build production **menolak** data demo (halaman menampilkan
"Halaman belum bisa dimuat") — ini disengaja agar angka contoh tidak pernah tampil di production.

## Variabel lingkungan

Lihat [`.env.example`](.env.example). Tidak ada secret di repo.

| Variabel | Nilai | Keterangan |
|---|---|---|
| `RIVORA_DATA_SOURCE` | `fixture` \| `supabase` | `supabase` baru ada di Fase B |
| `RIVORA_DEMO_SCENARIO` | `lengkap` \| `kosong` | Hanya mode fixture |
| `RIVORA_DEMO_TODAY` | `YYYY-MM-DD` | Hanya mode fixture |
| `RIVORA_ALLOW_DEMO_DATA` | `true` \| `false` | Hanya dengan izin pemilik (domain preview bersifat publik) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL | Mode supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | kunci publishable | Mode supabase; kunci rahasia tidak pernah dipakai aplikasi |
| `NEXT_PUBLIC_SITE_URL` | origin situs | Tautan email Auth; wajib di Vercel |

## Struktur folder

```text
src/
  app/
    (app)/            # Halaman setelah login: dashboard, jadwal, jadwal/[id], materi, progres, arsip, pengaturan
      actions.ts      # Server Action: pilih semester yang dilihat (validasi Zod + cek kepemilikan)
      layout.tsx      # Shell: sidebar, header ponsel, banner demo
      error.tsx       # Error state + Coba Lagi
    (auth)/           # login, register, forgot-password
    onboarding/       # Wizard 4 langkah
    page.tsx          # Landing ringan
  components/
    ui/               # Button, Card, Field, ProgressBar, StatusBadge, EmptyState, Skeleton, …
    layout/           # Sidebar, MobileHeader, PageHeader, PeriodSwitcher, UserMenu, DemoBanner
    dashboard/        # StatCard, TodayScheduleCard, SessionRow, ClassProgressCard/List, MotivationCard
    auth/, onboarding/, brand/, illustrations/
  lib/
    domain/           # Tipe (cermin PRD §9), aturan periode/UTS, bentrok jadwal, rumus progres — murni, teruji
    data/
      repository.ts   # Interface RivoraRepository (kontrak akses data satu guru)
      fixture-repository.ts, fixtures/demo-data.ts   # DATA DEMO
      config.ts       # Baca env + pengaman data demo di production
      index.ts        # getRepository() — server-only; Fase B menambah SupabaseRepository di sini
    services/         # Komposisi untuk halaman: dashboard, schedule, progress, materials, archive
    server/           # Konteks per-request (cookie periode, tanggal Asia/Jakarta)
    validation/       # Skema Zod (auth, onboarding) — dipakai ulang di server pada Fase B
docs/                 # Rencana implementasi, desain, screenshot
```

### Arsitektur data

```text
Halaman (Server Component, di dalam <Suspense>)
  └─ getRequestContext()          cookie periode + tanggal hari ini (Asia/Jakarta)
       └─ getRepository()         fixture sekarang → Supabase di Fase B (interface sama)
  └─ services/*                   menyusun data untuk tampilan
       └─ domain/*                aturan bisnis murni: progres, bentrok, periode
```

Aturan PRD yang sudah ditegakkan di logika domain (dan diuji):

- Progres = pertemuan **selesai** ÷ pertemuan **direncanakan**; tanpa rencana → "Belum ada rencana".
- Ditunda/Batal/Terjadwal tidak menambah progres; status tidak berubah karena tanggal lewat.
- Sesi pengganti tidak dihitung ganda; progres dibatasi maksimal 100%.
- Progres tiap kelas independen walau memakai file materi yang sama.
- 10.00–11.00 tidak bentrok dengan 11.00–12.00.
- UTS/PTS hanya penanda dalam semester; semester Ganjil/Genap terpisah.
- Pemilih periode hanya menerima semester tahun ajaran aktif (tahun arsip lewat menu Arsip).

Catatan Next.js 16: **Cache Components** aktif. Data per-request (cookie, sesi, tanggal) wajib berada
di dalam `<Suspense>`; kerangka halaman dirender statis dan konten di-stream. Lihat `AGENTS.md`.

## Hosting: Vercel

Keputusan pemilik (18 Nov 2026): hosting memakai **Vercel** (menggantikan rencana Netlify di PRD).

| | |
|---|---|
| Project | `anugrahniezra/rivora` (tim *ezraspace*, paket Hobby) |
| Production | https://rivora-rust.vercel.app — branch `main` |
| Repo | `Riverside-id/riversidestudioid-Rivora` (terhubung; push ke `main` = deploy production) |
| Deploy preview | otomatis untuk branch lain/PR, dilindungi *Vercel Authentication* (hanya anggota tim) |

Status production saat ini (commit `34d8918`, Fase A): halaman publik tampil; halaman aplikasi sengaja terkunci
pengaman data demo karena tidak ada variabel environment — tidak ada angka contoh di domain publik.

Variabel environment (Vercel → Project → Settings → Environment Variables), setelah Fase B digabung dan Supabase siap:

- **Production**: `RIVORA_DATA_SOURCE=supabase`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  `NEXT_PUBLIC_SITE_URL=https://rivora-rust.vercel.app`. Jangan set `RIVORA_ALLOW_DEMO_DATA`.
- **Preview**: sama dengan project Supabase dev/staging bila ada. Data demo di preview hanya dengan izin pemilik.
- Supabase → Auth → URL Configuration: tambahkan `https://rivora-rust.vercel.app/**` (dan pola URL preview bila dipakai).

Perintah berguna (Vercel CLI, sudah di-link lewat `.vercel/`, diabaikan Git):

```bash
vercel ls rivora --scope anugrahniezra
```

`netlify.toml` tidak dipakai lagi dan bisa dihapus setelah pemilik mengonfirmasi Netlify tidak digunakan.

## Kolaborasi Git

- `main` = produksi; pengerjaan di `feature/*`; review lewat Pull Request.
- Tidak ada push, merge, perubahan default branch, migration remote, atau deploy production tanpa persetujuan pemilik.
- Jangan commit `.env.local`, token, atau data pribadi murid (V1 tidak mengumpulkan data murid).

## Keterbatasan yang diketahui

- **Fase B belum diuji terhadap Supabase asli**; hanya PGlite + build/pengalihan mode supabase.
- `src/lib/supabase/database.types.ts` ditulis manual; regenerasi dengan `npm run db:types` setelah Supabase lokal jalan.
- Email produksi: layanan email bawaan Supabase hanya untuk uji (kuota kecil, terbatas anggota tim) — perlu SMTP
  sendiri sebelum pilot dengan guru.
- Belum ada: materi/Storage, rencana per kelas, catatan Selesai/Tunda (Fase C); pergantian semester aktif,
  arsip tahun, salin tahun baru, laporan (Fase D); hapus akun mandiri (butuh fungsi admin — direncanakan).
- Draf onboarding tersimpan di `localStorage` perangkat sampai langkah terakhir dikirim.
- `/jadwal/[id]` yang tidak ada menampilkan halaman "tidak ditemukan", tetapi status HTTP tetap 200
  karena konten di-stream (perilaku standar streaming Next.js).
- Vercel mendukung Cache Components/Partial Prerendering secara bawaan; build Fase A & B sudah berhasil di Vercel.
  Alur login sungguhan di Vercel baru bisa dicoba setelah variabel environment Supabase diisi.
- `npm audit`: 0 kerentanan pada dependency production; 16 temuan *high* hanya di tooling dev
  (advisory ReDoS `picomatch` lewat vitest/vite, belum ada versi perbaikan) — tidak ikut ke bundle aplikasi.

## Troubleshooting

| Gejala | Solusi |
|---|---|
| "Halaman belum bisa dimuat" setelah `npm start` | Set `RIVORA_ALLOW_DEMO_DATA=true` (hanya lokal/preview) |
| Beranda selalu "Tidak ada jadwal mengajar hari ini" | Hari ini akhir pekan/di luar semester demo; set `RIVORA_DEMO_TODAY=2026-11-18` |
| Error `Uncached data was accessed outside of <Suspense>` | Pindahkan pembacaan cookie/tanggal ke komponen di dalam `<Suspense>` |
| Font tidak termuat saat build offline | `next/font` mengunduh Plus Jakarta Sans saat build; pastikan ada internet |
