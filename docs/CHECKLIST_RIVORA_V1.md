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
| 01 | Rencana materi per kelas | Sudah dibuat, belum teruji | `/progres/[kelas]`: tambah/ubah/urutkan/hapus topik, jumlah pertemuan, penanda UTS/PTS, file Bank Materi, materi berikutnya. Hapus ditolak bila sudah ada catatan. PGlite ✅; Cloud menunggu migration |
| 02 | Hubungkan materi dengan jadwal | Sudah dibuat, belum teruji | Detail sesi: topik rencana (saran otomatis, bisa diganti saat Tandai Selesai), Buka Materi (PDF di browser) / Unduh (Word, PowerPoint); satu file untuk banyak kelas |
| 03 | Tombol Tandai Selesai | Sudah dibuat, belum teruji | Simpan status, tanggal pelaksanaan, waktu pencatatan (server), topik, ringkasan & kendala; satu catatan per kejadian jadwal (unik di DB) |
| 04 | Tunda dan Batal | Sudah dibuat, belum teruji | Tunda + alasan + jadwal pengganti; Batal + alasan; ubah status / kembalikan ke Terjadwal; progres terkoreksi otomatis |
| 05 | Catatan dan riwayat mengajar | Sudah dibuat, belum teruji | Riwayat per kelas di halaman rencana; histori perubahan status per pertemuan (ditulis trigger, tidak bisa diubah guru) |
| 06 | Progres mengajar otomatis | Sudah dibuat, belum teruji | Repository membaca rencana & catatan nyata; rumus teruji unit; pengganti tidak dihitung ganda |
| 07 | Jadwal pengganti dan pengecualian | Sudah dibuat, belum teruji | Pengganti tanggal & jam sendiri (cek bentrok di tanggal itu, di dalam semester); libur = Batal/Tunda per tanggal; jadwal mingguan tidak berubah |
| 08 | Edit kelas | Sudah dibuat, belum teruji | Dialog Ubah Kelas (tingkat/rombel), cek duplikat (app + constraint DB), riwayat tetap terhubung |

## Tahap 2 — Tahun Ajaran, Semester, Arsip

| # | Pekerjaan | Status | Catatan audit |
|---|---|---|---|
| 09 | Pergantian tahun ajaran | Sudah dibuat, belum teruji | Arsip → Mulai Tahun Ajaran Baru (RPC satu transaksi: tahun lama diarsipkan, tahun baru + 2 semester). PGlite ✅; migration `20261119200000` menunggu persetujuan |
| 10 | Sebelum/sesudah UTS/PTS | Sudah dibuat, belum teruji | Tanggal UTS/PTS bisa diatur di Pengaturan (Fase B); pengelompokan rencana menyusul di Tahap 1 (#01) |
| 11 | Arsip tahun ajaran lengkap | Sudah dibuat, belum teruji | Kelas (termasuk yang diarsipkan), jadwal, rencana, catatan, progres tetap utuh & baca-saja; tidak ada data/file yang dihapus |
| 12 | Detail dan pencarian arsip | Sudah dibuat, belum teruji | Cari tahun/kelas; `/arsip/[tahun]`: filter semester & kelas, cari topik/catatan, progres lama, rencana + file, riwayat. Ekspor menyusul (#19) |
| 13 | Pulihkan arsip | Sudah dibuat, belum teruji | Pulihkan dengan konfirmasi; tahun aktif diarsipkan dalam transaksi yang sama (tidak pernah dua tahun aktif); RV007 untuk tahun bukan milik/arsip |
| 14 | Salin rencana ke tahun baru | Sudah dibuat, belum teruji | Opsi salin kelas, rencana (topik, urutan, jumlah pertemuan, penanda, file sama), jadwal; progres & catatan tidak disalin (teruji PGlite) |
| 15 | Arsip Bank Materi | Sudah dibuat, belum teruji | Materi Diarsipkan: cari, Buka/Unduh, Pulihkan; file tidak dihapus. Tanpa migration baru |

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
| 24 | Responsif dan error | Sedang dikerjakan | Menu Arsip/Pengaturan terpotong di layar pendek → diperbaiki (sidebar & laci menu bisa digulir, dicek 1280×450 & 740×360). Halaman baru dicek per tahap |
| 25 | Uji coba guru SD | Belum dibuat | Perlu guru sungguhan; tidak akan ditandai lulus tanpa sesi uji nyata |

## Riwayat perubahan checklist

- 18 Nov 2026 — audit awal; Tahap 1 dimulai di branch `feature/tahap-1-mengajar`.
- 18 Nov 2026 — Tahap 1 (#01–#08) dibuat; migration `20261119100000_fase_c_mengajar` menunggu persetujuan untuk Supabase Cloud.
- 19 Nov 2026 — Migration Tahap 1 terverifikasi ada di Cloud (tabel ada, anon ditolak); PR #6 di `main`. Tahap 2 (#09–#15) dibuat di `feature/tahap-2-arsip`; migration `20261119200000_fase_d_tahun_ajaran` menunggu persetujuan.
