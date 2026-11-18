import { CalendarRange, KeyRound, UserRound } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
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
  const { app } = await getRequestContext();
  const p = app.profile;

  return (
    <>
      <PageHeader ctx={app} showPeriod={false} title="Pengaturan" subtitle="Profil, periode akademik, dan akun." />
      <div className="max-w-3xl space-y-5">
        <PhaseNote>
          Tampilan baca-saja. Ubah nama, zona waktu, periode, dan kata sandi (Supabase Auth) dibangun pada Fase B.
        </PhaseNote>

        <Card aria-labelledby="profil">
          <CardHeader icon={UserRound} title="Profil Guru" titleId="profil" />
          <dl>
            <Row label="Nama panggilan" value={p?.displayName ?? "–"} />
            <Row label="Nama sekolah" value={p?.schoolName ?? "Belum diisi"} />
            <Row label="Mata pelajaran" value="Matematika SD" />
            <Row label="Zona waktu" value={p?.timezone ?? "Asia/Jakarta"} />
          </dl>
        </Card>

        <Card aria-labelledby="periode">
          <CardHeader icon={CalendarRange} title="Periode Akademik" titleId="periode" />
          {app.activeYear ? (
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
          ) : (
            <p className="text-ink-muted">Belum ada tahun ajaran aktif.</p>
          )}
          <p className="mt-3 text-sm text-ink-muted">
            {DEFAULT_MIDTERM_TERM} hanya penanda tengah semester — bukan pergantian semester.
          </p>
        </Card>

        <Card aria-labelledby="akun">
          <CardHeader icon={KeyRound} title="Akun" titleId="akun" />
          <p className="text-ink-muted">Ubah kata sandi dan pengelolaan akun tersedia setelah login Supabase aktif.</p>
        </Card>
      </div>
    </>
  );
}
