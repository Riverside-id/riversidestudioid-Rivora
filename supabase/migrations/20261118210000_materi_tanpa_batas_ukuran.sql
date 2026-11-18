-- =====================================================================================
-- Rivora — Bank Materi tanpa batas ukuran dari aplikasi (keputusan pemilik, 18 Nov 2026)
-- Menggantikan batas awal 10 MB (PRD §10 "dapat dikonfigurasi").
--
-- Batas yang tersisa hanyalah batas unggah global Supabase project
-- (Dashboard → Storage → Settings; paket Free maks. 50 MB per file).
-- Jenis file (PDF, Word, PowerPoint), kepemilikan folder, dan bucket privat tidak berubah.
-- =====================================================================================

alter table public.teaching_materials drop constraint teaching_materials_file_size_limit;
alter table public.teaching_materials
  add constraint teaching_materials_file_size_positive check (file_size is null or file_size > 0);

-- NULL = bucket tidak punya batas sendiri; yang berlaku batas global project.
update storage.buckets set file_size_limit = null where id = 'materi';
