# rivora.

**Atur Kelas, Fokus Mengajar.** — Rivora Teacher Personal V1, produk Riverside Studio.

Aplikasi web pribadi untuk **satu guru Matematika SD** yang mengajar beberapa kelas: jadwal mengajar,
materi, dan progres pelaksanaan pembelajaran per kelas, per semester, per tahun ajaran.

- Kebutuhan resmi: `PRD_Rivora_V1_Claude.md` (dipegang pemilik produk)
- Rencana implementasi per fitur F01–F12: [`docs/RENCANA_IMPLEMENTASI.md`](docs/RENCANA_IMPLEMENTASI.md)
- Panduan desain & token: [`docs/DESAIN.md`](docs/DESAIN.md)
- Screenshot preview: [`docs/screenshots/`](docs/screenshots/)

## Status: Fase A — Foundation & UI

| Sudah | Belum (fase berikutnya) |
|---|---|
| Next.js 16 App Router, TypeScript, Tailwind v4, design system | Supabase Auth, database, RLS (Fase B) |
| Shell responsif: sidebar desktop, laci menu ponsel/tablet | Tambah/ubah jadwal, materi, rencana, catatan (Fase C) |
| Beranda: 3 statistik, jadwal hari ini, progres per kelas | Arsip/pulihkan, salin tahun baru, laporan & ekspor (Fase D) |
| Pemilih Tahun Ajaran/Semester (data per semester terpisah) | Playwright E2E, deploy preview Netlify (Fase E) |
| UI Masuk/Daftar/Lupa sandi + wizard onboarding 4 langkah | |
| Halaman baca-saja Jadwal, Detail sesi, Materi, Progres, Arsip, Pengaturan | |
| Logika domain + 53 unit/component test | |

> **Semua data saat ini adalah DATA DEMO** (`src/lib/data/fixtures/demo-data.ts`) dan ditandai banner
> "Data demo" di setiap halaman. Login belum memeriksa akun; formulir tidak mengirim data ke mana pun.
> **Supabase belum diuji** karena belum dihubungkan.

## Menjalankan lokal

Prasyarat: Node.js ≥ 22.12 (LTS 22 direkomendasikan, lihat `.nvmrc`), npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Buka http://localhost:3000. Alur cepat: `/` → **Masuk** (isi email/sandi apa saja yang valid formatnya) → Beranda.

Tips demo:

- `RIVORA_DEMO_TODAY=2026-11-18` di `.env.local` → "hari ini" tetap Rabu dengan 4 sesi (untuk screenshot).
- `RIVORA_DEMO_SCENARIO=kosong` → tampilan guru baru tanpa kelas (empty state).
- Ganti semester di pemilih periode → data Semester Genap terpisah dari Ganjil.

### Skrip

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan |
| `npm run lint` | ESLint (`eslint-config-next`) |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `npm test` | Vitest (unit domain/service + komponen jsdom) |
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
| `RIVORA_ALLOW_DEMO_DATA` | `true` \| `false` | `true` hanya untuk deploy preview |

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

## Deploy preview Netlify (belum dilakukan — perlu persetujuan)

1. Netlify → **Add new site → Import from Git** → pilih `riversidestudioid/Rivora`.
2. Build command `npm run build` (sudah di `netlify.toml`), Node 22. Netlify memasang adapter Next.js otomatis.
3. **Site configuration → Environment variables**, isi per konteks:
   - *Deploy previews* & *Branch deploys*: `RIVORA_DATA_SOURCE=fixture`, `RIVORA_ALLOW_DEMO_DATA=true`.
   - *Production*: **jangan** set `RIVORA_ALLOW_DEMO_DATA`. Production baru diaktifkan setelah Supabase (Fase B+) dan persetujuan.
4. Buka Pull Request dari branch `feature/*` → Netlify membuat deploy preview.

## Kolaborasi Git

- `main` = produksi; pengerjaan di `feature/*`; review lewat Pull Request.
- Tidak ada push, merge, perubahan default branch, migration remote, atau deploy production tanpa persetujuan pemilik.
- Jangan commit `.env.local`, token, atau data pribadi murid (V1 tidak mengumpulkan data murid).

## Keterbatasan yang diketahui (Fase A)

- Belum ada autentikasi, database, atau penyimpanan file sungguhan; semua angka adalah data demo.
- Tombol aksi (Tambah, Tandai Selesai, Tunda, Buka Materi) sengaja nonaktif sampai fasenya.
- Draf onboarding hanya tersimpan di `localStorage` perangkat; Beranda tidak memakai isian wizard.
- `/jadwal/[id]` yang tidak ada menampilkan halaman "tidak ditemukan", tetapi status HTTP tetap 200
  karena konten di-stream (perilaku standar streaming Next.js).
- Belum diuji di Netlify. Dukungan Cache Components/Partial Prerendering pada runtime Netlify perlu
  dipastikan saat deploy preview pertama; jika bermasalah, `cacheComponents` dapat dimatikan di `next.config.ts`.
- `npm audit`: 0 kerentanan pada dependency production; 16 temuan *high* hanya di tooling dev
  (advisory ReDoS `picomatch` lewat vitest/vite, belum ada versi perbaikan) — tidak ikut ke bundle aplikasi.

## Troubleshooting

| Gejala | Solusi |
|---|---|
| "Halaman belum bisa dimuat" setelah `npm start` | Set `RIVORA_ALLOW_DEMO_DATA=true` (hanya lokal/preview) |
| Beranda selalu "Tidak ada jadwal mengajar hari ini" | Hari ini akhir pekan/di luar semester demo; set `RIVORA_DEMO_TODAY=2026-11-18` |
| Error `Uncached data was accessed outside of <Suspense>` | Pindahkan pembacaan cookie/tanggal ke komponen di dalam `<Suspense>` |
| Font tidak termuat saat build offline | `next/font` mengunduh Plus Jakarta Sans saat build; pastikan ada internet |
