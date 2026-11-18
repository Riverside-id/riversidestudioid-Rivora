-- =====================================================================================
-- Rivora Fase B — skema inti
-- Profil guru, mata pelajaran, tahun ajaran, semester, kelas, jadwal mingguan.
--
-- Prinsip:
--  * Satu guru = satu ruang data: setiap baris privat punya owner_id (auth.users).
--  * Foreign key komposit (…, owner_id) dan (…, academic_year_id) menjamin secara struktur
--    bahwa kelas, semester, dan jadwal selalu milik akun dan tahun ajaran yang sama.
--  * UTS/PTS hanya penanda tanggal di dalam semester (midterm_date), bukan entitas periode.
-- =====================================================================================

create extension if not exists btree_gist with schema extensions;

-- Status tahun ajaran (PRD §9: arsip cukup status = 'archived').
create type public.academic_year_status as enum ('active', 'planned', 'archived');

-- Rentang jam lokal untuk deteksi bentrok jadwal. Dipakai setengah-terbuka [mulai, selesai)
-- sehingga 10.00–11.00 tidak bentrok dengan 11.00–12.00 (PRD F04).
create function public.time_subtype_diff(x time, y time)
returns double precision
language sql
immutable
strict
set search_path = ''
as $$ select extract(epoch from (x - y))::double precision $$;

create type public.timerange as range (subtype = time, subtype_diff = public.time_subtype_diff);

-- -------------------------------------------------------------------------------------
-- Profil guru (dibuat otomatis saat mendaftar — lihat trigger handle_new_user)
-- -------------------------------------------------------------------------------------
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  school_name text,
  timezone text not null default 'Asia/Jakarta',
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (char_length(btrim(display_name)) between 2 and 40),
  constraint profiles_school_name_length check (school_name is null or char_length(school_name) <= 80),
  -- V1: zona waktu Indonesia (WIB/WITA/WIT).
  constraint profiles_timezone_supported check (timezone in ('Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'))
);

comment on table public.profiles is 'Preferensi guru. Satu baris per akun.';

-- -------------------------------------------------------------------------------------
-- Mata pelajaran — data acuan (V1 hanya Matematika SD; tidak ada menu di UI)
-- -------------------------------------------------------------------------------------
create table public.subjects (
  code text primary key,
  name text not null,
  education_level text not null default 'SD',
  created_at timestamptz not null default now(),
  constraint subjects_code_format check (code ~ '^[a-z][a-z0-9-]{1,40}$')
);

comment on table public.subjects is 'Data acuan mata pelajaran. Baca-saja bagi guru.';

insert into public.subjects (code, name, education_level) values ('matematika', 'Matematika', 'SD');

-- -------------------------------------------------------------------------------------
-- Tahun ajaran
-- -------------------------------------------------------------------------------------
create table public.academic_years (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label text not null,
  start_date date not null,
  end_date date not null,
  status public.academic_year_status not null default 'active',
  -- Satu semester aktif per tahun ajaran (FK ditambahkan setelah tabel semesters ada).
  active_semester_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_years_label_format check (
    label ~ '^[0-9]{4}/[0-9]{4}$'
    and split_part(label, '/', 2)::int = split_part(label, '/', 1)::int + 1
  ),
  constraint academic_years_dates check (start_date < end_date),
  constraint academic_years_owner_label_key unique (owner_id, label),
  constraint academic_years_id_owner_key unique (id, owner_id)
);

-- PRD §6: tahun ajaran aktif hanya satu per guru.
create unique index academic_years_one_active_per_owner
  on public.academic_years (owner_id)
  where status = 'active';

-- -------------------------------------------------------------------------------------
-- Semester (1 = Ganjil, 2 = Genap)
-- -------------------------------------------------------------------------------------
create table public.semesters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  academic_year_id uuid not null,
  number smallint not null,
  start_date date not null,
  end_date date not null,
  -- Penanda tengah semester (UTS/PTS). NULL = penanda dinonaktifkan.
  midterm_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint semesters_number_valid check (number in (1, 2)),
  constraint semesters_dates check (start_date < end_date),
  constraint semesters_midterm_inside check (
    midterm_date is null or (midterm_date > start_date and midterm_date < end_date)
  ),
  constraint semesters_year_fk foreign key (academic_year_id, owner_id)
    references public.academic_years (id, owner_id) on delete cascade,
  constraint semesters_year_number_key unique (academic_year_id, number),
  constraint semesters_id_year_key unique (id, academic_year_id)
);

create index semesters_owner_idx on public.semesters (owner_id);

alter table public.academic_years
  add constraint academic_years_active_semester_fk
  foreign key (active_semester_id, id)
  references public.semesters (id, academic_year_id)
  on delete set null (active_semester_id);

-- -------------------------------------------------------------------------------------
-- Kelas yang diajar (rombel + mata pelajaran) per tahun ajaran
-- -------------------------------------------------------------------------------------
create table public.teaching_classes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  academic_year_id uuid not null,
  subject_code text not null default 'matematika' references public.subjects (code),
  grade_level smallint not null,
  section text not null,
  display_name text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teaching_classes_grade_valid check (grade_level between 1 and 6),
  constraint teaching_classes_section_format check (section ~ '^[A-Z]{1,2}$'),
  constraint teaching_classes_display_name_length check (char_length(btrim(display_name)) between 1 and 40),
  constraint teaching_classes_year_fk foreign key (academic_year_id, owner_id)
    references public.academic_years (id, owner_id) on delete cascade,
  -- PRD F03: rombel duplikat pada tahun ajaran yang sama ditolak.
  constraint teaching_classes_unique_rombel unique (academic_year_id, subject_code, grade_level, section),
  constraint teaching_classes_id_year_key unique (id, academic_year_id)
);

create index teaching_classes_owner_idx on public.teaching_classes (owner_id);

-- -------------------------------------------------------------------------------------
-- Jadwal mingguan rutin (pengecualian/pengganti menyusul di Fase C)
-- -------------------------------------------------------------------------------------
create table public.weekly_schedules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  academic_year_id uuid not null,
  class_id uuid not null,
  semester_id uuid not null,
  -- ISO: 1 = Senin … 7 = Minggu
  weekday smallint not null,
  start_time time not null,
  end_time time not null,
  effective_from date not null,
  effective_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_schedules_weekday_valid check (weekday between 1 and 7),
  constraint weekly_schedules_time_order check (start_time < end_time),
  constraint weekly_schedules_effective_order check (effective_until is null or effective_from <= effective_until),
  constraint weekly_schedules_year_fk foreign key (academic_year_id, owner_id)
    references public.academic_years (id, owner_id) on delete cascade,
  constraint weekly_schedules_class_fk foreign key (class_id, academic_year_id)
    references public.teaching_classes (id, academic_year_id) on delete cascade,
  constraint weekly_schedules_semester_fk foreign key (semester_id, academic_year_id)
    references public.semesters (id, academic_year_id) on delete cascade,
  -- PRD F04: satu guru tidak boleh punya dua jadwal yang beririsan pada hari & masa berlaku yang sama.
  constraint weekly_schedules_no_overlap exclude using gist (
    owner_id with =,
    weekday with =,
    public.timerange(start_time, end_time, '[)') with &&,
    daterange(effective_from, effective_until, '[]') with &&
  )
);

create index weekly_schedules_semester_idx on public.weekly_schedules (semester_id);
create index weekly_schedules_class_idx on public.weekly_schedules (class_id, academic_year_id);
