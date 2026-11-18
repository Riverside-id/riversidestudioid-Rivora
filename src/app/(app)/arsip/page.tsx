import { Archive, Lock } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PhaseNote } from "@/components/ui/phase-note";
import { PageSkeleton } from "@/components/ui/skeleton";
import { formatShortDate } from "@/lib/date";
import { getRequestContext } from "@/lib/server/request-context";
import { getArchiveOverview } from "@/lib/services/archive";

export const metadata: Metadata = { title: "Arsip" };

export default function ArsipPage() {
  return (
    <Suspense fallback={<PageSkeleton label="Memuat arsip…" />}>
      <ArsipContent />
    </Suspense>
  );
}

async function ArsipContent() {
  const { repo, app } = await getRequestContext();
  const archived = await getArchiveOverview(repo);

  return (
    <>
      <PageHeader
        ctx={app}
        showPeriod={false}
        title="Arsip"
        subtitle="Tahun ajaran lama tersimpan utuh dan hanya bisa dibaca."
      />
      <div className="space-y-5">
        <PhaseNote>
          Buka detail, cari, ekspor, arsipkan, dan pulihkan (dengan konfirmasi) dibangun pada Fase D. Arsip
          bukan penghapusan.
        </PhaseNote>
        {archived.length > 0 ? (
          <ul className="grid gap-5 lg:grid-cols-2">
            {archived.map((a) => (
              <li key={a.year.id}>
                <Card as="article">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-bold text-ink">Tahun Ajaran {a.year.label}</h2>
                      <p className="text-sm text-ink-muted">
                        {formatShortDate(a.year.startDate)} – {formatShortDate(a.year.endDate)}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-softer px-3 py-1 text-sm font-semibold text-ink-muted">
                      <Lock aria-hidden className="size-3.5" /> Baca-saja
                    </span>
                  </div>
                  <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
                    {[
                      ["Semester", a.semesterCount],
                      ["Kelas", a.classLabels.length],
                      ["Topik", a.plannedTopics],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl bg-primary-softer px-2 py-3">
                        <dt className="text-sm text-ink-muted">{label}</dt>
                        <dd className="text-2xl font-extrabold text-navy">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-4 text-sm text-ink-muted">Kelas: {a.classLabels.join(", ")}</p>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={Archive}
            title="Belum ada tahun ajaran yang diarsipkan"
            description="Saat tahun ajaran berakhir, arsipkan agar datanya tersimpan sebagai riwayat baca-saja."
          />
        )}
      </div>
    </>
  );
}
