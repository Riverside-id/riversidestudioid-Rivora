import { ArrowLeft, Download, FileBarChart, Filter } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button, buttonClass, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { inputClass } from "@/components/ui/field";
import { PageSkeleton } from "@/components/ui/skeleton";
import { PrintButton } from "@/components/ui/print-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatShortDate, formatTimeRange } from "@/lib/date";
import { MEETING_STATUS_LABEL, semesterLabel } from "@/lib/domain/labels";
import { getRequestContext } from "@/lib/server/request-context";
import { getTeachingReport } from "@/lib/services/report";

export const metadata: Metadata = { title: "Laporan Mengajar" };

const EXPORTED_AT = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" });
const text = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default function LaporanPage({ searchParams }: PageProps<"/progres/laporan">) {
  return (
    <Suspense fallback={<PageSkeleton label="Menyusun laporan…" />}>
      <LaporanContent searchParams={searchParams} />
    </Suspense>
  );
}

async function LaporanContent({ searchParams }: { searchParams: PageProps<"/progres/laporan">["searchParams"] }) {
  const [sp, { repo, app }] = await Promise.all([searchParams, getRequestContext()]);
  const report = await getTeachingReport(repo, {
    yearId: text(sp.tahun),
    semesterId: text(sp.semester) ?? app.selectedSemester?.id,
    classId: text(sp.kelas),
    from: text(sp.dari),
    to: text(sp.sampai),
  });
  const { profile, years, year, semesters, semester, classOptions, filters, classes, meetings, totals } = report;

  const query = new URLSearchParams();
  if (filters.yearId) query.set("tahun", filters.yearId);
  query.set("semester", filters.semesterId);
  if (filters.classId) query.set("kelas", filters.classId);
  if (filters.from) query.set("dari", filters.from);
  if (filters.to) query.set("sampai", filters.to);
  const semesterText = semester ? semesterLabel(semester.number) : "Semua semester";
  const period =
    filters.from || filters.to
      ? `${filters.from ? formatShortDate(filters.from) : "awal"} – ${filters.to ? formatShortDate(filters.to) : "akhir"}`
      : "Seluruh periode";
  const classText = filters.classId ? `Kelas ${classOptions.find((c) => c.id === filters.classId)?.label ?? ""}` : "Semua kelas";

  return (
    <>
      <div className="print:hidden">
        <PageHeader ctx={app} showPeriod={false} title="Laporan Mengajar" subtitle="Rekap pelaksanaan dari catatan pertemuan Anda — bukan nilai siswa." />
      </div>
      <div className="max-w-5xl space-y-5">
        <ButtonLink href="/progres" variant="ghost" size="sm" className="-ml-2 print:hidden">
          <ArrowLeft aria-hidden className="size-4" /> Kembali ke Progres
        </ButtonLink>

        <Card className="print:hidden">
          <form action="/progres/laporan" className="grid gap-3 sm:grid-cols-2 sm:items-end xl:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto]">
            <label className="space-y-1.5">
              <span className="block text-[15px] font-semibold text-ink">Tahun ajaran</span>
              <select name="tahun" defaultValue={filters.yearId ?? ""} className={inputClass}>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.label}
                    {y.status === "archived" ? " (arsip)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="block text-[15px] font-semibold text-ink">Semester</span>
              <select name="semester" defaultValue={filters.semesterId} className={inputClass}>
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {semesterLabel(s.number)}
                  </option>
                ))}
                <option value="semua">Semua semester</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="block text-[15px] font-semibold text-ink">Kelas</span>
              <select name="kelas" defaultValue={filters.classId} className={inputClass}>
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
              <span className="block text-[15px] font-semibold text-ink">Dari tanggal</span>
              <input type="date" name="dari" defaultValue={filters.from} className={inputClass} />
            </label>
            <label className="space-y-1.5">
              <span className="block text-[15px] font-semibold text-ink">Sampai tanggal</span>
              <input type="date" name="sampai" defaultValue={filters.to} className={inputClass} />
            </label>
            <Button type="submit" variant="secondary">
              <Filter aria-hidden className="size-4" /> Terapkan
            </Button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
            <a href={`/progres/laporan/csv?${query}&jenis=pertemuan`} className={buttonClass("secondary", "sm")}>
              <Download aria-hidden className="size-4" /> CSV per pertemuan
            </a>
            <a href={`/progres/laporan/csv?${query}&jenis=ringkasan`} className={buttonClass("secondary", "sm")}>
              <Download aria-hidden className="size-4" /> CSV ringkasan kelas
            </a>
            <PrintButton />
          </div>
          <p className="mt-2 text-sm text-ink-muted">
            CSV terbuka di Excel/Google Sheets. Untuk PDF, tekan Cetak lalu pilih &quot;Simpan sebagai PDF&quot;.
          </p>
        </Card>

        <Card className="print:border-0 print:p-0 print:shadow-none">
          <header className="border-b border-line pb-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink-muted">
              <FileBarChart aria-hidden className="size-4" /> Rivora — Laporan Mengajar Matematika
            </p>
            <h2 className="mt-1 text-2xl font-bold text-ink">
              {profile?.displayName ?? "Guru"}
              {profile?.schoolName ? <span className="font-semibold text-ink-muted"> · {profile.schoolName}</span> : null}
            </h2>
            <dl className="mt-2 grid gap-x-6 gap-y-1 text-[15px] text-ink sm:grid-cols-2">
              <div><dt className="inline text-ink-muted">Tahun ajaran: </dt><dd className="inline font-semibold">{year?.label ?? "–"}</dd></div>
              <div><dt className="inline text-ink-muted">Semester: </dt><dd className="inline font-semibold">{semesterText}</dd></div>
              <div><dt className="inline text-ink-muted">Kelas: </dt><dd className="inline font-semibold">{classText}</dd></div>
              <div><dt className="inline text-ink-muted">Periode: </dt><dd className="inline font-semibold">{period}</dd></div>
              <div className="sm:col-span-2"><dt className="inline text-ink-muted">Diekspor: </dt><dd className="inline">{EXPORTED_AT.format(new Date())} WIB</dd></div>
            </dl>
          </header>

          <section aria-labelledby="ringkasan-kelas" className="mt-5">
            <h3 id="ringkasan-kelas" className="text-lg font-bold text-ink">Ringkasan per kelas</h3>
            {classes.length > 0 ? (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-left text-[15px]">
                  <thead>
                    <tr className="border-b border-line text-sm text-ink-muted">
                      <th className="py-2 pr-3 font-semibold">Kelas</th>
                      <th className="py-2 pr-3 text-right font-semibold">Rencana</th>
                      <th className="py-2 pr-3 text-right font-semibold">Selesai</th>
                      <th className="py-2 pr-3 text-right font-semibold">Ditunda</th>
                      <th className="py-2 pr-3 text-right font-semibold">Batal</th>
                      <th className="py-2 text-right font-semibold">Progres</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {classes.map((c) => (
                      <tr key={c.classId} className="border-b border-line/70">
                        <td className="py-2 pr-3 font-semibold text-ink">
                          {c.classLabel}
                          {c.archived ? <span className="font-normal text-ink-muted"> (diarsipkan)</span> : null}
                        </td>
                        <td className="py-2 pr-3 text-right">{c.plannedSessions}</td>
                        <td className="py-2 pr-3 text-right">{c.completed}</td>
                        <td className="py-2 pr-3 text-right">{c.postponed}</td>
                        <td className="py-2 pr-3 text-right">{c.cancelled}</td>
                        <td className="py-2 text-right font-semibold">{c.progress.kind === "planned" ? `${c.progress.percent}%` : "Belum ada rencana"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold text-ink">
                      <td className="py-2 pr-3">Total</td>
                      <td className="py-2 pr-3 text-right">{totals.planned}</td>
                      <td className="py-2 pr-3 text-right">{totals.completed}</td>
                      <td className="py-2 pr-3 text-right">{totals.postponed}</td>
                      <td className="py-2 pr-3 text-right">{totals.cancelled}</td>
                      <td className="py-2 text-right">{totals.planned > 0 ? `${Math.min(100, Math.round((totals.completed / totals.planned) * 100))}%` : "–"}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <EmptyState icon={FileBarChart} title="Belum ada kelas pada pilihan ini" className="py-6" />
            )}
            <p className="mt-2 text-sm text-ink-muted">Progres = pertemuan selesai ÷ pertemuan direncanakan (maks. 100%). Ditunda/Batal tidak dihitung selesai.</p>
          </section>

          <section aria-labelledby="daftar-pertemuan" className="mt-6">
            <h3 id="daftar-pertemuan" className="text-lg font-bold text-ink">Pertemuan yang dicatat ({meetings.length})</h3>
            {meetings.length > 0 ? (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left text-[15px]">
                  <thead>
                    <tr className="border-b border-line text-sm text-ink-muted">
                      <th className="py-2 pr-3 font-semibold">Tanggal</th>
                      <th className="py-2 pr-3 font-semibold">Kelas</th>
                      <th className="py-2 pr-3 font-semibold">Topik</th>
                      <th className="py-2 pr-3 font-semibold">Status</th>
                      <th className="py-2 font-semibold">Ringkasan / catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meetings.map((m, i) => (
                      <tr key={`${m.date}-${m.classLabel}-${i}`} className="border-b border-line/70 align-top">
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {formatShortDate(m.date)}
                          {m.startTime && m.endTime ? <span className="block text-sm text-ink-muted">{formatTimeRange(m.startTime, m.endTime)}</span> : null}
                        </td>
                        <td className="py-2 pr-3 font-semibold">{m.classLabel}</td>
                        <td className="py-2 pr-3">{m.topic ?? "–"}</td>
                        <td className="py-2 pr-3">
                          <span className="print:hidden"><StatusBadge status={m.status} /></span>
                          <span className="hidden print:inline">{MEETING_STATUS_LABEL[m.status]}</span>
                        </td>
                        <td className="py-2 text-sm text-ink-muted">
                          {m.summary ? <span className="block text-ink">{m.summary}</span> : null}
                          {m.notes ? <span className="block">Catatan: {m.notes}</span> : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={FileBarChart}
                title="Belum ada pertemuan yang dicatat"
                description="Tandai Selesai, Tunda, atau Batal di detail sesi agar muncul di laporan."
                className="py-6"
              />
            )}
          </section>
        </Card>
      </div>
    </>
  );
}
