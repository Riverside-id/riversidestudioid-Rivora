import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { getRepository } from "@/lib/data";
import { readDataConfig } from "@/lib/data/config";
import { DEFAULT_TIMEZONE, getZonedToday } from "@/lib/date";
import { resolveAppContext } from "@/lib/services/app-context";

export const PERIOD_COOKIE = "rivora_semester";

/**
 * Konteks per-request: repository, periode terpilih, dan tanggal hari ini di zona waktu guru.
 * Membaca cookie → wajib dipanggil di dalam <Suspense> (Cache Components).
 * Fase B: di sinilah sesi Supabase diverifikasi dan pengguna tanpa sesi diarahkan ke /login.
 */
export const getRequestContext = cache(async () => {
  const cookieStore = await cookies();
  const requestedSemesterId = cookieStore.get(PERIOD_COOKIE)?.value ?? null;

  const config = readDataConfig();
  const repo = getRepository();
  const app = await resolveAppContext(repo, { requestedSemesterId });
  const today = config.demoToday ?? getZonedToday(app.profile?.timezone ?? DEFAULT_TIMEZONE);

  return { repo, app, today, isDemo: repo.source === "fixture" };
});

export type RequestContext = Awaited<ReturnType<typeof getRequestContext>>;
