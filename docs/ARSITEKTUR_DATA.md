# Arsitektur Data Rivora (Fase B)

Migrasi: `supabase/migrations/`. Test: `tests/db/schema.test.ts` (PGlite & Supabase lokal),
`tests/integration/` (Supabase lokal lewat HTTP).

## Tabel

| Tabel | Isi | Hapus? |
|---|---|---|
| `profiles` | nama panggilan, sekolah, zona waktu (WIB/WITA/WIT), `onboarded_at` | ikut akun |
| `subjects` | data acuan; V1 hanya `matematika` (Matematika SD), baca-saja | — |
| `academic_years` | label `2026/2027`, tanggal, status `active/planned/archived`, `active_semester_id` | tidak (arsip) |
| `semesters` | nomor 1/2, tanggal, `midterm_date` (penanda UTS/PTS, boleh kosong) | tidak |
| `teaching_classes` | tingkat 1–6, rombel `A`–`ZZ`, mata pelajaran, `archived_at` | tidak (arsip) |
| `weekly_schedules` | hari ISO 1–7, jam mulai/selesai, masa berlaku | ya (milik sendiri) |
| `teaching_materials` | judul, topik, tingkat (opsional), jenis, `file_path`/`file_name`/`file_size`, `archived_at` | tidak (arsip) |

Belum dibuat (Fase C): `class_lesson_plans`, `meeting_records`, `audit_events`.

## Bank Materi & Storage (migration `20261118200000_fase_c_materi`)

- Jenis file: PDF, Word (DOC/DOCX), PowerPoint (PPT/PPTX) — PRD F05 + permintaan pemilik (Word).
- Ukuran: **tidak dibatasi aplikasi** (keputusan pemilik 18 Nov 2026, migration `20261118210000`). Batas yang tersisa
  adalah batas unggah global Supabase project (Storage → Settings; paket Free maks. 50 MB per file, kuota total 1 GB).
- Bucket **privat** `materi`: daftar tipe MIME, tanpa `file_size_limit` sendiri. Path `<owner_id>/<uuid>.<ekstensi>`;
  nama asli disimpan di `file_name`. Constraint memastikan path berada di folder pemilik dan ekstensi = jenis.
- Policy Storage: guru hanya membaca/mengunggah di foldernya; tidak ada timpa (UPDATE); hapus hanya untuk file
  miliknya yang **belum dirujuk** materi (membersihkan unggahan gagal). File yang dipakai materi tidak bisa dihapus.
- Unggah: Server Action memeriksa jenis/ukuran → signed upload URL sekali pakai → browser mengirim file langsung
  ke Storage (tidak lewat server, bebas batas 4,5 MB Vercel) → Server Action membaca ukuran/tipe dari Storage lalu
  menyimpan baris materi; bila gagal, file dibersihkan.
- Buka: `/materi/[id]/berkas` memeriksa sesi & kepemilikan lalu mengalihkan ke signed URL 2 menit
  (PDF dibuka di browser, Word/PowerPoint diunduh dengan nama asli).
- Hapus = arsip (`archived_at`): materi hilang dari Bank Materi, file tetap ada untuk rujukan arsip.

## Lapisan proteksi

1. **Hak & RLS**: `GRANT` eksplisit hanya untuk `authenticated` (tidak bergantung pada pengaturan
   "expose new tables" project); `anon` tanpa hak; tanpa hak DELETE untuk tahun/semester/kelas.
   RLS di semua tabel: `owner_id = auth.uid()` untuk select/insert/update. Fungsi pembantu tidak bisa dipanggil lewat API.
2. **Foreign key komposit**:
   `(academic_year_id, owner_id) → academic_years(id, owner_id)`,
   `(class_id, academic_year_id) → teaching_classes(id, academic_year_id)`,
   `(semester_id, academic_year_id) → semesters(id, academic_year_id)`.
   Kelas, semester, dan jadwal secara struktur tidak bisa tercampur antar akun atau antar tahun.
3. **Constraint**: rombel unik per tahun & mata pelajaran; satu tahun aktif per guru (partial unique index);
   label tahun berurutan; tanggal berurutan; UTS di dalam semester.
4. **Exclusion constraint** `weekly_schedules_no_overlap` (btree_gist, rentang jam setengah-terbuka `[mulai, selesai)`
   × rentang tanggal berlaku): jadwal milik guru yang sama tidak boleh beririsan. 10.00–11.00 dan 11.00–12.00 boleh.
5. **Trigger**:
   - `handle_new_user`: profil otomatis saat mendaftar (nama dari metadata, cadangan dari email);
     akun yang sudah ada sebelum migration mendapat profil lewat backfill.
   - `validate_semester` / `validate_academic_year` / `validate_weekly_schedule`: tanggal berada di dalam periode induk.
   - `prevent_archived_year_changes`: tahun berstatus `archived` dan seluruh isinya baca-saja; pulihkan hanya dengan
     mengubah `status`. Perubahan berantai dari sistem (hapus akun) tetap diizinkan.
6. **RPC `complete_onboarding(jsonb)`** (`SECURITY INVOKER`): profil (upsert) + tahun + 2 semester + kelas + jadwal
   dalam satu transaksi; gagal sebagian = batal semua.

Rollback darurat (bukan migration): `supabase/rollback/fase_b_down.sql` — diuji migrate → rollback → migrate di PGlite.

Kode error khusus (dipetakan ke pesan UI di `src/lib/data/errors.ts`): `RV001` arsip, `RV002` onboarding sudah selesai,
`RV003` tanggal di luar periode, `RV004` kelas diarsipkan.

## Penyimpangan dari PRD §9 (disengaja)

| PRD | Implementasi | Alasan |
|---|---|---|
| — | `subjects` + `teaching_classes.subject_code` | Permintaan pemilik "database kelas dan mata pelajaran"; tanpa menu baru |
| semester aktif tidak dimodelkan | `academic_years.active_semester_id` (FK komposit) | "Satu semester aktif per tahun" dijamin struktur |
| `owner_id` hanya di tabel induk | `owner_id` juga di `semesters` & `weekly_schedules` | RLS sederhana & cepat, FK komposit lintas akun |
| `weekly_schedules` tanpa tahun | + `academic_year_id` | FK komposit kelas↔semester satu tahun; trigger arsip seragam |
| UUID semua PK | `subjects.code` teks (`matematika`) | Data acuan statis, mudah dibaca |
| Materi PDF/PPT/PPTX | + Word (DOC/DOCX) | Permintaan pemilik |
| Batas awal 10 MB per file (§10) | tanpa batas dari aplikasi; ikut batas global Supabase | Keputusan pemilik 18 Nov 2026 |

## Alur aplikasi

```text
proxy.ts            segarkan sesi (cookie) + alihkan optimistis /login ↔ /dashboard
getRequestContext   getClaims() → userId terverifikasi; tanpa sesi → /login; belum onboarding → /onboarding
SupabaseRepository  baca (RLS + filter owner_id sebagai lapisan tambahan)
Server Actions      Zod → getMutationContext (tahun/semester dari server, bukan dari browser) → RivoraMutations
```

Tanggal default onboarding (keputusan pemilik): tahun 1 Juli–30 Juni, Semester 1 Juli–Desember,
Semester 2 Januari–Juni, penanda UTS/PTS kosong. Bisa diubah di Pengaturan.
