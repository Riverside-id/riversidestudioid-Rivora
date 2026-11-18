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

Belum dibuat (Fase C): `teaching_materials` + Storage, `class_lesson_plans`, `meeting_records`, `audit_events`.

## Lapisan proteksi

1. **RLS** di semua tabel: `owner_id = auth.uid()` untuk select/insert/update; `anon` tanpa hak.
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
   - `handle_new_user`: profil otomatis saat mendaftar (nama dari metadata, cadangan dari email).
   - `validate_semester` / `validate_academic_year` / `validate_weekly_schedule`: tanggal berada di dalam periode induk.
   - `prevent_archived_year_changes`: tahun berstatus `archived` dan seluruh isinya baca-saja; pulihkan hanya dengan
     mengubah `status`. Perubahan berantai dari sistem (hapus akun) tetap diizinkan.
6. **RPC `complete_onboarding(jsonb)`** (`SECURITY INVOKER`): profil + tahun + 2 semester + kelas + jadwal dalam satu
   transaksi; gagal sebagian = batal semua.

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

## Alur aplikasi

```text
proxy.ts            segarkan sesi (cookie) + alihkan optimistis /login ↔ /dashboard
getRequestContext   getClaims() → userId terverifikasi; tanpa sesi → /login; belum onboarding → /onboarding
SupabaseRepository  baca (RLS + filter owner_id sebagai lapisan tambahan)
Server Actions      Zod → getMutationContext (tahun/semester dari server, bukan dari browser) → RivoraMutations
```

Tanggal default onboarding (keputusan pemilik): tahun 1 Juli–30 Juni, Semester 1 Juli–Desember,
Semester 2 Januari–Juni, penanda UTS/PTS kosong. Bisa diubah di Pengaturan.
