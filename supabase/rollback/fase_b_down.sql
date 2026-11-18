-- =====================================================================================
-- ROLLBACK Fase B — BUKAN migration, tidak dijalankan otomatis.
-- Menghapus SEMUA objek yang dibuat migration 20261118100000–20261118100300.
-- ⚠️ Menghapus seluruh data profil, tahun ajaran, semester, kelas, dan jadwal. Akun Auth tetap ada.
-- Hanya untuk project yang belum berisi data guru sungguhan, dan hanya dengan persetujuan pemilik.
-- Setelah dijalankan via SQL Editor, sinkronkan riwayat CLI:
--   supabase migration repair --status reverted 20261118100000 20261118100100 20261118100200 20261118100300
-- =====================================================================================
begin;

drop trigger if exists on_auth_user_created on auth.users;

drop function if exists public.complete_onboarding(jsonb);

drop table if exists public.weekly_schedules;
alter table if exists public.academic_years drop constraint if exists academic_years_active_semester_fk;
drop table if exists public.teaching_classes;
drop table if exists public.semesters;
drop table if exists public.academic_years;
drop table if exists public.subjects;
drop table if exists public.profiles;

drop function if exists public.handle_new_user();
drop function if exists public.prevent_archived_year_changes();
drop function if exists public.validate_weekly_schedule();
drop function if exists public.validate_semester();
drop function if exists public.validate_academic_year();
drop function if exists public.set_updated_at();

drop type if exists public.timerange;
drop function if exists public.time_subtype_diff(time, time);
drop type if exists public.academic_year_status;

-- Ekstensi btree_gist dibiarkan (aman, mungkin dipakai objek lain).
commit;
