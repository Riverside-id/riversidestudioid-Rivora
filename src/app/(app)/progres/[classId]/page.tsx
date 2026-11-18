import { ArrowLeft, ClipboardList, History, Lightbulb } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { InlineAddPanel } from "@/components/jadwal/inline-add-panel";
import { PageHeader } from "@/components/layout/page-header";
import { LessonPlanForm } from "@/components/rencana/lesson-plan-form";
import { LessonPlanItem } from "@/components/rencana/lesson-plan-item";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PhaseNote } from "@/components/ui/phase-note";
import { ProgressBar } from "@/components/ui/progress-bar";
import { PageSkeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatShortDate, formatTimeRange } from "@/lib/date";
import { DEFAULT_MIDTERM_TERM, semesterLabel } from "@/lib/domain/labels";
import { getRequestContext } from "@/lib/server/request-context";
import { getClassPlanPage } from "@/lib/services/class-plan";

export const metadata: Metadata = { title: "Rencana Materi" };

export default function ClassPlanPage({ params }: PageProps<"/progres/[classId]">) {
  return (
    <Suspense fallback={<PageSkeleton label="Memuat rencana materi…" />}>
      <ClassPlanContent params={params} />
    </Suspense>
  );
}

async function ClassPlanContent({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  const { repo, app, isDemo } = await getRequestContext();
  const page = await getClassPlanPage(repo, app, decodeURIComponent(classId));
  if (!page) notFound();

  const { cls, archived, plans, progress, next, materials, history } = page;
  const semester = app.selectedSemester ? semesterLabel(app.selectedSemester.number) : "";
  const lockedReason = isDemo
    ? "Mode demo: rencana contoh tidak bisa diubah."
    : archived
      ? "Kelas ini diarsipkan: riwayat bisa dibaca. Pulihkan lewat Jadwal → Kelas Diarsipkan untuk mengubah rencana."
      : app.activeYear?.status === "archived"
        ? "Tahun ajaran ini diarsipkan (baca-saja)."
        : undefined;
  const canEdit = !lockedReason;

  return (
    <>
      <PageHeader
        ctx={app}
        title={`Rencana Kelas ${cls.displayName}`}
        subtitle={`Matematika · ${semester}${archived ? " · diarsipkan" : ""}`}
      />
      <div className="max-w-4xl space-y-5">
        <ButtonLink href="/progres" variant="ghost" size="sm" className="-ml-2">
          <ArrowLeft aria-hidden className="size-4" /> Kembali ke Progres
        </ButtonLink>

        <Card aria-labelledby="ringkas-kelas">
          <h2 id="ringkas-kelas" className="sr-only">
            Ringkasan progres
          </h2>
          {progress.kind === "planned" ? (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-semibold text-ink">
                  {progress.completed} dari {progress.planned} pertemuan selesai
                </p>
                <p className="text-2xl font-extrabold text-ink tabular-nums">{progress.percent}%</p>
              </div>
              <ProgressBar
                value={progress.percent}
                label={`Progres Kelas ${cls.displayName}`}
                valueText={`${progress.completed} dari ${progress.planned} pertemuan selesai`}
                className="mt-3"
              />
              <p className="mt-2 text-sm text-ink-muted">Progres pelaksanaan materi, bukan nilai atau kemampuan siswa.</p>
            </>
          ) : (
            <p className="font-semibold text-ink">Belum ada rencana</p>
          )}
          {next ? (
            <p className="mt-4 flex items-start gap-2 rounded-2xl bg-mint-soft/60 px-4 py-3 text-[15px] text-ink">
              <Lightbulb aria-hidden className="mt-0.5 size-5 shrink-0 text-mint-strong" />
              <span>
                Materi berikutnya: <strong>{next.title}</strong> (pertemuan {next.sessionNumber} dari {next.plannedSessions})
              </span>
            </p>
          ) : progress.kind === "planned" ? (
            <p className="mt-4 text-[15px] text-mint-strong">Semua topik rencana semester ini sudah selesai.</p>
          ) : null}
        </Card>

        <Card aria-labelledby="daftar-rencana">
          <CardHeader
            icon={ClipboardList}
            title="Urutan Topik"
            titleId="daftar-rencana"
            subtitle="Atur urutan, jumlah pertemuan, penanda UTS/PTS, dan file materi. Rencana kelas lain tidak terpengaruh."
          />
          {plans.length > 0 ? (
            <ol className="space-y-2.5">
              {plans.map((p, i) => (
                <LessonPlanItem
                  key={p.id}
                  plan={p}
                  index={i}
                  isFirst={i === 0}
                  isLast={i === plans.length - 1}
                  canEdit={canEdit}
                  materials={materials}
                  midtermTerm={DEFAULT_MIDTERM_TERM}
                />
              ))}
            </ol>
          ) : (
            <EmptyState
              icon={ClipboardList}
              title="Belum ada rencana materi"
              description="Tambahkan topik berurutan, contoh: Mengenal Bilangan 1–10 — 3 pertemuan."
              className="py-6"
            />
          )}
          <InlineAddPanel label="Tambah Topik" disabledReason={lockedReason} className="mt-4">
            <p className="mb-3 pr-8 font-semibold text-ink">Tambah topik</p>
            <LessonPlanForm mode="create" classId={cls.id} materials={materials} midtermTerm={DEFAULT_MIDTERM_TERM} />
          </InlineAddPanel>
          {plans.some((p) => p.hasRecords) && canEdit ? (
            <div className="mt-4">
              <PhaseNote>
                Topik yang sudah punya catatan pertemuan tidak bisa dihapus agar riwayat tetap utuh — ubah judul atau
                jumlah pertemuannya saja.
              </PhaseNote>
            </div>
          ) : null}
        </Card>

        <Card aria-labelledby="riwayat-kelas">
          <CardHeader
            icon={History}
            title="Riwayat Mengajar"
            titleId="riwayat-kelas"
            subtitle={`Pertemuan Kelas ${cls.displayName} yang sudah dicatat di ${semester}.`}
          />
          {history.length > 0 ? (
            <ul className="space-y-2.5">
              {history.map((h) => (
                <li key={`${h.sessionId}-${h.date}`}>
                  <Link
                    href={`/jadwal/${encodeURIComponent(h.sessionId)}`}
                    className="block rounded-2xl border border-line p-3 transition-colors hover:border-primary/35 hover:bg-primary-softer/50"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-ink">
                        {formatShortDate(h.date)}
                        {h.startTime && h.endTime ? (
                          <span className="font-normal text-ink-muted"> · {formatTimeRange(h.startTime, h.endTime)}</span>
                        ) : null}
                        {h.isReplacement ? <span className="font-normal text-ink-muted"> · pengganti</span> : null}
                      </p>
                      <StatusBadge status={h.status} />
                    </div>
                    <p className="mt-1 text-[15px] text-ink">{h.topic ?? "Tanpa topik rencana"}</p>
                    {h.summary ? <p className="mt-1 text-sm text-ink-muted">{h.summary}</p> : null}
                    {h.notes ? <p className="mt-1 text-sm text-ink-muted">Catatan: {h.notes}</p> : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={History}
              title="Belum ada pertemuan yang dicatat"
              description="Buka sesi di Jadwal, lalu tekan Tandai Selesai, Tunda, atau Batal."
              className="py-6"
            />
          )}
        </Card>
      </div>
    </>
  );
}
