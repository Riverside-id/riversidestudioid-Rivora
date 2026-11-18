import { CalendarRange, KeyRound, UserRound } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { NewPasswordForm } from "@/components/auth/new-password-form";
import { PageHeader } from "@/components/layout/page-header";
import { ProfileForm } from "@/components/settings/profile-form";
import { SemesterDatesForm } from "@/components/settings/semester-dates-form";
import { Card, CardHeader } from "@/components/ui/card";
import { PhaseNote } from "@/components/ui/phase-note";
import { PageSkeleton } from "@/components/ui/skeleton";
import { formatShortDate } from "@/lib/date";
import { DEFAULT_MIDTERM_TERM, semesterLabel } from "@/lib/domain/labels";
import { getRequestContext } from "@/lib/server/request-context";

export const metadata: Metadata = { title: "Pengaturan" };

export default function PengaturanPage() {
  return (
    <Suspense fallback={<PageSkeleton label="Memuat pengaturan…" />}>
      <PengaturanContent />
    </Suspense>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-line/70 py-3 last:border-0 sm:flex-row sm:justify-between">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-semibold text-ink">{value}</dd>
    </div>
  );
}

async function PengaturanContent() {
  const { app, isDemo } = await getRequestContext();
  const p = app.profile;
  const canEditPeriod = !isDemo && app.activeYear?.status !== "archived";

  return (
    <>
      <PageHeader ctx={app} showPeriod={false} title="Pengaturan" subtitle="Profil, periode akademik, dan akun." />
      <div className="max-w-3xl space-y-5">
        {isDemo ? <PhaseNote>Mode demo: pengaturan hanya bisa dilihat, tidak bisa diubah.</PhaseNote> : null}

        <Card aria-labelledby="profil">
          <CardHeader icon={UserRound} title="Profil Guru" titleId="profil" />
          {!isDemo && p ? (
            <ProfileForm displayName={p.displayName} schoolName={p.schoolName} timezone={p.timezone} />
          ) : (
            <dl>
              <Row label="Nama panggilan" value={p?.displayName ?? "–"} />
              <Row label="Nama sekolah" value={p?.schoolName ?? "Belum diisi"} />
              <Row label="Mata pelajaran" value="Matematika SD" />
              <Row label="Zona waktu" value={p?.timezone ?? "Asia/Jakarta"} />
            </dl>
          )}
        </Card>

        <Card aria-labelledby="periode">
          <CardHeader
            icon={CalendarRange}
            title="Periode Akademik"
            titleId="periode"
            subtitle={app.activeYear ? `Tahun ajaran aktif ${app.activeYear.label}` : undefined}
          />
          {!app.activeYear ? (
            <p className="text-ink-muted">Belum ada tahun ajaran aktif.</p>
          ) : canEditPeriod ? (
            <div className="space-y-3">
              {app.semesters.map((s) => (
                <SemesterDatesForm
                  key={s.id}
                  semesterId={s.id}
                  title={semesterLabel(s.number)}
                  isActive={s.id === app.activeSemesterId}
                  startDate={s.startDate}
                  endDate={s.endDate}
                  midtermDate={s.midtermDate}
                  midtermTerm={`Penanda ${DEFAULT_MIDTERM_TERM}`}
                />
              ))}
            </div>
          ) : (
            <dl>
              <Row label="Tahun ajaran aktif" value={app.activeYear.label} />
              {app.semesters.map((s) => (
                <Row
                  key={s.id}
                  label={semesterLabel(s.number) + (s.id === app.activeSemesterId ? " (aktif)" : "")}
                  value={`${formatShortDate(s.startDate)} – ${formatShortDate(s.endDate)}${
                    s.midtermDate ? ` · ${DEFAULT_MIDTERM_TERM} ${formatShortDate(s.midtermDate)}` : ""
                  }`}
                />
              ))}
            </dl>
          )}
          <p className="mt-3 text-sm text-ink-muted">
            {DEFAULT_MIDTERM_TERM} hanya penanda tengah semester — bukan pergantian semester. Kosongkan bila tidak dipakai.
          </p>
        </Card>

        <Card aria-labelledby="akun">
          <CardHeader icon={KeyRound} title="Kata Sandi" titleId="akun" />
          {isDemo ? (
            <p className="text-ink-muted">Ubah kata sandi tersedia setelah login Supabase aktif.</p>
          ) : (
            <NewPasswordForm />
          )}
        </Card>
      </div>
    </>
  );
}
