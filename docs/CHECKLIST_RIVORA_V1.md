# Checklist Rivora V1 — 25 Pekerjaan

Status:

- **Belum dibuat**
- **Sedang dikerjakan**
- **Sudah dibuat, belum teruji** (kode ada; belum diuji di Supabase Cloud/production atau oleh guru)
- **Selesai dan terverifikasi** (diuji di lingkungan sungguhan; bukti di `docs/HASIL_PENGUJIAN.md`)

"Lulus di PGlite/jsdom" dicatat sebagai bukti pendukung, **bukan** verifikasi di Supabase Cloud.

Audit awal: 18 November 2026, `main` = `c35df4f` (Fase A, Fase B, Bank Materi unggah file tanpa batas dari aplikasi).

## Tahap 1 — Fitur Mengajar

| # | Pekerjaan | Status | Catatan audit |
|---|---|---|---|
| 01 | Rencana materi per kelas | Sedang dikerjakan | Logika urutan & saran materi berikutnya sudah ada (data contoh); tabel `class_lesson_plans`, tambah/edit/urutkan/hapus belum ada |
| 02 | Hubungkan materi dengan jadwal | Sedang dikerjakan | Detail sesi menampilkan topik (data contoh); tombol Buka Materi nonaktif; route buka file `/materi/[id]/berkas` sudah ada |
| 03 | Tombol Tandai Selesai | Sedang dikerjakan | Tombol nonaktif; tabel `meeting_records` belum ada |
| 04 | Tunda dan Batal | Sedang dikerjakan | Tombol nonaktif |
| 05 | Catatan dan riwayat mengajar | Sedang dikerjakan | Catatan hanya ditampilkan dari data contoh; histori status belum ada |
| 06 | Progres mengajar otomatis | Sedang dikerjakan | Rumus (selesai ÷ rencana, maks 100%, tanpa hitung ganda, "Belum ada rencana") sudah ada & teruji unit; belum memakai data Supabase |
| 07 | Jadwal pengganti dan pengecualian | Sedang dikerjakan | Logika sesi pengganti ada di domain; tabel & UI belum |
| 08 | Edit kelas | Sedang dikerjakan | Tambah & arsip kelas sudah ada (Fase B); edit tingkat/rombel belum |

## Tahap 2 — Tahun Ajaran, Semester, Arsip

| # | Pekerjaan | Status | Catatan audit |
|---|---|---|---|
| 09 | Pergantian tahun ajaran | Belum dibuat | Database sudah mendukung banyak tahun, satu aktif, status arsip (PGlite); UI buat/pilih/akhiri tahun belum |
| 10 | Sebelum/sesudah UTS/PTS | Sudah dibuat, belum teruji | Tanggal UTS/PTS bisa diatur di Pengaturan (Fase B); pengelompokan rencana menyusul di Tahap 1 (#01) |
| 11 | Arsip tahun ajaran lengkap | Belum dibuat | Trigger arsip baca-saja sudah ada (PGlite); tombol arsipkan tahun belum |
| 12 | Detail dan pencarian arsip | Belum dibuat | Halaman Arsip masih tampilan data contoh |
| 13 | Pulihkan arsip | Belum dibuat | Database mengizinkan ubah status saja; UI & pengecekan konflik belum |
| 14 | Salin rencana ke tahun baru | Belum dibuat | — |
| 15 | Arsip Bank Materi | Belum dibuat | Arsipkan materi sudah ada (file tetap di Storage); daftar arsip, cari, pulihkan belum |

## Tahap 3 — Bank Materi dan Laporan

| # | Pekerjaan | Status | Catatan audit |
|---|---|---|---|
| 16 | Verifikasi upload materi asli | Sudah dibuat, belum teruji | PDF/DOC/DOCX/PPT/PPTX, bucket privat, signed URL; PGlite & jsdom lulus; test Cloud tertulis, belum jalan (secret key kosong); unggah di browser belum dikonfirmasi |
| 17 | Materi catatan dan tautan | Belum dibuat | Kolom `kind`/`external_url` sudah ada di tabel |
| 18 | Laporan mengajar | Belum dibuat | — |
| 19 | Ekspor PDF dan CSV | Belum dibuat | — |

## Tahap 4 — Pengujian

| # | Pekerjaan | Status | Catatan audit |
|---|---|---|---|
| 20 | Registrasi dan login | Sudah dibuat, belum teruji | Login di production berhasil (laporan pemilik). Konfirmasi email, reset sandi, dan session refresh belum diuji end-to-end |
| 21 | Pengujian dua akun guru | Sudah dibuat, belum teruji | RLS dua akun lulus di PGlite; anon ditolak di Cloud (REST); test dua akun di Cloud tertulis, menunggu secret key |
| 22 | Pengujian Supabase Storage | Sudah dibuat, belum teruji | `tests/integration/supabase-storage.test.ts` menunggu secret key |
| 23 | Alur guru lengkap (E2E) | Belum dibuat | — |
| 24 | Responsif dan error | Sedang dikerjakan | Beranda, Jadwal, Materi dicek di desktop/tablet/ponsel; halaman baru dicek per tahap |
| 25 | Uji coba guru SD | Belum dibuat | Perlu guru sungguhan; tidak akan ditandai lulus tanpa sesi uji nyata |

## Riwayat perubahan checklist

- 18 Nov 2026 — audit awal; Tahap 1 dimulai di branch `feature/tahap-1-mengajar`.
