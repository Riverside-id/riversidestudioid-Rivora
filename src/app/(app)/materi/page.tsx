import { Archive, BookOpen, Download, ExternalLink, FileText, Link2, Presentation, StickyNote, Video } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { InlineAddPanel } from "@/components/jadwal/inline-add-panel";
import { PageHeader } from "@/components/layout/page-header";
import { UploadMaterialForm } from "@/components/materi/upload-material-form";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { EmptyState } from "@/components/ui/empty-state";
import { FormMessage } from "@/components/ui/form-message";
import { PhaseNote } from "@/components/ui/phase-note";
import { PageSkeleton } from "@/components/ui/skeleton";
import { MATERIAL_KIND_LABEL } from "@/lib/domain/labels";
import type { MaterialKind } from "@/lib/domain/types";
import { formatFileSize, isMaterialFileKind, opensInBrowser } from "@/lib/materials/file-rules";
import { getRequestContext } from "@/lib/server/request-context";
import { getMaterialsOverview } from "@/lib/services/materials";
import { readSupabaseEnv } from "@/lib/supabase/env";
import { archiveMaterialAction } from "./actions";

export const metadata: Metadata = { title: "Materi" };

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
  const materials = await getMaterialsOverview(repo, app);
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
            : "Unggah PDF, Word (DOC/DOCX), atau PowerPoint (PPT/PPTX), maksimal 10 MB per file. File hanya bisa dibuka oleh Anda. Tautan video, catatan, dan rencana per kelas dibangun berikutnya di Fase C."}
        </PhaseNote>

        {notice ? <FormMessage state={{ status: "error", message: notice }} /> : null}

        <InlineAddPanel label="Tambah Materi" disabledReason={canEdit ? undefined : "Mode demo: unggah materi tidak disimpan."}>
          {supabaseEnv ? <UploadMaterialForm supabaseUrl={supabaseEnv.url} publishableKey={supabaseEnv.publishableKey} /> : null}
        </InlineAddPanel>

        {materials.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {materials.map((m) => {
              const Icon = KIND_ICON[m.kind];
              const isFile = isMaterialFileKind(m.kind) && Boolean(m.filePath);
              const inBrowser = isMaterialFileKind(m.kind) && opensInBrowser(m.kind);
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

                    {isFile ? (
                      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                        <a
                          href={`/materi/${m.id}/berkas`}
                          target={inBrowser ? "_blank" : undefined}
                          rel={inBrowser ? "noopener noreferrer" : undefined}
                          aria-label={`${inBrowser ? "Buka" : "Unduh"} materi ${m.title}`}
                          className={buttonClass("secondary", "sm")}
                        >
                          {inBrowser ? <ExternalLink aria-hidden className="size-4" /> : <Download aria-hidden className="size-4" />}
                          {inBrowser ? "Buka PDF" : "Unduh"}
                        </a>
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
                                <strong>{m.title}</strong> tidak tampil lagi di Bank Materi. File tetap tersimpan dan
                                tetap bisa dibuka dari arsip.
                              </>
                            }
                            confirmLabel="Arsipkan"
                            action={archiveMaterialAction}
                            fields={{ materialId: m.id }}
                            tone="primary"
                          />
                        ) : null}
                      </div>
                    ) : null}
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
      </div>
    </>
  );
}
