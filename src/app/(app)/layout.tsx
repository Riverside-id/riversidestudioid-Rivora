import type { ReactNode } from "react";
import { DemoBanner } from "@/components/layout/demo-banner";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Sidebar } from "@/components/layout/sidebar";
import { isDemoMode } from "@/lib/data";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:font-semibold focus:shadow-[var(--shadow-pop)]"
      >
        Lewati ke konten utama
      </a>
      <Sidebar />
      <MobileHeader />
      <div className="relative min-h-dvh overflow-x-clip lg:pl-[272px]">
        {/* Lengkung biru lembut di kanan atas (dekoratif, sesuai referensi). */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-56 -right-40 size-[560px] rounded-full bg-primary-soft/55"
        />
        <main
          id="konten"
          className="relative mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10"
        >
          {isDemoMode() ? <DemoBanner /> : null}
          {children}
        </main>
      </div>
    </div>
  );
}
