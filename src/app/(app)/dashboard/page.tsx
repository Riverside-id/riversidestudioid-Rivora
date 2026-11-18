import { BookOpen, CalendarCheck, Users } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ClassProgressCard } from "@/components/dashboard/class-progress-card";
import { MotivationCard } from "@/components/dashboard/motivation-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { TodayScheduleCard } from "@/components/dashboard/today-schedule-card";
import { TeacherIllustration } from "@/components/illustrations/teacher-illustration";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/ui/skeleton";
import { salutationOf } from "@/lib/domain/labels";
import { getRequestContext } from "@/lib/server/request-context";
import { getDashboardData } from "@/lib/services/dashboard";

export const metadata: Metadata = { title: "Beranda" };

export default function DashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton label="Memuat beranda…" />}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const { repo, app, today } = await getRequestContext();
  if (!app.profile) redirect("/onboarding");

  const data = await getDashboardData(repo, app, today);

  return (
    <>
      <PageHeader
        ctx={app}
        title={
          <>
            Selamat Datang, {app.profile.displayName}! <span aria-hidden>👋</span>
          </>
        }
        subtitle="Semoga hari mengajar hari ini berjalan lancar."
      />

      <div className="grid gap-5 lg:gap-6 xl:grid-cols-3">
        <div className="grid grid-cols-3 gap-3 sm:gap-5 lg:gap-6 xl:col-span-3">
          <StatCard icon={Users} tone="primary" label="Kelas Aktif" value={data.stats.activeClasses} unit="kelas" />
          <StatCard
            icon={CalendarCheck}
            tone="mint"
            label="Jadwal Hari Ini"
            value={data.stats.todaySessions}
            unit="sesi"
          />
          <StatCard
            icon={BookOpen}
            tone="violet"
            label="Materi Tersimpan"
            value={data.stats.savedMaterials}
            unit="materi"
          />
        </div>

        <div className="space-y-5 lg:space-y-6 xl:col-span-2">
          <TodayScheduleCard
            sessions={data.todaySessions}
            today={data.today}
            hasClasses={data.stats.activeClasses > 0}
            todayInSemester={data.todayInSelectedSemester}
          />
          <ClassProgressCard items={data.classProgress} />
        </div>

        <aside aria-hidden className="hidden flex-col justify-between gap-6 xl:flex">
          <div className="flex flex-1 items-center justify-center px-2">
            <TeacherIllustration className="max-w-[380px]" />
          </div>
          <MotivationCard salutation={salutationOf(app.profile.displayName)} />
        </aside>
      </div>
    </>
  );
}
