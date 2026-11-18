import { ArrowLeft, BookOpen, CalendarClock, History } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { sessionLessonText } from "@/components/dashboard/session-row";
import { PageHeader } from "@/components/layout/page-header";
import { MaterialOpenLink, materialOpenTarget } from "@/components/materi/material-open-link";
import { MeetingStatusForm } from "@/components/sesi/meeting-status-form";
import { buttonClass, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PhaseNote } from "@/components/ui/phase-note";
import { PageSkeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatLongDate, formatShortDate, formatTimeRange } from "@/lib/date";
import { MEETING_STATUS_LABEL, midtermSegmentLabel } from "@/lib/domain/labels";
import { getRequestContext } from "@/lib/server/request-context";
import { getSessionPageData } from "@/lib/services/session-detail";

export const metadata: Metadata = { title: "Detail Sesi" };

const TIME_FORMAT = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

export default function SessionPage({ params }: PageProps<"/jadwal/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton label="Memuat sesi…" />}>
      <SessionContent params={params} />
    </Suspense>
  );
}

async function SessionContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { repo, app, isDemo } = await getRequestContext();
  const page = await getSessionPageData(repo, app, decodeURIComponent(id));
  if (!page) notFound();

  const { session, record, plans, material, replacement, replacementFor, events } = page;
  const { title, meta } = sessionLessonText(session);
  const lockedReason = isDemo
    ? "Mode demo: catatan pertemuan tidak disimpan."
    : app.activeYear?.status === "archived"
      ? "Tahun ajaran ini diarsipkan (baca-saja)."
      : null;

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
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-muted">Materi direncanakan</p>
              <p className="mt-1 text-2xl font-bold break-words text-ink">{title}</p>
              <p className="mt-1 text-ink-muted">{meta}</p>
              {session.lesson?.midtermSegment ? (
                <p className="mt-3 inline-flex rounded-full bg-violet-soft px-3 py-1 text-sm font-semibold text-violet-strong">
                  {midtermSegmentLabel(session.lesson.midtermSegment)}
                </p>
              ) : null}
              {session.lesson?.isSuggestion ? (
                <p className="mt-3 text-sm text-ink-muted">
                  Disarankan dari sisa rencana kelas ini. Anda bisa memilih topik lain saat menandai Selesai.
                </p>
              ) : null}
              {!session.classHasPlan ? (
                <p className="mt-3 text-sm">
                  <Link href={`/progres/${session.classId}`} className="font-semibold text-primary-strong underline-offset-2 hover:underline">
                    Buat rencana materi Kelas {session.classLabel}
                  </Link>
                </p>
              ) : null}
            </div>
            <StatusBadge status={session.status} className="text-sm" />
          </div>

          {replacementFor ? (
            <p className="mt-4 rounded-2xl bg-amber-soft/60 px-4 py-3 text-[15px] text-ink">
              Pengganti untuk pertemuan{" "}
              <Link href={`/jadwal/${encodeURIComponent(replacementFor.id)}`} className="font-semibold underline-offset-2 hover:underline">
                {formatLongDate(replacementFor.date)}
              </Link>
              .
            </p>
          ) : null}
          {replacement ? (
            <p className="mt-4 rounded-2xl bg-amber-soft/60 px-4 py-3 text-[15px] text-ink">
              Diganti pada{" "}
              <Link href={`/jadwal/${encodeURIComponent(replacement.id)}`} className="font-semibold underline-offset-2 hover:underline">
                {formatLongDate(replacement.date)}, {formatTimeRange(replacement.startTime, replacement.endTime)}
              </Link>{" "}
              ({MEETING_STATUS_LABEL[replacement.status]}).
            </p>
          ) : null}

          {record?.summary || session.notes ? (
            <div className="mt-5 space-y-3 rounded-2xl bg-primary-softer p-4">
              {record?.summary ? (
                <div>
                  <p className="text-sm font-semibold text-ink-muted">Ringkasan pembelajaran</p>
                  <p className="mt-1 whitespace-pre-line text-ink">{record.summary}</p>
                </div>
              ) : null}
              {session.notes ? (
                <div>
                  <p className="text-sm font-semibold text-ink-muted">
                    {session.status === "completed" ? "Kendala / catatan" : "Catatan"}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-ink">{session.notes}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-6 space-y-4 border-t border-line pt-5">
            {material && !isDemo && materialOpenTarget(material) ? (
              <MaterialOpenLink material={material} size="md" />
            ) : material ? (
              <span className={buttonClass("secondary", "md", "pointer-events-none opacity-55")} aria-disabled title={isDemo ? "Mode demo" : "Materi tanpa isi"}>
                <BookOpen aria-hidden className="size-5" /> Buka Materi
              </span>
            ) : (
              <p className="text-sm text-ink-muted">
                <BookOpen aria-hidden className="mr-1.5 inline size-4" />
                Topik ini belum ditautkan ke materi di Bank Materi.
              </p>
            )}

            {lockedReason ? (
              <PhaseNote>{lockedReason}</PhaseNote>
            ) : (
              <MeetingStatusForm
                sessionId={session.id}
                sessionDate={session.date}
                currentStatus={session.status}
                plans={plans}
                defaultPlanId={record?.lessonPlanId ?? session.lesson?.planId ?? null}
                defaultSummary={record?.summary ?? null}
                defaultNotes={record?.notes ?? null}
                canCreateReplacement={!replacement && !replacementFor}
              />
            )}
          </div>
        </Card>

        <Card aria-labelledby="riwayat-status">
          <h2 id="riwayat-status" className="flex items-center gap-2 text-lg font-bold text-ink">
            <History aria-hidden className="size-5 text-ink-muted" /> Riwayat status
          </h2>
          {events.length > 0 ? (
            <ol className="mt-3 space-y-2">
              {events.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-2 text-[15px] text-ink">
                  <span className="text-ink-muted tabular-nums">{TIME_FORMAT.format(new Date(e.changedAt))}</span>
                  <span aria-hidden>·</span>
                  {e.fromStatus ? (
                    <>
                      {MEETING_STATUS_LABEL[e.fromStatus]} <span aria-hidden>→</span>
                      <span className="sr-only">menjadi</span>
                    </>
                  ) : null}
                  <StatusBadge status={e.toStatus} />
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-[15px] text-ink-muted">
              {isDemo ? "Data contoh tidak menyimpan riwayat." : "Belum ada perubahan status. Status tidak pernah berubah otomatis karena tanggal lewat."}
            </p>
          )}
          {record?.actualDate && record.status === "completed" ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-ink-muted">
              <CalendarClock aria-hidden className="size-4" /> Dilaksanakan {formatShortDate(record.actualDate)}
            </p>
          ) : null}
        </Card>
      </div>
    </>
  );
}
