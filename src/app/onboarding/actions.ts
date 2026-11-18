"use server";

import { readDataConfig } from "@/lib/data/config";
import { getDataAccess } from "@/lib/data";
import { SESSION_EXPIRED_MESSAGE, errorState } from "@/lib/server/mutation-context";
import { buildOnboardingPayload, onboardingDraftSchema } from "@/lib/validation/onboarding-submit";

export type OnboardingResult = { ok: true } | { ok: false; message: string };

/** Simpan hasil wizard dalam satu transaksi (RPC complete_onboarding). */
export async function completeOnboardingAction(draft: unknown): Promise<OnboardingResult> {
  const parsed = onboardingDraftSchema.safeParse(draft);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Data pengaturan awal belum lengkap." };
  }
  if (readDataConfig().source === "fixture") return { ok: true };

  const access = await getDataAccess();
  if (!access.mutations) return { ok: false, message: SESSION_EXPIRED_MESSAGE };

  try {
    await access.mutations.completeOnboarding(buildOnboardingPayload(parsed.data));
    return { ok: true };
  } catch (error) {
    const state = errorState(error);
    return { ok: false, message: state.status === "error" && state.message ? state.message : "Gagal menyimpan." };
  }
}
