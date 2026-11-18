-- Rollback DARURAT migration 20261119200000_fase_d_tahun_ajaran (bukan migration).
-- Hanya menghapus dua fungsi RPC; tidak ada data yang dihapus. Satu transaksi.
begin;

drop function if exists public.activate_archived_year(uuid);
drop function if exists public.start_new_academic_year(jsonb);

do $$
begin
  if to_regclass('supabase_migrations.schema_migrations') is not null then
    delete from supabase_migrations.schema_migrations where version = '20261119200000';
  end if;
end
$$;

commit;
