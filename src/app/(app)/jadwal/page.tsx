import { CalendarDays, Plus, Users } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { SessionRow } from "@/components/dashboard/session-row";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PhaseNote } from "@/components/ui/phase-note";
import { PageSkeleton } from "@/components/ui/skeleton";
import { formatLongDate, formatTimeRange } from "@/lib/date";
import { semesterLabel } from "@/lib/domain/labels";
import { isDateInSemester } from "@/lib/domain/period";
import { getRequestContext } from "@/lib/server/request-context";
import { getWeeklyOverview } from "@/lib/services/schedule";
import { loadSemesterData } from "@/lib/services/semester-data";
import { buildSessionsForDate } from "@/lib/services/sessions";

export const metadata: Metadata = { title: "Jadwal" };

export default function JadwalPage() {
  return (
    <Suspense fallback={<PageSkeleton label="Memuat jadwal…" />}>
      <JadwalContent />
    </Suspense>
  );
}

async function JadwalContent() {
  const { repo, app, today } = await getRequestContext();
  const weekly = await getWeeklyOverview(repo, app);
  const todaySessions =
    app.activeYear && app.selectedSemester && isDateInSemester(app.selectedSemester, today)
      ? buildSessionsForDate(today, await loadSemesterData(repo, app.activeYear, app.selectedSemester))
      : [];

  const period = app.selectedSemester && app.activeYear
    ? `${app.activeYear.label} · ${semesterLabel(app.selectedSemester.number)}`
    : "Belum ada periode";

  return (
    <>
      <PageHeader ctx={app} title="Jadwal" subtitle={`Jadwal mengajar Matematika · ${period}`} />

      <div className="space-y-6">
        <PhaseNote>
          Tampilan baca-saja. Tambah/ubah jadwal, pengecualian, dan jadwal pengganti dibangun pada Fase C.
        </PhaseNote>

        <Card aria-labelledby="jadwal-hari-ini-semua">
          <CardHeader
            icon={CalendarDays}
            title="Semua Jadwal Hari Ini"
            titleId="jadwal-hari-ini-semua"
            subtitle={formatLongDate(today)}
          />
          {todaySessions.length > 0 ? (
            <ul className="space-y-2.5">
              {todaySessions.map((s) => (
                <SessionRow key={s.id} session={s} />
              ))}
            </ul>
          ) : (
            <EmptyState icon={CalendarDays} title="Tidak ada jadwal mengajar hari ini" />
          )}
        </Card>

        <Card aria-labelledby="jadwal-mingguan">
          <CardHeader
            icon={CalendarDays}
            title="Jadwal Mingguan"
            titleId="jadwal-mingguan"
            subtitle={
              weekly.conflictCount > 0
                ? `${weekly.conflictCount} jadwal bentrok perlu diperiksa`
                : "Tidak ada jadwal bentrok"
            }
            action={
              <Button size="sm" variant="soft" disabled title="Tersedia pada Fase C">
                <Plus aria-hidden className="size-4" /> Tambah Jadwal
              </Button>
            }
          />
          {weekly.days.some((d) => d.slots.length > 0) ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {weekly.days.map((day) => (
                <section key={day.weekday} aria-label={day.label} className="rounded-2xl border border-line p-3.5">
                  <h3 className="mb-2.5 text-base font-bold text-ink">{day.label}</h3>
                  {day.slots.length > 0 ? (
                    <ul className="space-y-2">
                      {day.slots.map((slot) => (
                        <li key={slot.scheduleId} className="rounded-xl bg-primary-softer px-3 py-2">
                          <p className="text-sm font-semibold text-primary-strong tabular-nums">
                            {formatTimeRange(slot.startTime, slot.endTime)}
                          </p>
                          <p className="text-[15px] font-semibold text-ink">Kelas {slot.classLabel}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-ink-muted">Tidak ada jadwal</p>
                  )}
                </section>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="Belum ada jadwal rutin di semester ini"
              description="Jadwal tiap semester dikelola terpisah."
            />
          )}
        </Card>

        <Card aria-labelledby="kelola-kelas" id="kelas">
          <CardHeader
            icon={Users}
            title="Kelola Kelas"
            titleId="kelola-kelas"
            subtitle={app.activeYear ? `Kelas pada tahun ajaran ${app.activeYear.label}` : undefined}
            action={
              <Button size="sm" variant="soft" disabled title="Tersedia pada Fase B">
                <Plus aria-hidden className="size-4" /> Tambah Kelas
              </Button>
            }
          />
          {weekly.classes.length > 0 ? (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {weekly.classes.map((c) => (
                <li key={c.classId} className="flex items-center gap-3 rounded-2xl border border-line p-3.5">
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-lg font-extrabold text-primary-strong">
                    {c.classLabel}
                  </span>
                  <div>
                    <p className="font-semibold text-ink">Kelas {c.classLabel}</p>
                    <p className="text-sm text-ink-muted">
                      {c.sessionsPerWeek} sesi/minggu ·{" "}
                      {c.planTopics > 0 ? `${c.planTopics} topik direncanakan` : "belum ada rencana"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Users} title="Belum ada kelas. Tambah kelas pertama Anda." />
          )}
        </Card>
      </div>
    </>
  );
}
