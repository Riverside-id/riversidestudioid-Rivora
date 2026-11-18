-- Rivora — cek kondisi database Cloud (HANYA MEMBACA). Jalankan di SQL Editor; aman diulang kapan saja.
select 'A. tipe Rivora (harus 2)' as cek,
       coalesce(string_agg(t.typname, ', ' order by t.typname), 'tidak ada') as hasil
  from pg_type t join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public' and t.typname in ('academic_year_status', 'timerange')
union all
select 'B. tabel public + RLS',
       coalesce(string_agg(c.relname || case when c.relrowsecurity then ' (RLS aktif)' else ' (RLS MATI)' end, ', ' order by c.relname), 'tidak ada')
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p')
union all
select 'C. fungsi public', coalesce(string_agg(p.proname, ', ' order by p.proname), 'tidak ada')
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
union all
select 'D. jumlah policy public (harus 17)', count(*)::text from pg_policies where schemaname = 'public'
union all
select 'E. trigger di auth.users', coalesce(string_agg(tgname, ', '), 'tidak ada')
  from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal
union all
select 'F. hak anon (harus: tidak ada)', coalesce(string_agg(c.relname || ':' || p, ', '), 'tidak ada')
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  cross join unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE']) p
  where n.nspname = 'public' and c.relkind = 'r' and has_table_privilege('anon', c.oid, p)
union all
select 'G. riwayat migration',
       case when to_regclass('supabase_migrations.schema_migrations') is null then 'tabel riwayat belum ada'
            else coalesce((xpath('/row/v/text()', query_to_xml(
              'select string_agg(version || '' '' || coalesce(name, ''''), '', '' order by version) as v from supabase_migrations.schema_migrations',
              false, true, '')))[1]::text, 'kosong') end
union all
select 'H. jumlah profil / akun',
       case when to_regclass('public.profiles') is null then 'tabel profiles belum ada'
            else (xpath('/row/v/text()', query_to_xml('select count(*)::text as v from public.profiles', false, true, '')))[1]::text end
       || ' / ' || (select count(*) from auth.users)::text;
