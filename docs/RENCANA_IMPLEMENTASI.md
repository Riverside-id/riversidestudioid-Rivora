# Rencana Implementasi Rivora V1

Sumber kebutuhan resmi: `PRD_Rivora_V1_Claude.md` (v1.0, 18 November 2026).
Referensi visual utama: screenshot dashboard pilihan pemilik (lihat `docs/DESAIN.md`).

Setiap fase berhenti untuk review pemilik sebelum fase berikutnya dimulai.
Tidak ada push, merge, migration remote, atau deploy production tanpa persetujuan eksplisit.

## Peta fitur → fase

| ID | Fitur | Fase A (sekarang) | Fase B | Fase C | Fase D | Fase E |
|---|---|---|---|---|---|---|
| F01 | Akun & onboarding | UI login/daftar/lupa sandi, wizard 4 langkah (draf di perangkat), validasi Zod | Supabase Auth SSR, profil, simpan wizard ke DB, test dua akun | | | E2E login ulang |
| F02 | Beranda | 3 statistik, jadwal hari ini (maks. 3 + Lihat Semua), progres per kelas (maks. 3), empty state, pemilih periode — dari fixture | Data nyata | Aksi dari jadwal | | |
| F03 | Kelola Kelas | Daftar kelas baca-saja di Jadwal | Tambah & arsip kelas, tolak rombel duplikat | Ubah nama/rombel | | |
| F04 | Jadwal Mengajar | Tampilan mingguan baca-saja, util deteksi bentrok + test | Simpan jadwal rutin + anti-bentrok di DB | Pengecualian, pengganti | | |
| F05 | Bank Materi | Daftar materi baca-saja | | Upload Storage privat, URL tervalidasi, signed URL | Referensi arsip | |
| F06 | Rencana Materi per Kelas | Model data & saran "materi berikutnya" + test | | CRUD rencana, urutan, penanda UTS | | |
| F07 | Catatan Pelaksanaan | Status & label di UI (tombol nonaktif) | | Selesai/Tunda/Batal + histori audit | | |
| F08 | Progres Kelas | Rumus progres (unik, dibatasi rencana) + test, "Belum ada rencana" | | Hitung dari realisasi nyata | | |
| F09 | Tahun Ajaran/Semester/UTS | Model tiga lapis, pemilih periode (cookie), util segmen UTS + test | Tabel & validasi tanggal | | Pergantian semester | |
| F10 | Arsip | Daftar tahun arsip (baca-saja, placeholder) | | | Arsip/pulihkan, read-only di DB, salin tanpa realisasi | |
| F11 | Laporan | — | | | Filter + ekspor CSV/PDF | |
| F12 | Pengaturan | Halaman profil baca-saja | Ubah nama/zona waktu/sandi | | | |

## Fase A — Foundation & UI (selesai, disetujui, di `main` sejak 18 Nov 2026)

- Next.js 16 App Router + TypeScript + Tailwind CSS v4, Cache Components aktif.
- Design system token sesuai PRD §8 dan screenshot (putih, biru pastel, mint, ungu lembut).
- Shell aplikasi: sidebar desktop, menu laci di ponsel/tablet, header + profil guru.
- Halaman: `/`, `/login`, `/register`, `/forgot-password`, `/onboarding`, `/dashboard`,
  `/jadwal`, `/jadwal/[id]`, `/materi`, `/progres`, `/arsip`, `/pengaturan`.
- Lapisan data: `RivoraRepository` (interface) → `FixtureRepository` (data demo berlabel).
  Service (`lib/services`) dan logika domain (`lib/domain`) tidak tahu sumber datanya,
  sehingga Fase B cukup menambah `SupabaseRepository`.
- Pengaman: data demo ditolak di build production kecuali `RIVORA_ALLOW_DEMO_DATA=true`
  (hanya untuk deploy preview), dan banner "Data demo" selalu tampil saat fixture aktif.

## Fase B — Auth & Data (diimplementasikan di `feature/fase-b`)

Keputusan pemilik (18 Nov 2026): tabel acuan `subjects` (Matematika saja, tanpa menu), konfirmasi email
wajib, tanggal periode default otomatis, runtime Docker dipasang pemilik. Penyimpanan jadwal mingguan
dimajukan dari Fase C ke Fase B atas permintaan pemilik.

1. ✅ Migrasi: `profiles`, `subjects`, `academic_years`, `semesters`, `teaching_classes`, `weekly_schedules`
   (FK komposit, exclusion constraint anti-bentrok, trigger periode & arsip, RPC `complete_onboarding`).
2. ✅ RLS semua tabel; anon tanpa hak; tidak ada DELETE untuk tahun/semester/kelas.
3. ✅ `@supabase/ssr`, `src/proxy.ts` (refresh sesi), `getRequestContext` dengan `getClaims()`.
4. ✅ `SupabaseRepository` + `RivoraMutations` dengan interface yang sama; UI Fase A dipertahankan.
5. ✅ Auth (daftar/masuk/keluar/lupa & reset sandi), onboarding tersimpan, kelola kelas & jadwal, pengaturan.
6. ✅ Test DB 32 skenario di PGlite; ⏳ ulangi di Supabase lokal (`npm run test:db:supabase`) +
   ⏳ test integrasi HTTP (`npm run test:integration`) — menunggu Docker.
7. ⏳ E2E singkat Playwright (daftar → onboarding → beranda → keluar → masuk lagi) — menunggu Supabase lokal.

## Fase C — Teaching Core

Jadwal berulang + pengecualian/pengganti, bank materi privat (bucket privat, MIME/ukuran 10 MB),
rencana per kelas, catatan pelaksanaan + audit, perhitungan progres dari data nyata.

## Fase D — Periode & Arsip

Penanda UTS/PTS, pergantian semester, arsip/pulihkan dengan konfirmasi, salin rencana ke tahun
baru tanpa realisasi, laporan + ekspor CSV UTF-8 & PDF.

## Fase E — QA & Staging

Playwright E2E alur penuh, test Supabase asli, security review, Netlify deploy preview,
pilot guru. Production hanya setelah persetujuan.
