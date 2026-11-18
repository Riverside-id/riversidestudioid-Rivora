import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";
import { readSupabaseEnv } from "./env";

/** Halaman yang wajib login (pemeriksaan optimistis; otorisasi sebenarnya di server + RLS). */
const PROTECTED_PREFIXES = ["/dashboard", "/jadwal", "/materi", "/progres", "/arsip", "/pengaturan", "/onboarding"];
/** Halaman tamu: guru yang sudah login diarahkan ke Beranda. */
const GUEST_ONLY = ["/login", "/register"];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Menyegarkan sesi Supabase di setiap request (token refresh → cookie baru) dan melakukan
 * pengalihan optimistis. Pada mode data demo (fixture) proxy tidak melakukan apa pun.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  if (process.env.RIVORA_DATA_SOURCE !== "supabase") return NextResponse.next({ request });
  const env = readSupabaseEnv();
  if (!env) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });

  // Jangan menaruh logika lain di antara pembuatan client dan getClaims (rekomendasi Supabase).
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims?.sub);
  const { pathname } = request.nextUrl;

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  };

  if (!isSignedIn && isProtectedPath(pathname)) return redirectTo("/login");
  if (isSignedIn && GUEST_ONLY.includes(pathname)) return redirectTo("/dashboard");

  return response;
}
