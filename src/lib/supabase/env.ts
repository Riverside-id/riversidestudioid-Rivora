/**
 * Konfigurasi Supabase dari environment. Hanya kunci *publishable* yang dipakai aplikasi;
 * kunci rahasia (service role / secret key) tidak pernah dibaca di sini dan tidak boleh
 * diberi awalan NEXT_PUBLIC_.
 */
export interface SupabaseEnv {
  url: string;
  publishableKey: string;
}

export function readSupabaseEnv(env: Record<string, string | undefined> = process.env): SupabaseEnv | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}

export function requireSupabaseEnv(): SupabaseEnv {
  const env = readSupabaseEnv();
  if (!env) {
    throw new Error(
      "Supabase belum dikonfigurasi: isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY " +
        "(lihat .env.example), atau gunakan RIVORA_DATA_SOURCE=fixture untuk data demo.",
    );
  }
  return env;
}
