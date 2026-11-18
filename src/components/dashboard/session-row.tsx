import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatTimeRange } from "@/lib/date";
import type { TeachingSession } from "@/lib/services/sessions";

export function sessionLessonText(session: TeachingSession): { title: string; meta: string } {
  if (session.lesson) {
    return {
      title: session.lesson.title,
      meta: `Kelas ${session.classLabel} · Pertemuan ${session.lesson.sessionNumber} dari ${session.lesson.plannedSessions}`,
    };
  }
  return {
    title: session.classHasPlan ? "Semua rencana materi selesai" : "Belum ada rencana materi",
    meta: `Kelas ${session.classLabel}`,
  };
}

/** Baris jadwal: pill jam · materi + kelas · status · tombol buka (pola dari screenshot referensi). */
export function SessionRow({ session }: { session: TeachingSession }) {
  const { title, meta } = sessionLessonText(session);
  const hasLesson = session.lesson !== null;

  return (
    <li>
      <Link
        href={`/jadwal/${encodeURIComponent(session.id)}`}
        className="group grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 rounded-2xl border border-line bg-white p-3 transition-colors hover:border-primary/35 hover:bg-primary-softer/50 sm:flex sm:gap-4"
      >
        <span className="flex justify-self-start rounded-xl bg-primary-soft px-3 py-1.5 text-[15px] font-semibold text-primary-strong tabular-nums sm:min-w-[150px] sm:justify-center sm:px-4 sm:py-2.5 sm:text-lg">
          {formatTimeRange(session.startTime, session.endTime)}
        </span>
        <span aria-hidden className="hidden h-12 w-px bg-line sm:block" />
        <span className="col-start-1 min-w-0 flex-1">
          <span
            className={
              hasLesson
                ? "block text-base font-bold text-ink sm:text-[17px]"
                : "block text-base font-semibold text-ink-muted sm:text-[17px]"
            }
          >
            {title}
          </span>
          <span className="mt-0.5 block text-sm text-ink-muted">
            {meta}
            {session.isReplacement ? " · Sesi pengganti" : ""}
          </span>
          {session.status !== "scheduled" ? (
            <StatusBadge status={session.status} className="mt-2 sm:hidden" />
          ) : null}
        </span>
        {session.status !== "scheduled" ? (
          <StatusBadge status={session.status} className="hidden sm:inline-flex" />
        ) : null}
        <span
          aria-hidden
          className="col-start-2 row-span-2 row-start-1 grid size-10 shrink-0 place-items-center rounded-full bg-primary-softer text-primary transition-colors group-hover:bg-primary-soft sm:size-9"
        >
          <ChevronRight className="size-5" strokeWidth={2.25} />
        </span>
        <span className="sr-only">Buka detail sesi Kelas {session.classLabel}</span>
      </Link>
    </li>
  );
}
