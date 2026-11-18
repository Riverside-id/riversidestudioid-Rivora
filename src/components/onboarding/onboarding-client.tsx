"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/** Wizard membaca draf dari localStorage → dirender hanya di browser agar tidak ada hydration mismatch. */
export const OnboardingClient = dynamic(
  () => import("./onboarding-wizard").then((m) => m.OnboardingWizard),
  {
    ssr: false,
    loading: () => (
      <div role="status" className="card space-y-5 p-8">
        <span className="sr-only">Memuat pengaturan awal…</span>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    ),
  },
);
