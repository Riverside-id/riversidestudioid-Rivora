-- =====================================================================================
-- Rivora Tahap 3 — Materi berupa catatan teks & tautan (PRD F05)
--
--  * Catatan teks: kolom baru note_body (≤ 20.000 karakter), wajib untuk jenis 'note'.
--  * Tautan video / referensi: external_url hanya http(s) — skema berbahaya (javascript:, data:, file:)
--    ditolak database; panjang ≤ 2.000. Tidak ada file Storage untuk jenis ini.
-- Tidak ada data yang dihapus; constraint baru tidak melanggar data yang ada (belum ada materi tautan/catatan).
-- =====================================================================================

alter table public.teaching_materials add column note_body text;

alter table public.teaching_materials
  add constraint teaching_materials_note_shape check (
    kind <> 'note'
    or (note_body is not null and char_length(btrim(note_body)) between 1 and 20000
        and file_path is null and external_url is null)
  ),
  add constraint teaching_materials_note_only_for_notes check (kind = 'note' or note_body is null),
  add constraint teaching_materials_url_length check (external_url is null or char_length(external_url) <= 2000),
  add constraint teaching_materials_url_only_for_links check (kind in ('video', 'link') or external_url is null);
