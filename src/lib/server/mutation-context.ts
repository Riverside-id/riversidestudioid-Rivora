import "server-only";
import { cookies } from "next/headers";
import { getDataAccess } from "@/lib/data";
import { DataError, DemoReadOnlyError } from "@/lib/data/errors";
import type { RivoraMutations } from "@/lib/data/mutations";
import type { RivoraRepository } from "@/lib/data/repository";
import type { RivoraSupabaseClient } from "@/lib/supabase/server";
import { resolveAppContext, type AppContext } from "@/lib/services/app-context";
import type { ActionState } from "@/lib/validation/action-state";
import { PERIOD_COOKIE } from "./request-context";

export const SESSION_EXPIRED_MESSAGE = "Sesi Anda sudah berakhir. Silakan masuk lagi.";

type MutationContext =
  | {
      ok: true;
      mutations: RivoraMutations;
      repo: RivoraRepository;
      client: RivoraSupabaseClient;
      app: AppContext;
    }
  | { ok: false; state: ActionState };

/**
 * Konteks untuk Server Action yang menulis data. Tahun ajaran & semester SELALU diambil dari
 * sesi di server (bukan dari input browser).
 */
export async function getMutationContext(): Promise<MutationContext> {
  const access = await getDataAccess();
  if (access.source === "fixture") {
    return { ok: false, state: { status: "error", message: new DemoReadOnlyError().message } };
  }
  if (!access.repo) return { ok: false, state: { status: "error", message: SESSION_EXPIRED_MESSAGE } };

  const requestedSemesterId = (await cookies()).get(PERIOD_COOKIE)?.value ?? null;
  const app = await resolveAppContext(access.repo, { requestedSemesterId });
  return { ok: true, mutations: access.mutations, repo: access.repo, client: access.client, app };
}

/** Ubah error menjadi state form; error tak terduga tidak membocorkan detail teknis. */
export function errorState(error: unknown): ActionState {
  if (error instanceof DataError) return { status: "error", message: error.message };
  console.error("[rivora] aksi gagal:", error instanceof Error ? error.name : "unknown");
  return { status: "error", message: "Terjadi kesalahan. Coba lagi." };
}
