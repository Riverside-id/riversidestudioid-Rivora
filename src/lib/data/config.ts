import { isISODate } from "@/lib/date";
import type { DemoScenario } from "./fixtures/demo-data";
import type { DataSource } from "./repository";

/**
 * Konfigurasi sumber data dari environment. Dipisah dari `index.ts` (server-only)
 * agar bisa diuji unit.
 */
export interface DataConfig {
  source: DataSource;
  scenario: DemoScenario;
  /** Tanggal "hari ini" tetap untuk demo/screenshot. Hanya berlaku pada mode fixture. */
  demoToday: string | null;
  allowDemoInProduction: boolean;
  isProductionBuild: boolean;
}

export function readDataConfig(env: Record<string, string | undefined> = process.env): DataConfig {
  const source: DataSource = env.RIVORA_DATA_SOURCE === "supabase" ? "supabase" : "fixture";
  const scenario: DemoScenario = env.RIVORA_DEMO_SCENARIO === "kosong" ? "kosong" : "lengkap";
  const demoToday =
    source === "fixture" && env.RIVORA_DEMO_TODAY && isISODate(env.RIVORA_DEMO_TODAY)
      ? env.RIVORA_DEMO_TODAY
      : null;
  return {
    source,
    scenario,
    demoToday,
    allowDemoInProduction: env.RIVORA_ALLOW_DEMO_DATA === "true",
    isProductionBuild: env.NODE_ENV === "production",
  };
}

export class DemoDataNotAllowedError extends Error {
  constructor() {
    super(
      "Data demo tidak diizinkan pada build production. Hubungkan Supabase (Fase B) atau set " +
        "RIVORA_ALLOW_DEMO_DATA=true khusus untuk deploy preview.",
    );
    this.name = "DemoDataNotAllowedError";
  }
}

/** PRD §8: angka/persentase demo tidak boleh tampil di production. */
export function assertDemoDataAllowed(config: DataConfig): void {
  if (config.source === "fixture" && config.isProductionBuild && !config.allowDemoInProduction) {
    throw new DemoDataNotAllowedError();
  }
}
