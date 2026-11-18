import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { requireSupabaseEnv } from "./env";

export type RivoraSupabaseClient = SupabaseClient<Database>;

/**
 * Client Supabase per-request untuk Server Component, Server Action, dan Route Handler.
 * Sesi dibaca dari cookie; RLS di database memastikan guru hanya mengakses datanya sendiri.
 */
export async function createSupabaseServerClient(): Promise<RivoraSupabaseClient> {
  const { url, publishableKey } = requireSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Dipanggil dari Server Component (cookie read-only). Aman diabaikan karena
          // proxy.ts menyegarkan sesi pada setiap request.
        }
      },
    },
  });
}

/** ID guru yang terverifikasi (JWT diverifikasi lewat getClaims), atau null. */
export async function getVerifiedUserId(client: RivoraSupabaseClient): Promise<string | null> {
  const { data, error } = await client.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return data.claims.sub;
}
