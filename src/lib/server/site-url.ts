import "server-only";
import { headers } from "next/headers";

/**
 * Origin situs untuk tautan di email Auth (emailRedirectTo / redirectTo).
 * Prioritas: NEXT_PUBLIC_SITE_URL (set di Netlify per konteks) → header request (lokal/preview).
 * URL ini juga harus terdaftar di Supabase → Auth → URL Configuration → Redirect URLs.
 */
export async function getSiteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}
