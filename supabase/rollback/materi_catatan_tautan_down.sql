-- Rollback DARURAT migration 20261119300000_materi_catatan_tautan (bukan migration).
-- PERINGATAN: menghapus kolom note_body → isi materi berupa catatan teks ikut hilang.
-- Jalankan hanya dengan persetujuan pemilik, setelah backup. Satu transaksi.
begin;

delete from public.teaching_materials where kind = 'note';
alter table public.teaching_materials
  drop constraint if exists teaching_materials_note_shape,
  drop constraint if exists teaching_materials_note_only_for_notes,
  drop constraint if exists teaching_materials_url_length,
  drop constraint if exists teaching_materials_url_only_for_links;
alter table public.teaching_materials drop column if exists note_body;

do $$
begin
  if to_regclass('supabase_migrations.schema_migrations') is not null then
    delete from supabase_migrations.schema_migrations where version = '20261119300000';
  end if;
end
$$;

commit;
