import "server-only";
import { assertDemoDataAllowed, readDataConfig } from "./config";
import { createFixtureRepository } from "./fixture-repository";
import type { RivoraRepository } from "./repository";

/**
 * Titik tunggal untuk mendapatkan repository di server.
 * Fase B: tambahkan cabang `supabase` yang membuat client Supabase dari cookie sesi.
 */
export function getRepository(): RivoraRepository {
  const config = readDataConfig();
  if (config.source === "supabase") {
    throw new Error(
      "Sumber data Supabase belum diimplementasikan (Fase B). Gunakan RIVORA_DATA_SOURCE=fixture.",
    );
  }
  assertDemoDataAllowed(config);
  return createFixtureRepository(config.scenario);
}

export function isDemoMode(): boolean {
  return readDataConfig().source === "fixture";
}

export type { RivoraRepository } from "./repository";
