import { Archive, CalendarDays, Users, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SessionRow } from "@/components/dashboard/session-row";
import { AddClassForm } from "@/components/jadwal/add-class-form";
import { AddScheduleForm } from "@/components/jadwal/add-schedule-form";
import { EditClassDialog } from "@/components/jadwal/edit-class-dialog";
import { InlineAddPanel } from "@/components/jadwal/inline-add-panel";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/action-button";
import { ConfirmAction } from "@/components/ui/confirm-action";
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
import { archiveClassAction, deleteScheduleAction, restoreClassAction } from "./actions";

export const metadata: Metadata = { title: "Jadwal" };

export default function JadwalPage() {
  return (
    <Suspense fallback={<PageSkeleton label="Memuat jadwal…" />}>
      <JadwalContent />
    </Suspense>
  );
}

async function JadwalContent() {
  const { repo, app, today, isDemo } = await getRequestContext();
  const [weekly, allClasses] = await Promise.all([
    getWeeklyOverview(repo, app),
    app.activeYear ? repo.listClasses(app.activeYear.id, { includeArchived: true }) : Promise.resolve([]),
  ]);
  const archivedClasses = allClasses.filter((c) => c.archivedAt !== null);
  const todaySessions =
    app.activeYear && app.selectedSemester && isDateInSemester(app.selectedSemester, today)
      ? buildSessionsForDate(today, await loadSemesterData(repo, app.activeYear, app.selectedSemester))
      : [];

  const semesterName = app.selectedSemester ? semesterLabel(app.selectedSemester.number) : "";
  const period = app.selectedSemester && app.activeYear ? `${app.activeYear.label} · ${semesterName}` : "Belum ada periode";
  const lockedReason = isDemo
    ? "Mode demo: data contoh tidak bisa diubah."
    : app.activeYear?.status === "archived"
      ? "Tahun ajaran ini diarsipkan (baca-saja)."
      : undefined;
  const canEdit = !lockedReason;

  return (
    <>
      <PageHeader ctx={app} title="Jadwal" subtitle={`Jadwal mengajar Matematika · ${period}`} />

      <div className="space-y-6">
        <PhaseNote>
          {isDemo
            ? "Mode demo: data contoh tidak bisa diubah."
            : "Libur atau perubahan satu tanggal: buka sesinya, lalu pilih Tunda (bisa langsung buat jadwal pengganti) atau Batal. Jadwal mingguan tidak ikut berubah."}
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
          />
          {weekly.days.some((d) => d.slots.length > 0) ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {weekly.days.map((day) => (
                <section key={day.weekday} aria-label={day.label} className="rounded-2xl border border-line p-3.5">
                  <h3 className="mb-2.5 text-base font-bold text-ink">{day.label}</h3>
                  {day.slots.length > 0 ? (
                    <ul className="space-y-2">
                      {day.slots.map((slot) => (
                        <li key={slot.scheduleId} className="flex items-start justify-between gap-2 rounded-xl bg-primary-softer px-3 py-2">
                          <div>
                            <p className="text-sm font-semibold text-primary-strong tabular-nums">
                              {formatTimeRange(slot.startTime, slot.endTime)}
                            </p>
                            <p className="text-[15px] font-semibold text-ink">Kelas {slot.classLabel}</p>
                          </div>
                          {canEdit ? (
                            <ConfirmAction
                              trigger={<X aria-hidden className="size-4" />}
                              triggerLabel={`Hapus jadwal Kelas ${slot.classLabel} hari ${day.label} ${formatTimeRange(slot.startTime, slot.endTime)}`}
                              triggerClassName="-mr-1 grid size-8 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-rose-soft hover:text-rose-strong"
                              title="Hapus jadwal ini?"
                              description={
                                <>
                                  Jadwal rutin <strong>Kelas {slot.classLabel}</strong> setiap {day.label},{" "}
                                  {formatTimeRange(slot.startTime, slot.endTime)} akan dihapus dari {semesterName}.
                                </>
                              }
                              confirmLabel="Hapus Jadwal"
                              action={deleteScheduleAction}
                              fields={{ scheduleId: slot.scheduleId }}
                            />
                          ) : null}
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
          {app.selectedSemester ? (
            <InlineAddPanel label="Tambah Jadwal" disabledReason={lockedReason} className="mt-4">
              <AddScheduleForm
                classes={weekly.classes.map((c) => ({ id: c.classId, label: c.classLabel }))}
                semesterLabel={semesterName}
              />
            </InlineAddPanel>
          ) : null}
        </Card>

        <Card aria-labelledby="kelola-kelas" id="kelas">
          <CardHeader
            icon={Users}
            title="Kelola Kelas"
            titleId="kelola-kelas"
            subtitle={app.activeYear ? `Kelas Matematika pada tahun ajaran ${app.activeYear.label}` : undefined}
          />
          {weekly.classes.length > 0 ? (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {weekly.classes.map((c) => (
                <li key={c.classId} className="flex items-center gap-3 rounded-2xl border border-line p-3.5">
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-lg font-extrabold text-primary-strong">
                    {c.classLabel}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">Kelas {c.classLabel}</p>
                    <p className="text-sm text-ink-muted">
                      {c.sessionsPerWeek} sesi/minggu ·{" "}
                      <Link href={`/progres/${c.classId}`} className="font-semibold text-primary-strong underline-offset-2 hover:underline">
                        {c.planTopics > 0 ? `${c.planTopics} topik direncanakan` : "buat rencana"}
                      </Link>
                    </p>
                  </div>
                  {canEdit ? (
                    <EditClassDialog classId={c.classId} classLabel={c.classLabel} gradeLevel={c.gradeLevel} section={c.section} />
                  ) : null}
                  {canEdit ? (
                    <ConfirmAction
                      trigger={<Archive aria-hidden className="size-4" />}
                      triggerLabel={`Arsipkan Kelas ${c.classLabel}`}
                      triggerClassName="grid size-9 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-primary-softer hover:text-ink"
                      title={`Arsipkan Kelas ${c.classLabel}?`}
                      description={
                        <>
                          Kelas tidak lagi tampil di daftar aktif dan tidak bisa diberi jadwal baru. Riwayat jadwal dan
                          catatannya <strong>tetap tersimpan</strong> — arsip bukan penghapusan.
                        </>
                      }
                      confirmLabel="Arsipkan Kelas"
                      action={archiveClassAction}
                      fields={{ classId: c.classId }}
                      tone="primary"
                    />
                  ) : null}
                </li>
              ))}
              {app.activeYear ? (
                <li>
                  <InlineAddPanel label="Tambah Kelas" disabledReason={lockedReason} className="h-full">
                    <AddClassForm />
                  </InlineAddPanel>
                </li>
              ) : null}
            </ul>
          ) : (
            <div className="space-y-4">
              <EmptyState icon={Users} title="Belum ada kelas. Tambah kelas pertama Anda." />
              {app.activeYear ? (
                <InlineAddPanel label="Tambah Kelas" disabledReason={lockedReason}>
                  <AddClassForm />
                </InlineAddPanel>
              ) : null}
            </div>
          )}

          {archivedClasses.length > 0 ? (
            <details className="mt-5 border-t border-line pt-4">
              <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-ink [&::-webkit-details-marker]:hidden">
                <Archive aria-hidden className="size-5 text-ink-muted" />
                Kelas Diarsipkan ({archivedClasses.length})
                <span className="ml-auto text-sm text-primary-strong">Lihat</span>
              </summary>
              <p className="mt-2 text-sm text-ink-muted">
                Jadwal, rencana, dan catatan pertemuannya tetap tersimpan. Buka riwayat atau pulihkan kelas.
              </p>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {archivedClasses.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-line p-3.5">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-softer text-base font-extrabold text-ink-muted">
                      {c.displayName}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">Kelas {c.displayName}</p>
                      <Link href={`/progres/${c.id}`} className="text-sm font-semibold text-primary-strong underline-offset-2 hover:underline">
                        Lihat riwayat
                      </Link>
                    </div>
                    {canEdit ? (
                      <ActionButton action={restoreClassAction} fields={{ classId: c.id }} label={`Pulihkan Kelas ${c.displayName}`}>
                        Pulihkan
                      </ActionButton>
                    ) : null}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </Card>
      </div>
    </>
  );
}
