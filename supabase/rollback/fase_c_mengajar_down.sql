-- Rollback DARURAT migration 20261119100000_fase_c_mengajar (bukan migration).
-- PERINGATAN: menghapus seluruh rencana materi, catatan pertemuan, dan histori status.
-- Jalankan hanya dengan persetujuan pemilik, setelah backup. Satu transaksi.
begin;

drop table if exists public.meeting_status_events;
drop table if exists public.meeting_records;
drop table if exists public.class_lesson_plans;

drop function if exists public.log_meeting_status();
drop function if exists public.validate_meeting_record();
drop function if exists public.validate_lesson_plan();

alter table public.weekly_schedules drop constraint if exists weekly_schedules_id_class_semester_key;
alter table public.teaching_materials drop constraint if exists teaching_materials_id_owner_key;

do $$
begin
  if to_regclass('supabase_migrations.schema_migrations') is not null then
    delete from supabase_migrations.schema_migrations where version = '20261119100000';
  end if;
end
$$;

commit;
