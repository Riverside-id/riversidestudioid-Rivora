import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { OnboardingClient } from "@/components/onboarding/onboarding-client";
import { Skeleton } from "@/components/ui/skeleton";
import { getDataAccess } from "@/lib/data";

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
        <Suspense
          fallback={
            <div role="status" className="card space-y-5 p-8">
              <span className="sr-only">Memuat pengaturan awal…</span>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          }
        >
          <OnboardingGate />
        </Suspense>
      </div>
    </div>
  );
}

/** Mode Supabase: wajib login; yang sudah selesai onboarding langsung ke Beranda. */
async function OnboardingGate() {
  const access = await getDataAccess();
  if (access.source === "fixture") return <OnboardingClient demo initialDisplayName="" />;
  if (!access.repo) redirect("/login");
  const profile = await access.repo.getProfile();
  if (profile?.onboardedAt) redirect("/dashboard");
  return <OnboardingClient demo={false} initialDisplayName={profile?.displayName ?? ""} />;
}
