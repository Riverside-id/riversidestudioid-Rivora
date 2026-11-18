import { ArrowRight, CalendarCheck, CalendarDays } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatLongDate } from "@/lib/date";
import type { ISODate } from "@/lib/domain/types";
import type { TeachingSession } from "@/lib/services/sessions";
import { takeWithRemainder } from "@/lib/utils";
import { SessionRow } from "./session-row";

const MAX_VISIBLE = 3;

export function TodayScheduleCard({
  sessions,
  today,
  hasClasses,
  todayInSemester,
}: {
  sessions: TeachingSession[];
  today: ISODate;
  hasClasses: boolean;
  todayInSemester: boolean;
}) {
  const { visible, remaining } = takeWithRemainder(sessions, MAX_VISIBLE);

  return (
    <Card aria-labelledby="jadwal-hari-ini">
      <CardHeader
        icon={CalendarDays}
        title="Jadwal Hari Ini"
        titleId="jadwal-hari-ini"
        subtitle={formatLongDate(today)}
        action={
          <ButtonLink href="/jadwal" variant="soft" size="sm">
            {remaining > 0 ? `Lihat Semua (${sessions.length})` : "Lihat Semua"}
            <ArrowRight aria-hidden className="size-4" />
          </ButtonLink>
        }
      />

      {visible.length > 0 ? (
        <ul className="space-y-2.5">
          {visible.map((s) => (
            <SessionRow key={s.id} session={s} />
          ))}
        </ul>
      ) : !hasClasses ? (
        <EmptyState
          icon={CalendarCheck}
          title="Belum ada kelas. Tambah kelas pertama Anda."
          description="Setelah kelas dan jadwal dibuat, jadwal mengajar hari ini akan tampil di sini."
        />
      ) : (
        <EmptyState
          icon={CalendarCheck}
          title="Tidak ada jadwal mengajar hari ini"
          description={
            todayInSemester
              ? "Selamat beristirahat. Jadwal berikutnya bisa dilihat di menu Jadwal."
              : "Tanggal hari ini berada di luar rentang semester yang sedang dilihat."
          }
        />
      )}

      {remaining > 0 ? (
        <p className="mt-3 text-sm text-ink-muted">
          +{remaining} sesi lagi hari ini — buka <strong className="font-semibold text-ink">Lihat Semua</strong>.
        </p>
      ) : null}
    </Card>
  );
}
