import { ArrowLeft, BookOpen, CalendarClock, CircleCheck, CircleSlash } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { sessionLessonText } from "@/components/dashboard/session-row";
import { PageHeader } from "@/components/layout/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PhaseNote } from "@/components/ui/phase-note";
import { PageSkeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatLongDate, formatTimeRange } from "@/lib/date";
import { midtermSegmentLabel } from "@/lib/domain/labels";
import { getRequestContext } from "@/lib/server/request-context";
import { getSessionDetail } from "@/lib/services/schedule";

export const metadata: Metadata = { title: "Detail Sesi" };

export default function SessionPage({ params }: PageProps<"/jadwal/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton label="Memuat sesi…" />}>
      <SessionContent params={params} />
    </Suspense>
  );
}

async function SessionContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { repo, app } = await getRequestContext();
  const session = await getSessionDetail(repo, app, decodeURIComponent(id));
  if (!session) notFound();

  const { title, meta } = sessionLessonText(session);

  return (
    <>
      <PageHeader
        ctx={app}
        showPeriod={false}
        title={`Kelas ${session.classLabel}`}
        subtitle={`${formatLongDate(session.date)} · ${formatTimeRange(session.startTime, session.endTime)}`}
      />
      <div className="max-w-3xl space-y-5">
        <ButtonLink href="/jadwal" variant="ghost" size="sm" className="-ml-2">
          <ArrowLeft aria-hidden className="size-4" /> Kembali ke Jadwal
        </ButtonLink>

        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink-muted">Materi direncanakan</p>
              <p className="mt-1 text-2xl font-bold text-ink">{title}</p>
              <p className="mt-1 text-ink-muted">{meta}</p>
              {session.lesson?.midtermSegment ? (
                <p className="mt-3 inline-flex rounded-full bg-violet-soft px-3 py-1 text-sm font-semibold text-violet-strong">
                  {midtermSegmentLabel(session.lesson.midtermSegment)}
                </p>
              ) : null}
              {session.lesson?.isSuggestion ? (
                <p className="mt-3 text-sm text-ink-muted">
                  Disarankan dari sisa rencana kelas ini. Guru tetap bisa memilih materi lain.
                </p>
              ) : null}
            </div>
            <StatusBadge status={session.status} className="text-sm" />
          </div>

          {session.notes ? (
            <div className="mt-5 rounded-2xl bg-primary-softer p-4">
              <p className="text-sm font-semibold text-ink-muted">Catatan</p>
              <p className="mt-1 text-ink">{session.notes}</p>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3 border-t border-line pt-5">
            <Button variant="secondary" disabled title="Tersedia pada Fase C">
              <BookOpen aria-hidden className="size-5" /> Buka Materi
            </Button>
            <Button disabled title="Tersedia pada Fase C">
              <CircleCheck aria-hidden className="size-5" /> Tandai Selesai
            </Button>
            <Button variant="secondary" disabled title="Tersedia pada Fase C">
              <CalendarClock aria-hidden className="size-5" /> Tunda
            </Button>
            <Button variant="ghost" disabled title="Tersedia pada Fase C">
              <CircleSlash aria-hidden className="size-5" /> Batal
            </Button>
          </div>
        </Card>

        <PhaseNote>
          Tombol pencatatan pelaksanaan (Selesai/Tunda/Batal) dan buka materi aktif pada Fase C. Status
          tidak pernah berubah otomatis karena tanggal lewat.
        </PhaseNote>
      </div>
    </>
  );
}
