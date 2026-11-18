import { ArrowLeft, Lock } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { MaterialOpenLink } from "@/components/materi/material-open-link";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/skeleton";
import { MATERIAL_KIND_LABEL } from "@/lib/domain/labels";
import { formatFileSize } from "@/lib/materials/file-rules";
import { linkHost } from "@/lib/materials/link-rules";
import { getRequestContext } from "@/lib/server/request-context";

export const metadata: Metadata = { title: "Detail Materi" };

export default function MaterialDetailPage({ params }: PageProps<"/materi/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton label="Memuat materi…" />}>
      <MaterialDetail params={params} />
    </Suspense>
  );
}

async function MaterialDetail({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { repo, app }] = await Promise.all([params, getRequestContext()]);
  const [active, archived] = await Promise.all([repo.listMaterials(), repo.listArchivedMaterials()]);
  const material = [...active, ...archived].find((m) => m.id === decodeURIComponent(id));
  if (!material) notFound();

  const meta = [
    MATERIAL_KIND_LABEL[material.kind],
    material.fileSize ? formatFileSize(material.fileSize) : null,
    material.gradeLevel ? `Kelas ${material.gradeLevel}` : null,
    material.topic,
    material.externalUrl ? linkHost(material.externalUrl) : null,
  ].filter(Boolean);

  return (
    <>
      <PageHeader ctx={app} showPeriod={false} title={material.title} subtitle={meta.join(" · ")} />
      <div className="max-w-3xl space-y-5">
        <ButtonLink href="/materi" variant="ghost" size="sm" className="-ml-2">
          <ArrowLeft aria-hidden className="size-4" /> Kembali ke Materi
        </ButtonLink>
        <Card>
          {material.archivedAt ? (
            <p className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-primary-softer px-3 py-1 text-sm font-semibold text-ink-muted">
              <Lock aria-hidden className="size-3.5" /> Diarsipkan — pulihkan dari bagian Materi Diarsipkan
            </p>
          ) : null}
          {material.description ? <p className="text-[15px] text-ink-muted">{material.description}</p> : null}
          {material.noteBody ? (
            <div className="mt-4 rounded-2xl bg-primary-softer p-4">
              <p className="text-[16px] leading-relaxed break-words whitespace-pre-line text-ink">{material.noteBody}</p>
            </div>
          ) : null}
          {material.kind !== "note" ? (
            <div className="mt-5">
              <MaterialOpenLink material={material} size="md" />
            </div>
          ) : null}
        </Card>
      </div>
    </>
  );
}
