-- =====================================================================================
-- Rivora Fase B — Row Level Security
-- Guru hanya bisa membaca/menulis baris miliknya. Pengunjung anonim tidak punya akses.
-- Tidak ada kebijakan DELETE untuk tahun ajaran, semester, dan kelas: arsip bukan hapus.
-- =====================================================================================

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.academic_years enable row level security;
alter table public.semesters enable row level security;
alter table public.teaching_classes enable row level security;
alter table public.weekly_schedules enable row level security;

-- Pertahanan berlapis: peran anon tidak mendapat hak tabel sama sekali.
revoke all on table
  public.profiles, public.subjects, public.academic_years,
  public.semesters, public.teaching_classes, public.weekly_schedules
from anon;

-- Data acuan hanya boleh dibaca oleh guru yang login.
revoke insert, update, delete, truncate on table public.subjects from authenticated;

-- profiles ------------------------------------------------------------------------------
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- subjects ------------------------------------------------------------------------------
create policy subjects_read on public.subjects
  for select to authenticated
  using (true);

-- academic_years ------------------------------------------------------------------------
create policy academic_years_select_own on public.academic_years
  for select to authenticated using (owner_id = (select auth.uid()));
create policy academic_years_insert_own on public.academic_years
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy academic_years_update_own on public.academic_years
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- semesters -----------------------------------------------------------------------------
create policy semesters_select_own on public.semesters
  for select to authenticated using (owner_id = (select auth.uid()));
create policy semesters_insert_own on public.semesters
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy semesters_update_own on public.semesters
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- teaching_classes ----------------------------------------------------------------------
create policy teaching_classes_select_own on public.teaching_classes
  for select to authenticated using (owner_id = (select auth.uid()));
create policy teaching_classes_insert_own on public.teaching_classes
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy teaching_classes_update_own on public.teaching_classes
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- weekly_schedules ----------------------------------------------------------------------
create policy weekly_schedules_select_own on public.weekly_schedules
  for select to authenticated using (owner_id = (select auth.uid()));
create policy weekly_schedules_insert_own on public.weekly_schedules
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy weekly_schedules_update_own on public.weekly_schedules
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy weekly_schedules_delete_own on public.weekly_schedules
  for delete to authenticated using (owner_id = (select auth.uid()));
