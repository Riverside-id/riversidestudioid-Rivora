import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDataAccess } from "@/lib/data";
import { readDataConfig } from "@/lib/data/config";
import { DEFAULT_TIMEZONE, getZonedToday } from "@/lib/date";
import { resolveAppContext } from "@/lib/services/app-context";

export const PERIOD_COOKIE = "rivora_semester";

/**
 * Konteks per-request untuk halaman setelah login: repository, periode terpilih, tanggal hari ini.
 * Membaca cookie → wajib dipanggil di dalam <Suspense> (Cache Components).
 *
 * Mode Supabase: tanpa sesi → /login; belum menyelesaikan wizard → /onboarding.
 * Ini otorisasi di server (bukan hanya proxy), dan RLS tetap menjadi penjaga terakhir.
 */
export const getRequestContext = cache(async () => {
  const cookieStore = await cookies();
  const requestedSemesterId = cookieStore.get(PERIOD_COOKIE)?.value ?? null;

  const access = await getDataAccess();
  if (!access.repo) redirect("/login");

  const app = await resolveAppContext(access.repo, { requestedSemesterId });
  if (access.source === "supabase" && (!app.profile || !app.profile.onboardedAt)) redirect("/onboarding");

  const config = readDataConfig();
  const today = config.demoToday ?? getZonedToday(app.profile?.timezone ?? DEFAULT_TIMEZONE);

  return {
    repo: access.repo,
    mutations: access.mutations,
    app,
    today,
    isDemo: access.source === "fixture",
  };
});

export type RequestContext = Awaited<ReturnType<typeof getRequestContext>>;
