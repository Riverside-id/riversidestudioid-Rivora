import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";
import { OnboardingClient } from "@/components/onboarding/onboarding-client";

export const metadata: Metadata = { title: "Pengaturan Awal" };

export default function OnboardingPage() {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -top-56 -right-40 size-[560px] rounded-full bg-primary-soft/55" />
      <div className="relative mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-8 flex items-center justify-between">
          <Logo href="/" withTagline />
          <span className="text-sm font-medium text-ink-muted">Pengaturan awal · ±3 menit</span>
        </div>
        <OnboardingClient />
      </div>
    </div>
  );
}
