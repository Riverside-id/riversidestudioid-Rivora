import { BookOpen, FileText, Link2, Plus, Presentation, StickyNote, Video } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PhaseNote } from "@/components/ui/phase-note";
import { PageSkeleton } from "@/components/ui/skeleton";
import { MATERIAL_KIND_LABEL } from "@/lib/domain/labels";
import type { MaterialKind } from "@/lib/domain/types";
import { getRequestContext } from "@/lib/server/request-context";
import { getMaterialsOverview } from "@/lib/services/materials";

export const metadata: Metadata = { title: "Materi" };

const KIND_ICON: Record<MaterialKind, typeof FileText> = {
  pdf: FileText,
  ppt: Presentation,
  pptx: Presentation,
  video: Video,
  link: Link2,
  note: StickyNote,
};

export default function MateriPage() {
  return (
    <Suspense fallback={<PageSkeleton label="Memuat materi…" />}>
      <MateriContent />
    </Suspense>
  );
}

async function MateriContent() {
  const { repo, app } = await getRequestContext();
  const materials = await getMaterialsOverview(repo, app);

  return (
    <>
      <PageHeader
        ctx={app}
        title="Materi"
        subtitle="Bank materi Matematika pribadi Anda — satu file bisa dipakai di banyak kelas."
      />
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PhaseNote>Tampilan baca-saja. Unggah PDF/PPT/PPTX, tautan video, dan catatan dibangun pada Fase C.</PhaseNote>
          <Button disabled title="Tersedia pada Fase C">
            <Plus aria-hidden className="size-5" /> Tambah Materi
          </Button>
        </div>

        {materials.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {materials.map((m) => {
              const Icon = KIND_ICON[m.kind];
              return (
                <li key={m.id}>
                  <Card as="article" className="h-full">
                    <div className="flex items-start gap-3.5">
                      <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-xl bg-violet-soft text-violet">
                        <Icon className="size-6" />
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-[17px] leading-snug font-bold text-ink">{m.title}</h2>
                        <p className="mt-1 text-sm text-ink-muted">
                          {MATERIAL_KIND_LABEL[m.kind]} · Kelas {m.gradeLevel ?? "–"} · {m.topic}
                        </p>
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
                  </Card>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="Belum ada materi. Tambah materi pertama Anda."
            description="Materi bisa berupa PDF, PPT/PPTX, tautan video, atau catatan."
          />
        )}
      </div>
    </>
  );
}
