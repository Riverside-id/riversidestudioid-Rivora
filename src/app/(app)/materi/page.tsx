import { Archive, BookOpen, FileText, Link2, Presentation, StickyNote, Video } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ArchivedMaterials, type ArchivedMaterialItem } from "@/components/arsip/archived-materials";
import { InlineAddPanel } from "@/components/jadwal/inline-add-panel";
import { PageHeader } from "@/components/layout/page-header";
import { AddMaterialPanel } from "@/components/materi/add-material-panel";
import { MaterialOpenLink } from "@/components/materi/material-open-link";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { EmptyState } from "@/components/ui/empty-state";
import { FormMessage } from "@/components/ui/form-message";
import { PhaseNote } from "@/components/ui/phase-note";
import { PageSkeleton } from "@/components/ui/skeleton";
import { MATERIAL_KIND_LABEL } from "@/lib/domain/labels";
import type { MaterialKind } from "@/lib/domain/types";
import { formatFileSize } from "@/lib/materials/file-rules";
import { linkHost } from "@/lib/materials/link-rules";
import { getRequestContext } from "@/lib/server/request-context";
import { getMaterialsOverview } from "@/lib/services/materials";
import { readSupabaseEnv } from "@/lib/supabase/env";
import { archiveMaterialAction } from "./actions";

export const metadata: Metadata = { title: "Materi" };

const ARCHIVED_ON = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });

const KIND_ICON: Record<MaterialKind, typeof FileText> = {
  pdf: FileText,
  doc: FileText,
  docx: FileText,
  ppt: Presentation,
  pptx: Presentation,
  video: Video,
  link: Link2,
  note: StickyNote,
};

/** Pesan setelah gagal membuka file (dari /materi/[id]/berkas). */
const FILE_NOTICE: Record<string, string> = {
  demo: "Mode demo: file contoh tidak tersedia untuk dibuka.",
  hilang: "File materi tidak ditemukan. Unggah ulang materinya.",
  gagal: "File belum bisa dibuka. Periksa koneksi internet Anda, lalu coba lagi.",
};

export default function MateriPage({ searchParams }: PageProps<"/materi">) {
  return (
    <Suspense fallback={<PageSkeleton label="Memuat materi…" />}>
      <MateriContent searchParams={searchParams} />
    </Suspense>
  );
}

async function MateriContent({ searchParams }: { searchParams: PageProps<"/materi">["searchParams"] }) {
  const [{ repo, app, isDemo }, params] = await Promise.all([getRequestContext(), searchParams]);
  const [materials, archivedMaterials] = await Promise.all([getMaterialsOverview(repo, app), repo.listArchivedMaterials()]);
  const archived: ArchivedMaterialItem[] = archivedMaterials.map((m) => ({
    id: m.id,
    title: m.title,
    kind: m.kind,
    topic: m.topic,
    gradeLevel: m.gradeLevel,
    fileSize: m.fileSize,
    filePath: m.filePath,
    externalUrl: m.externalUrl,
    archivedOn: m.archivedAt ? ARCHIVED_ON.format(new Date(m.archivedAt)) : "",
  }));
  const supabaseEnv = isDemo ? null : readSupabaseEnv();
  const canEdit = Boolean(supabaseEnv);
  const notice = typeof params.berkas === "string" ? FILE_NOTICE[params.berkas] : undefined;

  return (
    <>
      <PageHeader
        ctx={app}
        title="Materi"
        subtitle="Bank materi Matematika pribadi Anda — satu file bisa dipakai di banyak kelas."
      />
      <div className="space-y-5">
        <PhaseNote>
          {isDemo
            ? "Mode demo: data contoh tidak bisa diubah. Hubungkan Supabase untuk mengunggah materi."
            : "Tambah file PDF/Word/PowerPoint, tautan video atau referensi, atau catatan teks. Semua materi hanya bisa dibuka oleh Anda."}
        </PhaseNote>

        {notice ? <FormMessage state={{ status: "error", message: notice }} /> : null}

        <InlineAddPanel label="Tambah Materi" disabledReason={canEdit ? undefined : "Mode demo: unggah materi tidak disimpan."}>
          {supabaseEnv ? <AddMaterialPanel supabaseUrl={supabaseEnv.url} publishableKey={supabaseEnv.publishableKey} /> : null}
        </InlineAddPanel>

        {materials.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {materials.map((m) => {
              const Icon = KIND_ICON[m.kind];
              const meta = [
                MATERIAL_KIND_LABEL[m.kind],
                m.fileSize ? formatFileSize(m.fileSize) : null,
                `Kelas ${m.gradeLevel ?? "–"}`,
                m.topic,
              ].filter(Boolean);
              return (
                <li key={m.id}>
                  <Card as="article" className="flex h-full flex-col">
                    <div className="flex items-start gap-3.5">
                      <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-xl bg-violet-soft text-violet">
                        <Icon className="size-6" />
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-[17px] leading-snug font-bold break-words text-ink">{m.title}</h2>
                        <p className="mt-1 text-sm text-ink-muted">{meta.join(" · ")}</p>
                      </div>
                    </div>
                    {m.description ? <p className="mt-3 text-[15px] text-ink-muted">{m.description}</p> : null}
                    <p className="mt-4 text-sm text-ink">
                      {m.usedInClasses.length > 0 ? (
                        <>
                          Dipakai di:{" "}
                          {m.usedInClasses.map((c) => (
                            <span key={c} className="mr-1.5 inline-flex rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary-strong">
                              {c}
                            </span>
                          ))}
                        </>
                      ) : (
                        <span className="text-ink-muted">Belum dipakai di rencana semester ini</span>
                      )}
                    </p>

                    {m.externalUrl ? <p className="mt-1 truncate text-sm text-ink-muted">{linkHost(m.externalUrl)}</p> : null}
                    <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                        <MaterialOpenLink material={m} />
                        {canEdit ? (
                          <ConfirmAction
                            trigger={
                              <>
                                <Archive aria-hidden className="size-4" /> Arsipkan
                              </>
                            }
                            triggerLabel={`Arsipkan materi ${m.title}`}
                            triggerClassName={buttonClass("ghost", "sm")}
                            title="Arsipkan materi ini?"
                            description={
                              <>
                                <strong>{m.title}</strong> tidak tampil lagi di Bank Materi. Isinya tetap tersimpan dan
                                bisa dibuka atau dipulihkan dari bagian Materi Diarsipkan.
                              </>
                            }
                            confirmLabel="Arsipkan"
                            action={archiveMaterialAction}
                            fields={{ materialId: m.id }}
                            tone="primary"
                          />
                        ) : null}
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="Belum ada materi. Tambah materi pertama Anda."
            description="Unggah PDF, Word (DOC/DOCX), atau PowerPoint (PPT/PPTX)."
          />
        )}

        {archived.length > 0 ? (
          <Card aria-labelledby="materi-arsip">
            <details>
              <summary className="flex cursor-pointer list-none items-center gap-2 text-lg font-bold text-ink [&::-webkit-details-marker]:hidden">
                <Archive aria-hidden className="size-5 text-ink-muted" />
                <span id="materi-arsip">Materi Diarsipkan ({archived.length})</span>
                <span className="ml-auto text-sm font-semibold text-primary-strong">Lihat</span>
              </summary>
              <p className="mt-2 text-sm text-ink-muted">
                File tetap tersimpan dan bisa dibuka. Pulihkan untuk menampilkannya lagi di Bank Materi.
              </p>
              <div className="mt-4">
                <ArchivedMaterials items={archived} canRestore={canEdit} />
              </div>
            </details>
          </Card>
        ) : null}
      </div>
    </>
  );
}
