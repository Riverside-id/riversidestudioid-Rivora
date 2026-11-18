import { ArrowLeft, Download, ExternalLink, Filter, Lock } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { inputClass } from "@/components/ui/field";
import { ProgressBar } from "@/components/ui/progress-bar";
import { PageSkeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatShortDate, formatTimeRange } from "@/lib/date";
import { midtermSegmentLabel, semesterLabel, WEEKDAY_LABEL } from "@/lib/domain/labels";
import { isMaterialFileKind, opensInBrowser } from "@/lib/materials/file-rules";
import { getRequestContext } from "@/lib/server/request-context";
import { getArchiveDetail } from "@/lib/services/archive-detail";

export const metadata: Metadata = { title: "Detail Arsip" };

export default function ArchiveDetailPage({ params, searchParams }: PageProps<"/arsip/[yearId]">) {
  return (
    <Suspense fallback={<PageSkeleton label="Memuat arsip…" />}>
      <ArchiveDetailContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

const text = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

async function ArchiveDetailContent({
  params,
  searchParams,
}: {
  params: Promise<{ yearId: string }>;
  searchParams: PageProps<"/arsip/[yearId]">["searchParams"];
}) {
  const [{ yearId }, sp, { repo, app }] = await Promise.all([params, searchParams, getRequestContext()]);
  const detail = await getArchiveDetail(repo, decodeURIComponent(yearId), {
    semesterId: text(sp.semester),
    classId: text(sp.kelas),
    q: text(sp.q),
  });
  if (!detail) notFound();
  const { year, semesters, semester, classOptions, classes, query, totals } = detail;

  return (
    <>
      <PageHeader
        ctx={app}
        showPeriod={false}
        title={`Arsip ${year.label}`}
        subtitle={`${formatShortDate(year.startDate)} – ${formatShortDate(year.endDate)} · baca-saja`}
      />
      <div className="max-w-5xl space-y-5">
        <ButtonLink href="/arsip" variant="ghost" size="sm" className="-ml-2">
          <ArrowLeft aria-hidden className="size-4" /> Kembali ke Arsip
        </ButtonLink>

        <Card>
          <form className="grid gap-3 sm:grid-cols-2 sm:items-end xl:grid-cols-[1fr_1fr_1.4fr_auto]" action={`/arsip/${year.id}`}>
            <label className="space-y-1.5">
              <span className="block text-[15px] font-semibold text-ink">Semester</span>
              <select name="semester" defaultValue={semester?.id ?? ""} className={inputClass}>
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {semesterLabel(s.number)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="block text-[15px] font-semibold text-ink">Kelas</span>
              <select name="kelas" defaultValue={text(sp.kelas) ?? ""} className={inputClass}>
                <option value="">Semua kelas</option>
                {classOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    Kelas {c.label}
                    {c.archived ? " (diarsipkan)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="block text-[15px] font-semibold text-ink">Cari topik atau catatan</span>
              <input name="q" type="search" defaultValue={query} placeholder="mis. pecahan" className={inputClass} />
            </label>
            <Button type="submit" variant="secondary">
              <Filter aria-hidden className="size-4" /> Terapkan
            </Button>
          </form>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            {[
              ["Kelas", totals.classes],
              ["Topik", totals.topics],
              ["Pertemuan dicatat", totals.meetings],
              ["Selesai", totals.completed],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-primary-softer px-2 py-3">
                <dt className="text-sm text-ink-muted">{label}</dt>
                <dd className="text-2xl font-extrabold text-navy">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-muted">
            <Lock aria-hidden className="size-3.5" /> Data arsip tidak bisa diubah. Pulihkan dari halaman Arsip bila perlu.
          </p>
        </Card>

        {classes.length > 0 ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {classes.map((c) => (
              <Card key={c.id} as="article" aria-labelledby={`arsip-${c.id}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id={`arsip-${c.id}`} className="text-xl font-bold text-ink">
                    Kelas {c.label}
                  </h2>
                  {c.archived ? (
                    <span className="rounded-full bg-primary-softer px-2.5 py-0.5 text-xs font-semibold text-ink-muted">diarsipkan</span>
                  ) : null}
                </div>
                {c.schedules.length > 0 ? (
                  <p className="mt-1 text-sm text-ink-muted">
                    {c.schedules.map((s) => `${WEEKDAY_LABEL[s.weekday]} ${formatTimeRange(s.startTime, s.endTime)}`).join(" · ")}
                  </p>
                ) : null}
                <div className="mt-3">
                  {c.progress.kind === "planned" ? (
                    <>
                      <p className="text-sm font-semibold text-ink">
                        {c.progress.completed} dari {c.progress.planned} pertemuan selesai ({c.progress.percent}%)
                      </p>
                      <ProgressBar
                        value={c.progress.percent}
                        label={`Progres Kelas ${c.label}`}
                        valueText={`${c.progress.completed} dari ${c.progress.planned} pertemuan selesai`}
                        className="mt-2"
                      />
                    </>
                  ) : (
                    <p className="text-sm text-ink-muted">Belum ada rencana</p>
                  )}
                </div>

                {c.topics.length > 0 ? (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-ink-muted">Rencana materi</h3>
                    <ol className="mt-2 space-y-1.5">
                      {c.topics.map((t, i) => {
                        const kind = t.materialKind && isMaterialFileKind(t.materialKind) ? t.materialKind : null;
                        return (
                          <li key={`${t.title}-${i}`} className="rounded-xl border border-line px-3 py-2 text-[15px]">
                            <span className="font-semibold text-ink">
                              {i + 1}. {t.title}
                            </span>{" "}
                            <span className="text-ink-muted tabular-nums">
                              {t.completedSessions}/{t.plannedSessions}
                              {t.midtermSegment ? ` · ${midtermSegmentLabel(t.midtermSegment)}` : ""}
                            </span>
                            {t.materialId && t.materialTitle && kind ? (
                              <a
                                href={`/materi/${t.materialId}/berkas`}
                                target={opensInBrowser(kind) ? "_blank" : undefined}
                                rel={opensInBrowser(kind) ? "noopener noreferrer" : undefined}
                                className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-primary-strong underline-offset-2 hover:underline"
                              >
                                {opensInBrowser(kind) ? <ExternalLink aria-hidden className="size-4" /> : <Download aria-hidden className="size-4" />}
                                {t.materialTitle}
                              </a>
                            ) : null}
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                ) : null}

                {c.meetings.length > 0 ? (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-ink-muted">Riwayat mengajar</h3>
                    <ul className="mt-2 space-y-1.5">
                      {c.meetings.map((m) => (
                        <li key={m.id} className="rounded-xl border border-line px-3 py-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[15px] font-semibold text-ink">
                              {formatShortDate(m.date)}
                              {m.topic ? <span className="font-normal text-ink-muted"> · {m.topic}</span> : null}
                            </span>
                            <StatusBadge status={m.status} />
                          </div>
                          {m.summary ? <p className="mt-1 text-sm text-ink-muted">{m.summary}</p> : null}
                          {m.notes ? <p className="mt-1 text-sm text-ink-muted">Catatan: {m.notes}</p> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-ink-muted">Belum ada pertemuan yang dicatat di semester ini.</p>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Filter}
            title={query ? "Tidak ada yang cocok dengan pencarian" : "Tidak ada kelas pada pilihan ini"}
            description="Ubah semester, kelas, atau kata pencarian."
          />
        )}
      </div>
    </>
  );
}
