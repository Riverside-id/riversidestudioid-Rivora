import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { TeacherIllustration } from "@/components/illustrations/teacher-illustration";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(420px,0.9fr)]">
      <main className="flex flex-col px-5 py-6 sm:px-10 sm:py-8">
        <Logo href="/" withTagline />
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[440px]">{children}</div>
        </div>
      </main>
      <aside aria-hidden className="relative hidden overflow-hidden bg-primary-softer lg:flex lg:flex-col lg:items-center lg:justify-center lg:px-10">
        <div className="pointer-events-none absolute -top-40 -right-32 size-[460px] rounded-full bg-primary-soft" />
        <div className="relative w-full max-w-[400px]">
          <TeacherIllustration />
        </div>
        <p className="relative mt-6 text-center text-3xl font-extrabold text-navy">
          Atur Kelas, Fokus Mengajar.
        </p>
        <p className="relative mt-2 max-w-sm text-center text-ink-muted">
          Jadwal, materi, dan catatan mengajar Matematika SD dalam satu tempat.
        </p>
      </aside>
    </div>
  );
}
