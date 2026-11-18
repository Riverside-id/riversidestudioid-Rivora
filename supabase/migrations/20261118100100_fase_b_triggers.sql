-- =====================================================================================
-- Rivora Fase B — trigger: updated_at, profil otomatis, validasi periode, arsip baca-saja
-- Kode SQLSTATE khusus Rivora (dipetakan ke pesan UI berbahasa Indonesia):
--   RV001 = tahun ajaran diarsipkan (baca-saja)
--   RV002 = pengaturan awal sudah selesai
--   RV003 = tanggal di luar periode induk
--   RV004 = kelas sudah diarsipkan
-- =====================================================================================

-- updated_at ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger academic_years_set_updated_at before update on public.academic_years
  for each row execute function public.set_updated_at();
create trigger semesters_set_updated_at before update on public.semesters
  for each row execute function public.set_updated_at();
create trigger teaching_classes_set_updated_at before update on public.teaching_classes
  for each row execute function public.set_updated_at();
create trigger weekly_schedules_set_updated_at before update on public.weekly_schedules
  for each row execute function public.set_updated_at();

-- Profil otomatis saat guru mendaftar ---------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  v_name := left(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 40);
  if char_length(v_name) < 2 then
    v_name := left(split_part(coalesce(new.email, ''), '@', 1), 40);
  end if;
  if char_length(v_name) < 2 then
    v_name := 'Guru';
  end if;

  insert into public.profiles (user_id, display_name)
  values (new.id, v_name)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Tahun ajaran: semester tetap berada di dalam rentang saat tanggal tahun diubah ------------
create function public.validate_academic_year()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and (new.start_date <> old.start_date or new.end_date <> old.end_date)
     and exists (
       select 1 from public.semesters s
       where s.academic_year_id = new.id
         and (s.start_date < new.start_date or s.end_date > new.end_date)
     ) then
    raise exception 'Tanggal tahun ajaran harus mencakup semua semester di dalamnya.'
      using errcode = 'RV003';
  end if;
  return new;
end;
$$;

create trigger academic_years_validate before update on public.academic_years
  for each row execute function public.validate_academic_year();

-- Semester: di dalam tahun ajaran, berurutan, tidak tumpang tindih -----------------------
create function public.validate_semester()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_year_start date;
  v_year_end date;
begin
  select start_date, end_date into v_year_start, v_year_end
  from public.academic_years where id = new.academic_year_id;

  if new.start_date < v_year_start or new.end_date > v_year_end then
    raise exception 'Tanggal semester harus berada di dalam tahun ajaran.' using errcode = 'RV003';
  end if;

  if exists (
    select 1 from public.semesters s
    where s.academic_year_id = new.academic_year_id
      and s.id <> new.id
      and (
        (s.number < new.number and s.end_date >= new.start_date)
        or (s.number > new.number and s.start_date <= new.end_date)
      )
  ) then
    raise exception 'Semester 1 harus berakhir sebelum Semester 2 dimulai.' using errcode = 'RV003';
  end if;

  if tg_op = 'UPDATE' and exists (
    select 1 from public.weekly_schedules w
    where w.semester_id = new.id
      and (w.effective_from < new.start_date or coalesce(w.effective_until, new.end_date) > new.end_date)
  ) then
    raise exception 'Masih ada jadwal di luar tanggal semester yang baru.' using errcode = 'RV003';
  end if;

  return new;
end;
$$;

create trigger semesters_validate before insert or update on public.semesters
  for each row execute function public.validate_semester();

-- Jadwal: masa berlaku di dalam semester, kelas belum diarsipkan --------------------------
create function public.validate_weekly_schedule()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_sem_start date;
  v_sem_end date;
begin
  select start_date, end_date into v_sem_start, v_sem_end
  from public.semesters where id = new.semester_id;

  if new.effective_from < v_sem_start or coalesce(new.effective_until, v_sem_end) > v_sem_end then
    raise exception 'Masa berlaku jadwal harus berada di dalam semester.' using errcode = 'RV003';
  end if;

  if exists (select 1 from public.teaching_classes c where c.id = new.class_id and c.archived_at is not null) then
    raise exception 'Kelas ini sudah diarsipkan.' using errcode = 'RV004';
  end if;

  return new;
end;
$$;

create trigger weekly_schedules_validate before insert or update on public.weekly_schedules
  for each row execute function public.validate_weekly_schedule();

-- Arsip baca-saja (PRD §9: ditegakkan di aplikasi DAN database) ---------------------------
create function public.prevent_archived_year_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_year_id uuid;
begin
  -- Perubahan berantai dari sistem (mis. hapus akun → ON DELETE CASCADE / SET NULL) berjalan
  -- di dalam trigger referential integrity (kedalaman > 1) dan tidak diblokir. Perubahan
  -- langsung oleh guru selalu berada di kedalaman 1.
  if pg_trigger_depth() > 1 then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_table_name = 'academic_years' then
    if tg_op = 'DELETE' then
      if old.status = 'archived' then
        raise exception 'Tahun ajaran yang diarsipkan tidak bisa dihapus.' using errcode = 'RV001';
      end if;
      return old;
    end if;
    -- Saat diarsipkan, hanya perubahan status (pulihkan) yang diizinkan.
    if old.status = 'archived'
       and (new.label, new.start_date, new.end_date, new.active_semester_id, new.owner_id)
           is distinct from (old.label, old.start_date, old.end_date, old.active_semester_id, old.owner_id) then
      raise exception 'Tahun ajaran sudah diarsipkan dan hanya bisa dibaca.' using errcode = 'RV001';
    end if;
    return new;
  end if;

  -- Tabel anak: semesters, teaching_classes, weekly_schedules (semuanya punya academic_year_id).
  if tg_op in ('UPDATE', 'DELETE') then
    v_year_id := old.academic_year_id;
    if exists (select 1 from public.academic_years y where y.id = v_year_id and y.status = 'archived') then
      raise exception 'Tahun ajaran sudah diarsipkan dan hanya bisa dibaca.' using errcode = 'RV001';
    end if;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    v_year_id := new.academic_year_id;
    if exists (select 1 from public.academic_years y where y.id = v_year_id and y.status = 'archived') then
      raise exception 'Tahun ajaran sudah diarsipkan dan hanya bisa dibaca.' using errcode = 'RV001';
    end if;
    return new;
  end if;
  return old;
end;
$$;

create trigger academic_years_archive_guard before update or delete on public.academic_years
  for each row execute function public.prevent_archived_year_changes();
create trigger semesters_archive_guard before insert or update or delete on public.semesters
  for each row execute function public.prevent_archived_year_changes();
create trigger teaching_classes_archive_guard before insert or update or delete on public.teaching_classes
  for each row execute function public.prevent_archived_year_changes();
create trigger weekly_schedules_archive_guard before insert or update or delete on public.weekly_schedules
  for each row execute function public.prevent_archived_year_changes();
