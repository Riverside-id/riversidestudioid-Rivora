import "server-only";
import { connection } from "next/server";
import { createSupabaseServerClient, getVerifiedUserId, type RivoraSupabaseClient } from "@/lib/supabase/server";
import { assertDemoDataAllowed, readDataConfig } from "./config";
import { createFixtureRepository } from "./fixture-repository";
import { createSupabaseMutations, type RivoraMutations } from "./mutations";
import type { DataSource, RivoraRepository } from "./repository";
import { createSupabaseRepository } from "./supabase-repository";

export type DataAccess =
  | { source: "fixture"; repo: RivoraRepository; mutations: null; userId: null; client: null }
  | {
      source: "supabase";
      repo: RivoraRepository;
      mutations: RivoraMutations;
      userId: string;
      client: RivoraSupabaseClient;
    }
  | { source: "supabase"; repo: null; mutations: null; userId: null; client: RivoraSupabaseClient };

/**
 * Titik tunggal akses data di server.
 * - fixture  : data demo (ditolak di production kecuali RIVORA_ALLOW_DEMO_DATA=true).
 * - supabase : client per-request dari cookie sesi; userId diverifikasi lewat getClaims().
 *              Bila tidak ada sesi, repo/mutations bernilai null — pemanggil wajib mengarahkan ke /login.
 */
export async function getDataAccess(): Promise<DataAccess> {
  // Data guru selalu per-request: jangan pernah diprerender saat build (Cache Components).
  await connection();
  const config = readDataConfig();
  if (config.source === "supabase") {
    const client = await createSupabaseServerClient();
    const userId = await getVerifiedUserId(client);
    if (!userId) return { source: "supabase", repo: null, mutations: null, userId: null, client };
    return {
      source: "supabase",
      repo: createSupabaseRepository(client, userId),
      mutations: createSupabaseMutations(client, userId),
      userId,
      client,
    };
  }
  assertDemoDataAllowed(config);
  return { source: "fixture", repo: createFixtureRepository(config.scenario), mutations: null, userId: null, client: null };
}

export function currentDataSource(): DataSource {
  return readDataConfig().source;
}

export function isDemoMode(): boolean {
  return currentDataSource() === "fixture";
}

export type { RivoraRepository } from "./repository";
