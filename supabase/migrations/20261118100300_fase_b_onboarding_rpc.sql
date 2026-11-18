-- =====================================================================================
-- Rivora Fase B — RPC complete_onboarding
-- Menyimpan hasil wizard (profil, tahun ajaran, 2 semester, kelas, jadwal) dalam SATU
-- transaksi. SECURITY INVOKER: semua insert tetap tunduk pada RLS milik guru yang login.
--
-- payload:
-- {
--   "display_name": "Bu Rina", "school_name": "SD …" | null,
--   "academic_year": { "label": "2026/2027", "start_date": "2026-07-01", "end_date": "2027-06-30" },
--   "semesters": [ { "number": 1, "start_date": "…", "end_date": "…", "midterm_date": "…" | null }, … ],
--   "active_semester_number": 1,
--   "classes": [ { "grade_level": 1, "section": "A" }, … ],
--   "schedules": [ { "class_label": "1A", "weekday": 3, "start_time": "10:00", "end_time": "11:00" }, … ]
-- }
-- =====================================================================================

create function public.complete_onboarding(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_year_id uuid;
  v_active_semester_id uuid;
  v_active_start date;
  v_active_end date;
  v_semester jsonb;
  v_semester_id uuid;
  v_class jsonb;
  v_class_id uuid;
  v_class_ids jsonb := '{}'::jsonb;
  v_label text;
  v_schedule jsonb;
begin
  if v_uid is null then
    raise exception 'Sesi login tidak ditemukan.' using errcode = '42501';
  end if;

  if exists (select 1 from public.profiles p where p.user_id = v_uid and p.onboarded_at is not null) then
    raise exception 'Pengaturan awal sudah selesai.' using errcode = 'RV002';
  end if;

  insert into public.profiles (user_id, display_name, school_name, onboarded_at)
  values (
    v_uid,
    btrim(payload ->> 'display_name'),
    nullif(btrim(coalesce(payload ->> 'school_name', '')), ''),
    now()
  )
  on conflict (user_id) do update
    set display_name = excluded.display_name,
        school_name = excluded.school_name,
        onboarded_at = excluded.onboarded_at;

  insert into public.academic_years (owner_id, label, start_date, end_date, status)
  values (
    v_uid,
    payload -> 'academic_year' ->> 'label',
    (payload -> 'academic_year' ->> 'start_date')::date,
    (payload -> 'academic_year' ->> 'end_date')::date,
    'active'
  )
  returning id into v_year_id;

  for v_semester in select * from jsonb_array_elements(coalesce(payload -> 'semesters', '[]'::jsonb))
  loop
    insert into public.semesters (owner_id, academic_year_id, number, start_date, end_date, midterm_date)
    values (
      v_uid,
      v_year_id,
      (v_semester ->> 'number')::smallint,
      (v_semester ->> 'start_date')::date,
      (v_semester ->> 'end_date')::date,
      nullif(v_semester ->> 'midterm_date', '')::date
    )
    returning id into v_semester_id;

    if (v_semester ->> 'number')::int = (payload ->> 'active_semester_number')::int then
      v_active_semester_id := v_semester_id;
      v_active_start := (v_semester ->> 'start_date')::date;
      v_active_end := (v_semester ->> 'end_date')::date;
    end if;
  end loop;

  if v_active_semester_id is null then
    raise exception 'Semester aktif tidak ditemukan pada data wizard.' using errcode = '22023';
  end if;

  update public.academic_years set active_semester_id = v_active_semester_id where id = v_year_id;

  for v_class in select * from jsonb_array_elements(coalesce(payload -> 'classes', '[]'::jsonb))
  loop
    v_label := (v_class ->> 'grade_level') || upper(v_class ->> 'section');
    insert into public.teaching_classes (owner_id, academic_year_id, grade_level, section, display_name)
    values (v_uid, v_year_id, (v_class ->> 'grade_level')::smallint, upper(v_class ->> 'section'), v_label)
    returning id into v_class_id;
    v_class_ids := v_class_ids || jsonb_build_object(v_label, v_class_id);
  end loop;

  for v_schedule in select * from jsonb_array_elements(coalesce(payload -> 'schedules', '[]'::jsonb))
  loop
    v_class_id := (v_class_ids ->> (v_schedule ->> 'class_label'))::uuid;
    if v_class_id is null then
      raise exception 'Jadwal merujuk kelas yang tidak ada: %', v_schedule ->> 'class_label' using errcode = '22023';
    end if;
    insert into public.weekly_schedules (
      owner_id, academic_year_id, class_id, semester_id, weekday, start_time, end_time, effective_from, effective_until
    )
    values (
      v_uid, v_year_id, v_class_id, v_active_semester_id,
      (v_schedule ->> 'weekday')::smallint,
      (v_schedule ->> 'start_time')::time,
      (v_schedule ->> 'end_time')::time,
      v_active_start,
      v_active_end
    );
  end loop;

  return v_year_id;
end;
$$;

revoke all on function public.complete_onboarding(jsonb) from public, anon;
grant execute on function public.complete_onboarding(jsonb) to authenticated;
