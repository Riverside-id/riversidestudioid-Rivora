-- =====================================================================================
-- Rivora Tahap 2 — Pergantian tahun ajaran & pemulihan arsip (PRD F09, F10)
--
-- Dua RPC SECURITY INVOKER (RLS tetap berlaku; hanya data milik guru yang login):
--  * start_new_academic_year(payload): dalam SATU transaksi mengarsipkan tahun aktif (data lama tetap
--    utuh & baca-saja), membuat tahun baru + Semester 1/2, lalu opsional menyalin kelas, rencana
--    materi (topik, urutan, jumlah pertemuan, penanda UTS/PTS, file Bank Materi yang sama), dan jadwal
--    mingguan. Catatan pelaksanaan & progres TIDAK disalin.
--  * activate_archived_year(year_id): memulihkan tahun yang diarsipkan menjadi aktif; tahun yang sedang
--    aktif diarsipkan dalam transaksi yang sama sehingga tidak pernah ada dua tahun aktif.
-- Tidak ada tabel baru, tidak ada data yang dihapus.
-- Kode error baru: RV007 tahun tidak ditemukan / bukan arsip milik guru.
-- =====================================================================================

create function public.start_new_academic_year(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_old_year uuid;
  v_new_year uuid;
  v_semester jsonb;
  v_semester_id uuid;
  v_active_semester_id uuid;
  v_copy_classes boolean := coalesce((payload ->> 'copy_classes')::boolean, false);
  v_copy_plans boolean := coalesce((payload ->> 'copy_plans')::boolean, false);
  v_copy_schedules boolean := coalesce((payload ->> 'copy_schedules')::boolean, false);
begin
  if v_uid is null then
    raise exception 'Sesi login tidak ditemukan.' using errcode = '42501';
  end if;

  select id into v_old_year
  from public.academic_years
  where owner_id = v_uid and status = 'active'
  for update;

  -- Arsipkan tahun lama dulu (hanya boleh satu tahun aktif). Datanya tidak dipindah/dihapus.
  if v_old_year is not null then
    update public.academic_years set status = 'archived' where id = v_old_year;
  end if;

  insert into public.academic_years (owner_id, label, start_date, end_date, status)
  values (
    v_uid,
    payload ->> 'label',
    (payload ->> 'start_date')::date,
    (payload ->> 'end_date')::date,
    'active'
  )
  returning id into v_new_year;

  for v_semester in select * from jsonb_array_elements(coalesce(payload -> 'semesters', '[]'::jsonb))
  loop
    insert into public.semesters (owner_id, academic_year_id, number, start_date, end_date, midterm_date)
    values (
      v_uid,
      v_new_year,
      (v_semester ->> 'number')::smallint,
      (v_semester ->> 'start_date')::date,
      (v_semester ->> 'end_date')::date,
      nullif(v_semester ->> 'midterm_date', '')::date
    )
    returning id into v_semester_id;
    if (v_semester ->> 'number')::int = coalesce((payload ->> 'active_semester_number')::int, 1) then
      v_active_semester_id := v_semester_id;
    end if;
  end loop;

  if v_active_semester_id is null then
    raise exception 'Semester aktif tahun ajaran baru tidak ditemukan.' using errcode = '22023';
  end if;
  update public.academic_years set active_semester_id = v_active_semester_id where id = v_new_year;

  if v_old_year is null or not v_copy_classes then
    return v_new_year;
  end if;

  -- Salin kelas aktif (tingkat & rombel sama). Kelas yang diarsipkan tidak ikut.
  insert into public.teaching_classes (owner_id, academic_year_id, subject_code, grade_level, section, display_name)
  select v_uid, v_new_year, c.subject_code, c.grade_level, c.section, c.display_name
  from public.teaching_classes c
  where c.academic_year_id = v_old_year and c.archived_at is null;

  -- Salin rencana materi per kelas & nomor semester. Status/catatan pelaksanaan tidak disalin.
  if v_copy_plans then
    insert into public.class_lesson_plans (
      owner_id, academic_year_id, class_id, semester_id, material_id, title, sort_order, planned_sessions, midterm_segment
    )
    select v_uid, v_new_year, nc.id, ns.id, p.material_id, p.title, p.sort_order, p.planned_sessions, p.midterm_segment
    from public.class_lesson_plans p
    join public.teaching_classes oc on oc.id = p.class_id and oc.archived_at is null
    join public.semesters os on os.id = p.semester_id
    join public.teaching_classes nc
      on nc.academic_year_id = v_new_year and nc.subject_code = oc.subject_code
     and nc.grade_level = oc.grade_level and nc.section = oc.section
    join public.semesters ns on ns.academic_year_id = v_new_year and ns.number = os.number
    where p.academic_year_id = v_old_year;
  end if;

  -- Salin pola jadwal mingguan yang masih berlaku di akhir semester lama (per nomor semester);
  -- masa berlaku = tanggal semester baru.
  if v_copy_schedules then
    insert into public.weekly_schedules (
      owner_id, academic_year_id, class_id, semester_id, weekday, start_time, end_time, effective_from, effective_until
    )
    select v_uid, v_new_year, nc.id, ns.id, w.weekday, w.start_time, w.end_time, ns.start_date, ns.end_date
    from public.weekly_schedules w
    join public.teaching_classes oc on oc.id = w.class_id and oc.archived_at is null
    join public.semesters os on os.id = w.semester_id
    join public.teaching_classes nc
      on nc.academic_year_id = v_new_year and nc.subject_code = oc.subject_code
     and nc.grade_level = oc.grade_level and nc.section = oc.section
    join public.semesters ns on ns.academic_year_id = v_new_year and ns.number = os.number
    where w.academic_year_id = v_old_year
      and (w.effective_until is null or w.effective_until >= os.end_date);
  end if;

  return v_new_year;
end;
$$;

create function public.activate_archived_year(year_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_target public.academic_years%rowtype;
begin
  if v_uid is null then
    raise exception 'Sesi login tidak ditemukan.' using errcode = '42501';
  end if;

  select * into v_target
  from public.academic_years
  where id = year_id and owner_id = v_uid
  for update;

  if not found or v_target.status <> 'archived' then
    raise exception 'Tahun ajaran arsip tidak ditemukan.' using errcode = 'RV007';
  end if;

  -- Tahun yang sedang aktif diarsipkan dulu (datanya utuh & baca-saja), lalu target diaktifkan.
  update public.academic_years set status = 'archived' where owner_id = v_uid and status = 'active';
  update public.academic_years set status = 'active' where id = year_id;
end;
$$;

revoke all on function public.start_new_academic_year(jsonb) from public, anon;
revoke all on function public.activate_archived_year(uuid) from public, anon;
grant execute on function public.start_new_academic_year(jsonb) to authenticated;
grant execute on function public.activate_archived_year(uuid) to authenticated;
