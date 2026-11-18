-- =====================================================================================
-- Rivora Fase C (sebagian) — Bank Materi: unggah file ke Supabase Storage
-- PRD F05 (PDF, PPT/PPTX) + permintaan pemilik 18 Nov 2026 (Word: DOC/DOCX).
--
-- Prinsip:
--  * File privat per guru: bucket "materi" (tidak publik), path "<owner_id>/<uuid>.<ekstensi>".
--    Dibuka lewat signed URL berdurasi pendek, bukan URL publik permanen (PRD §10).
--  * Batas awal 10 MB per file dan daftar tipe MIME ditegakkan oleh bucket (PRD §10).
--  * Materi tidak dihapus permanen dari aplikasi (archived_at) agar arsip tetap utuh (PRD §9);
--    file yang sudah dirujuk materi tidak bisa dihapus dari Storage oleh guru.
-- =====================================================================================

create table public.teaching_materials (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  description text,
  topic text,
  grade_level smallint,
  tags text[] not null default '{}',
  kind text not null,
  file_path text,
  file_name text,
  file_size bigint,
  mime_type text,
  external_url text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teaching_materials_title_length check (char_length(btrim(title)) between 2 and 120),
  constraint teaching_materials_description_length check (description is null or char_length(description) <= 500),
  constraint teaching_materials_topic_length check (topic is null or char_length(btrim(topic)) between 1 and 80),
  constraint teaching_materials_grade_valid check (grade_level is null or grade_level between 1 and 6),
  constraint teaching_materials_tags_limit check (cardinality(tags) <= 10),
  constraint teaching_materials_kind_valid
    check (kind in ('pdf', 'doc', 'docx', 'ppt', 'pptx', 'video', 'link', 'note')),
  -- Materi berupa file: path di folder milik guru sendiri, ekstensi = jenis, nama asli & ukuran wajib.
  constraint teaching_materials_file_shape check (
    kind not in ('pdf', 'doc', 'docx', 'ppt', 'pptx')
    or (file_path is not null and file_name is not null and file_size is not null and external_url is null)
  ),
  constraint teaching_materials_file_path_owner check (
    file_path is null
    or (
      file_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(pdf|doc|docx|ppt|pptx)$'
      and split_part(file_path, '/', 1) = owner_id::text
      and substring(file_path from '\.([a-z]+)$') = kind
    )
  ),
  constraint teaching_materials_file_size_limit check (file_size is null or file_size between 1 and 10485760),
  constraint teaching_materials_file_name_length check (file_name is null or char_length(file_name) between 1 and 200),
  constraint teaching_materials_url_shape check (
    kind not in ('video', 'link') or (external_url ~ '^https?://' and file_path is null)
  ),
  constraint teaching_materials_file_path_key unique (file_path)
);

create index teaching_materials_owner_idx on public.teaching_materials (owner_id, created_at desc)
  where archived_at is null;

create trigger teaching_materials_set_updated_at before update on public.teaching_materials
  for each row execute function public.set_updated_at();

-- Hak & RLS: eksplisit, tidak bergantung pada pengaturan "expose new tables". Tanpa DELETE (arsip).
alter table public.teaching_materials enable row level security;
revoke all on table public.teaching_materials from anon, authenticated;
grant select, insert, update on table public.teaching_materials to authenticated;

create policy teaching_materials_select_own on public.teaching_materials
  for select to authenticated using (owner_id = (select auth.uid()));
create policy teaching_materials_insert_own on public.teaching_materials
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy teaching_materials_update_own on public.teaching_materials
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- Storage: bucket privat "materi" ------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'materi',
  'materi',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Guru hanya bisa membaca/mengunggah di folder miliknya sendiri. Tidak ada UPDATE (tanpa timpa).
create policy rivora_materi_select_own on storage.objects
  for select to authenticated
  using (bucket_id = 'materi' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy rivora_materi_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'materi' and (storage.foldername(name))[1] = (select auth.uid()::text));

-- Hapus hanya file milik sendiri yang BELUM dirujuk materi (membersihkan unggahan gagal).
create policy rivora_materi_delete_unused_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'materi'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and not exists (select 1 from public.teaching_materials m where m.file_path = objects.name)
  );
