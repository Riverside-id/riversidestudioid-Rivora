import { Info } from "lucide-react";
import type { ReactNode } from "react";
import { semesterLabel } from "@/lib/domain/labels";
import type { AppContext } from "@/lib/services/app-context";
import { PeriodSwitcher } from "./period-switcher";
import { UserMenu } from "./user-menu";

/**
 * Header halaman: judul di kiri, pemilih periode + profil guru di kanan (desktop);
 * bertumpuk rapi di ponsel. Pemilih periode bisa disembunyikan di halaman yang tidak memakainya.
 */
export function PageHeader({
  title,
  subtitle,
  ctx,
  showPeriod = true,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  ctx: AppContext;
  showPeriod?: boolean;
}) {
  const viewingOther =
    showPeriod &&
    ctx.selectedSemester &&
    ctx.activeSemesterId &&
    ctx.selectedSemester.id !== ctx.activeSemesterId;
  const activeSemester = ctx.semesters.find((s) => s.id === ctx.activeSemesterId);

  return (
    <header className="mb-6 sm:mb-8">
      <div className="flex flex-col-reverse gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-[28px] leading-tight font-extrabold tracking-tight text-navy sm:text-4xl">
            {title}
          </h1>
          {subtitle ? <p className="mt-2 text-base text-ink-muted sm:text-lg">{subtitle}</p> : null}
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 lg:justify-end">
          {showPeriod ? (
            <PeriodSwitcher
              options={ctx.periodOptions}
              selectedId={ctx.selectedSemester?.id ?? null}
              className="min-w-0 flex-1 sm:max-w-[360px] lg:w-auto lg:max-w-none lg:flex-none"
            />
          ) : null}
          {ctx.profile ? (
            <UserMenu displayName={ctx.profile.displayName} schoolName={ctx.profile.schoolName} />
          ) : null}
        </div>
      </div>
      {viewingOther && activeSemester && ctx.selectedSemester ? (
        <p className="mt-4 inline-flex items-start gap-2 rounded-xl bg-primary-softer px-3.5 py-2.5 text-sm text-ink">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            Anda sedang melihat <strong>{semesterLabel(ctx.selectedSemester.number)}</strong>. Semester
            aktif: {semesterLabel(activeSemester.number)}.
          </span>
        </p>
      ) : null}
    </header>
  );
}
