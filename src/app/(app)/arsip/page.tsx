import { Archive, ArchiveRestore, CalendarRange, Lock, Search } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { NewAcademicYearForm } from "@/components/arsip/new-academic-year-form";
import { InlineAddPanel } from "@/components/jadwal/inline-add-panel";
import { PageHeader } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { EmptyState } from "@/components/ui/empty-state";
import { inputClass } from "@/components/ui/field";
import { PageSkeleton } from "@/components/ui/skeleton";
import { formatShortDate } from "@/lib/date";
import { getRequestContext } from "@/lib/server/request-context";
import { getArchiveOverview } from "@/lib/services/archive";
import { cn } from "@/lib/utils";
import { nextAcademicYearLabel } from "@/lib/validation/academic-year";
import { activateArchivedYearAction } from "./actions";

export const metadata: Metadata = { title: "Arsip" };

export default function ArsipPage({ searchParams }: PageProps<"/arsip">) {
  return (
    <Suspense fallback={<PageSkeleton label="Memuat arsip…" />}>
      <ArsipContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ArsipContent({ searchParams }: { searchParams: PageProps<"/arsip">["searchParams"] }) {
  const [{ repo, app, today, isDemo }, params] = await Promise.all([getRequestContext(), searchParams]);
  const archived = await getArchiveOverview(repo);
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const needle = query.toLowerCase();
  const shown = needle
    ? archived.filter((a) => `${a.year.label} ${a.classLabels.join(" ")}`.toLowerCase().includes(needle))
    : archived;
  const canEdit = !isDemo;
  const activeLabel = app.activeYear?.label ?? null;

  return (
    <>
      <PageHeader
        ctx={app}
        showPeriod={false}
        title="Arsip"
        subtitle="Tahun ajaran lama tersimpan utuh dan hanya bisa dibaca. Arsip bukan penghapusan."
      />
      <div className="space-y-5">
        <Card aria-labelledby="tahun-aktif" id="tahun-baru">
          <CardHeader
            icon={CalendarRange}
            title={activeLabel ? `Tahun Ajaran Aktif: ${activeLabel}` : "Belum ada tahun ajaran aktif"}
            titleId="tahun-aktif"
            subtitle="Saat tahun ajaran berakhir, mulai tahun baru. Tahun yang sekarang otomatis diarsipkan."
          />
          <InlineAddPanel label="Mulai Tahun Ajaran Baru" disabledReason={canEdit ? undefined : "Mode demo: tidak bisa membuat tahun ajaran."}>
            <NewAcademicYearForm activeLabel={activeLabel} suggestedLabel={nextAcademicYearLabel(activeLabel, today)} />
          </InlineAddPanel>
        </Card>

        {archived.length > 1 || query ? (
          <form role="search" className="relative" action="/arsip">
            <label htmlFor="cari-arsip" className="sr-only">
              Cari tahun ajaran atau kelas
            </label>
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-subtle" />
            <input id="cari-arsip" name="q" type="search" defaultValue={query} placeholder="Cari tahun ajaran atau kelas, mis. 2025 atau 3B" className={cn(inputClass, "pl-11")} />
          </form>
        ) : null}

        {shown.length > 0 ? (
          <ul className="grid gap-5 lg:grid-cols-2">
            {shown.map((a) => (
              <li key={a.year.id}>
                <Card as="article" className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-bold text-ink">Tahun Ajaran {a.year.label}</h2>
                      <p className="text-sm text-ink-muted">
                        {formatShortDate(a.year.startDate)} – {formatShortDate(a.year.endDate)}
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary-softer px-3 py-1 text-sm font-semibold text-ink-muted">
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
                  <p className="mt-4 text-sm text-ink-muted">
                    {a.completedMeetings} pertemuan selesai · Kelas: {a.classLabels.length > 0 ? a.classLabels.join(", ") : "–"}
                  </p>
                  <div className="mt-auto flex flex-wrap gap-2 pt-5">
                    <ButtonLink href={`/arsip/${a.year.id}`} variant="secondary" size="sm">
                      <Archive aria-hidden className="size-4" /> Buka detail
                    </ButtonLink>
                    {canEdit ? (
                      <ConfirmAction
                        trigger={
                          <>
                            <ArchiveRestore aria-hidden className="size-4" /> Pulihkan
                          </>
                        }
                        triggerLabel={`Pulihkan tahun ajaran ${a.year.label}`}
                        triggerClassName="inline-flex h-9 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold text-ink-muted hover:bg-primary-softer hover:text-ink"
                        title={`Pulihkan ${a.year.label}?`}
                        description={
                          <>
                            Tahun ajaran <strong>{a.year.label}</strong> menjadi aktif kembali.
                            {activeLabel ? (
                              <>
                                {" "}
                                Tahun yang sedang aktif (<strong>{activeLabel}</strong>) akan diarsipkan — datanya tetap utuh
                                dan bisa dipulihkan lagi.
                              </>
                            ) : null}
                          </>
                        }
                        confirmLabel="Pulihkan"
                        action={activateArchivedYearAction}
                        fields={{ yearId: a.year.id }}
                        tone="primary"
                      />
                    ) : null}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={Archive}
            title={query ? "Tidak ada arsip yang cocok" : "Belum ada tahun ajaran yang diarsipkan"}
            description={
              query
                ? "Coba kata lain, misalnya tahun (2025) atau kelas (3B)."
                : "Saat tahun ajaran berakhir, tekan Mulai Tahun Ajaran Baru. Tahun lama tersimpan di sini sebagai riwayat baca-saja."
            }
          />
        )}
      </div>
    </>
  );
}
