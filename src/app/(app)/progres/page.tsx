import { ChartColumn, ClipboardList, FileBarChart, Users } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ClassProgressList } from "@/components/dashboard/class-progress-list";
import { PageHeader } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/skeleton";
import { midtermSegmentLabel, semesterLabel } from "@/lib/domain/labels";
import { getRequestContext } from "@/lib/server/request-context";
import { getProgressOverview } from "@/lib/services/progress";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Progres" };

export default function ProgresPage() {
  return (
    <Suspense fallback={<PageSkeleton label="Memuat progres…" />}>
      <ProgresContent />
    </Suspense>
  );
}

async function ProgresContent() {
  const { repo, app } = await getRequestContext();
  const classes = await getProgressOverview(repo, app);
  const semester = app.selectedSemester ? semesterLabel(app.selectedSemester.number) : "";

  return (
    <>
      <PageHeader
        ctx={app}
        title="Progres"
        subtitle={`Progres pelaksanaan materi per kelas · ${semester}`}
      />
      <div className="space-y-6">
        <div className="flex justify-end">
          <ButtonLink href="/progres/laporan" variant="secondary" size="sm">
            <FileBarChart aria-hidden className="size-4" /> Laporan & Ekspor
          </ButtonLink>
        </div>
        <Card aria-labelledby="ringkasan-progres">
          <CardHeader
            icon={ChartColumn}
            title="Semua Kelas"
            titleId="ringkasan-progres"
            subtitle="Pertemuan selesai ÷ pertemuan direncanakan. Ini bukan nilai atau kemampuan siswa."
          />
          {classes.length > 0 ? (
            <ClassProgressList items={classes} />
          ) : (
            <EmptyState icon={Users} title="Belum ada kelas. Tambah kelas pertama Anda." />
          )}
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          {classes.map((c) => (
            <Card key={c.classId} as="article" aria-labelledby={`kelas-${c.classId}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id={`kelas-${c.classId}`} className="text-xl font-bold text-ink">
                  Kelas {c.classLabel}
                </h2>
                <ButtonLink href={`/progres/${c.classId}`} variant="secondary" size="sm">
                  <ClipboardList aria-hidden className="size-4" /> Kelola rencana
                </ButtonLink>
              </div>
              <p className="mb-4 text-sm text-ink-muted">
                {c.progress.kind === "planned"
                  ? `${c.progress.completed} dari ${c.progress.planned} pertemuan selesai (${c.progress.percent}%)`
                  : "Belum ada rencana"}
              </p>
              {c.topics.length > 0 ? (
                <ol className="space-y-2">
                  {c.topics.map((t, i) => {
                    const done = t.completedSessions >= t.plannedSessions;
                    return (
                      <li key={t.planId} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
                        <span
                          className={cn(
                            "grid size-8 shrink-0 place-items-center rounded-lg text-sm font-bold",
                            done ? "bg-mint-soft text-mint-strong" : "bg-primary-softer text-ink-muted",
                          )}
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-ink">{t.title}</p>
                          <p className="text-sm text-ink-muted">
                            {t.midtermSegment ? midtermSegmentLabel(t.midtermSegment) : "Tanpa penanda UTS/PTS"}
                            {t.materialTitle ? " · ada file materi" : ""}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-ink tabular-nums">
                          {t.completedSessions}/{t.plannedSessions}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <EmptyState
                  icon={ChartColumn}
                  title="Belum ada rencana materi"
                  description="Tekan Kelola rencana untuk menambah topik dan jumlah pertemuan."
                  className="py-6"
                />
              )}
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
