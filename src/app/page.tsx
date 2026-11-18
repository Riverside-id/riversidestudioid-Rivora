import { ArrowRight, BookOpen, CalendarCheck, ChartColumn } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { TeacherIllustration } from "@/components/illustrations/teacher-illustration";
import { ButtonLink } from "@/components/ui/button";

/**
 * Landing ringan. Fase B: pengguna yang sudah login diarahkan langsung ke /dashboard (via proxy/sesi).
 */
export default function HomePage() {
  const points = [
    { icon: CalendarCheck, text: "Tahu hari ini mengajar di kelas mana dan jam berapa." },
    { icon: BookOpen, text: "Buka materi yang tepat untuk setiap kelas." },
    { icon: ChartColumn, text: "Catat yang benar-benar terlaksana, per kelas dan semester." },
  ];

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -top-56 -right-40 size-[620px] rounded-full bg-primary-soft/60" />
      <div className="relative mx-auto flex min-h-dvh max-w-6xl flex-col px-5 py-6 sm:px-8 sm:py-8">
        <header className="flex items-center justify-between">
          <Logo href="/" withTagline />
          <ButtonLink href="/login" variant="secondary" size="sm">
            Masuk
          </ButtonLink>
        </header>

        <main className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="mb-4 inline-flex rounded-full bg-mint-soft px-3.5 py-1.5 text-sm font-semibold text-mint-strong">
              Untuk guru Matematika SD
            </p>
            <h1 className="text-4xl leading-[1.1] font-extrabold tracking-tight text-navy sm:text-5xl lg:text-6xl">
              Atur Kelas,
              <br />
              Fokus Mengajar.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink-muted">
              Rivora menyatukan jadwal mengajar, materi, dan catatan pelaksanaan pembelajaran di semua
              kelas Anda — sederhana, rapi, dan mudah dibaca.
            </p>
            <ul className="mt-7 space-y-3">
              {points.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3 text-base text-ink">
                  <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                    <Icon className="size-5" />
                  </span>
                  <span className="pt-1.5">{text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="/login" size="lg">
                Masuk ke Rivora
                <ArrowRight aria-hidden className="size-5" />
              </ButtonLink>
              <ButtonLink href="/register" variant="secondary" size="lg">
                Daftar Akun Guru
              </ButtonLink>
            </div>
          </div>
          <div className="hidden justify-center lg:flex">
            <TeacherIllustration className="max-w-[440px]" />
          </div>
        </main>

        <footer className="text-sm text-ink-muted">Rivora by Riverside Studio</footer>
      </div>
    </div>
  );
}
