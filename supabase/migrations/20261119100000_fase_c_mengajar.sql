-- =====================================================================================
-- Rivora Fase C — Tahap 1 Fitur Mengajar
-- PRD F04 (sesi pengganti/pengecualian), F06 (rencana materi per kelas), F07 (catatan
-- pelaksanaan + histori status), F08 (progres dari data nyata).
--
-- Prinsip:
--  * Rencana materi milik satu kelas & satu semester; file materi dipakai ulang lewat referensi
--    (tanpa menggandakan file). Rencana yang sudah punya catatan pelaksanaan tidak bisa dihapus.
--  * Satu catatan per kejadian jadwal (jadwal rutin + tanggal) dan satu pengganti per pertemuan
--    yang ditunda → satu pertemuan tidak pernah terhitung dua kali.
--  * Status "Selesai" hanya dari tindakan guru; tidak ada yang mengubah status karena tanggal lewat.
--  * Catatan pelaksanaan tidak dihapus (riwayat); setiap perubahan status dicatat otomatis.
--  * Jam sesi disalin ke catatan sehingga riwayat tetap utuh walau jadwal rutin dihapus.
-- Kode error baru: RV005 pengganti hanya untuk pertemuan ditunda, RV006 rencana beda semester.
-- =====================================================================================

-- Kunci tambahan untuk foreign key komposit (kepemilikan & kecocokan kelas/semester).
alter table public.teaching_materials
  add constraint teaching_materials_id_owner_key unique (id, owner_id);
alter table public.weekly_schedules
  add constraint weekly_schedules_id_class_semester_key unique (id, class_id, semester_id);

-- Rencana materi per kelas & semester (F06) ------------------------------------------------
create table public.class_lesson_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  academic_year_id uuid not null,
  class_id uuid not null,
  semester_id uuid not null,
  material_id uuid,
  title text not null,
  sort_order integer not null default 0,
  planned_sessions smallint not null,
  midterm_segment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_lesson_plans_title_length check (char_length(btrim(title)) between 2 and 120),
  constraint class_lesson_plans_sessions_range check (planned_sessions between 1 and 60),
  constraint class_lesson_plans_sort_nonnegative check (sort_order >= 0),
  constraint class_lesson_plans_midterm_valid check (midterm_segment is null or midterm_segment in ('before', 'after')),
  constraint class_lesson_plans_year_fk foreign key (academic_year_id, owner_id)
    references public.academic_years (id, owner_id) on delete cascade,
  constraint class_lesson_plans_class_fk foreign key (class_id, academic_year_id)
    references public.teaching_classes (id, academic_year_id) on delete cascade,
  constraint class_lesson_plans_semester_fk foreign key (semester_id, academic_year_id)
    references public.semesters (id, academic_year_id) on delete cascade,
  constraint class_lesson_plans_material_fk foreign key (material_id, owner_id)
    references public.teaching_materials (id, owner_id) on delete set null (material_id),
  constraint class_lesson_plans_id_class_key unique (id, class_id)
);

create index class_lesson_plans_class_semester_idx
  on public.class_lesson_plans (class_id, semester_id, sort_order);
create index class_lesson_plans_owner_semester_idx on public.class_lesson_plans (owner_id, semester_id);

-- Catatan pelaksanaan pertemuan (F07) -----------------------------------------------------
create table public.meeting_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  academic_year_id uuid not null,
  class_id uuid not null,
  semester_id uuid not null,
  weekly_schedule_id uuid,
  lesson_plan_id uuid,
  replacement_for_id uuid,
  planned_date date not null,
  actual_date date,
  start_time time not null,
  end_time time not null,
  status text not null default 'scheduled',
  summary text,
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meeting_records_status_valid
    check (status in ('scheduled', 'completed', 'postponed', 'cancelled')),
  constraint meeting_records_time_order check (start_time < end_time),
  constraint meeting_records_summary_length check (summary is null or char_length(summary) <= 1000),
  constraint meeting_records_notes_length check (notes is null or char_length(notes) <= 1000),
  constraint meeting_records_completed_shape
    check (status <> 'completed' or (actual_date is not null and completed_at is not null)),
  constraint meeting_records_replacement_not_routine
    check (replacement_for_id is null or weekly_schedule_id is null),
  constraint meeting_records_year_fk foreign key (academic_year_id, owner_id)
    references public.academic_years (id, owner_id) on delete cascade,
  constraint meeting_records_class_fk foreign key (class_id, academic_year_id)
    references public.teaching_classes (id, academic_year_id) on delete cascade,
  constraint meeting_records_semester_fk foreign key (semester_id, academic_year_id)
    references public.semesters (id, academic_year_id) on delete cascade,
  -- Jadwal rutin dihapus → catatan tetap ada (jam sudah tersalin), tautan jadwal dikosongkan.
  constraint meeting_records_schedule_fk foreign key (weekly_schedule_id, class_id, semester_id)
    references public.weekly_schedules (id, class_id, semester_id) on delete set null (weekly_schedule_id),
  -- Rencana yang sudah dirujuk catatan tidak bisa dihapus (riwayat tidak diam-diam berubah).
  constraint meeting_records_plan_fk foreign key (lesson_plan_id, class_id)
    references public.class_lesson_plans (id, class_id),
  constraint meeting_records_replacement_fk foreign key (replacement_for_id, class_id)
    references public.meeting_records (id, class_id),
  constraint meeting_records_id_class_key unique (id, class_id),
  -- Satu catatan per kejadian jadwal rutin; satu pengganti per pertemuan yang ditunda.
  constraint meeting_records_occurrence_key unique (weekly_schedule_id, planned_date),
  constraint meeting_records_replacement_key unique (replacement_for_id)
);

create index meeting_records_owner_semester_idx on public.meeting_records (owner_id, semester_id, planned_date);
create index meeting_records_class_idx on public.meeting_records (class_id, planned_date);
create index meeting_records_plan_idx on public.meeting_records (lesson_plan_id);

-- Histori perubahan status (F07: "histori perubahan minimum") ------------------------------
create table public.meeting_status_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  meeting_id uuid not null references public.meeting_records (id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_at timestamptz not null default now()
);

create index meeting_status_events_meeting_idx on public.meeting_status_events (meeting_id, changed_at);

-- Trigger --------------------------------------------------------------------------------
create trigger class_lesson_plans_set_updated_at before update on public.class_lesson_plans
  for each row execute function public.set_updated_at();
create trigger meeting_records_set_updated_at before update on public.meeting_records
  for each row execute function public.set_updated_at();

create trigger class_lesson_plans_archive_guard before insert or update or delete on public.class_lesson_plans
  for each row execute function public.prevent_archived_year_changes();
create trigger meeting_records_archive_guard before insert or update or delete on public.meeting_records
  for each row execute function public.prevent_archived_year_changes();

create function public.validate_lesson_plan()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT'
     and exists (select 1 from public.teaching_classes c where c.id = new.class_id and c.archived_at is not null) then
    raise exception 'Kelas ini sudah diarsipkan.' using errcode = 'RV004';
  end if;
  return new;
end;
$$;

create trigger class_lesson_plans_validate before insert or update on public.class_lesson_plans
  for each row execute function public.validate_lesson_plan();

create function public.validate_meeting_record()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_sem_start date;
  v_sem_end date;
  v_weekday smallint;
  v_from date;
  v_until date;
begin
  select start_date, end_date into v_sem_start, v_sem_end
  from public.semesters where id = new.semester_id;
  if new.planned_date < v_sem_start or new.planned_date > v_sem_end then
    raise exception 'Tanggal pertemuan harus berada di dalam semester.' using errcode = 'RV003';
  end if;

  if new.weekly_schedule_id is not null then
    select weekday, effective_from, effective_until into v_weekday, v_from, v_until
    from public.weekly_schedules where id = new.weekly_schedule_id;
    if extract(isodow from new.planned_date)::smallint <> v_weekday
       or new.planned_date < v_from
       or (v_until is not null and new.planned_date > v_until) then
      raise exception 'Tanggal tidak sesuai dengan jadwal rutin kelas ini.' using errcode = 'RV003';
    end if;
  end if;

  if new.lesson_plan_id is not null and not exists (
    select 1 from public.class_lesson_plans p where p.id = new.lesson_plan_id and p.semester_id = new.semester_id
  ) then
    raise exception 'Rencana materi ini bukan untuk semester tersebut.' using errcode = 'RV006';
  end if;

  if new.replacement_for_id is not null
     and (tg_op = 'INSERT' or new.replacement_for_id is distinct from old.replacement_for_id)
     and not exists (
       select 1 from public.meeting_records m where m.id = new.replacement_for_id and m.status = 'postponed'
     ) then
    raise exception 'Jadwal pengganti hanya untuk pertemuan yang ditunda.' using errcode = 'RV005';
  end if;

  if tg_op = 'INSERT'
     and exists (select 1 from public.teaching_classes c where c.id = new.class_id and c.archived_at is not null) then
    raise exception 'Kelas ini sudah diarsipkan.' using errcode = 'RV004';
  end if;

  -- Waktu pencatatan "Selesai" diisi server; tanggal pelaksanaan default = tanggal rencana.
  if new.status = 'completed' then
    new.actual_date := coalesce(new.actual_date, new.planned_date);
    if tg_op = 'INSERT' or old.status is distinct from 'completed' then
      new.completed_at := now();
    end if;
  else
    new.completed_at := null;
  end if;

  return new;
end;
$$;

create trigger meeting_records_validate before insert or update on public.meeting_records
  for each row execute function public.validate_meeting_record();

-- Histori status ditulis oleh database (guru tidak bisa memalsukan/mengubah histori).
create function public.log_meeting_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.meeting_status_events (owner_id, meeting_id, from_status, to_status)
    values (new.owner_id, new.id, case when tg_op = 'UPDATE' then old.status end, new.status);
  end if;
  return null;
end;
$$;

create trigger meeting_records_log_status after insert or update of status on public.meeting_records
  for each row execute function public.log_meeting_status();

revoke all on function public.validate_lesson_plan() from public, anon, authenticated;
revoke all on function public.validate_meeting_record() from public, anon, authenticated;
revoke all on function public.log_meeting_status() from public, anon, authenticated;

-- Hak & RLS ------------------------------------------------------------------------------
alter table public.class_lesson_plans enable row level security;
alter table public.meeting_records enable row level security;
alter table public.meeting_status_events enable row level security;

revoke all on table public.class_lesson_plans from anon, authenticated;
revoke all on table public.meeting_records from anon, authenticated;
revoke all on table public.meeting_status_events from anon, authenticated;

grant select, insert, update, delete on table public.class_lesson_plans to authenticated;
grant select, insert, update on table public.meeting_records to authenticated;
grant select on table public.meeting_status_events to authenticated;

create policy class_lesson_plans_select_own on public.class_lesson_plans
  for select to authenticated using (owner_id = (select auth.uid()));
create policy class_lesson_plans_insert_own on public.class_lesson_plans
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy class_lesson_plans_update_own on public.class_lesson_plans
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy class_lesson_plans_delete_own on public.class_lesson_plans
  for delete to authenticated using (owner_id = (select auth.uid()));

create policy meeting_records_select_own on public.meeting_records
  for select to authenticated using (owner_id = (select auth.uid()));
create policy meeting_records_insert_own on public.meeting_records
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy meeting_records_update_own on public.meeting_records
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy meeting_status_events_select_own on public.meeting_status_events
  for select to authenticated using (owner_id = (select auth.uid()));
