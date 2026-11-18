/**
 * Validasi tautan materi (video & referensi). Hanya http/https; skema berbahaya (javascript:, data:,
 * file:, vbscript:) dan kredensial di URL ditolak. Database menegakkan aturan yang sama (http/https).
 */

export const MAX_URL_LENGTH = 2000;
export const URL_ERROR = "Tautan tidak valid. Salin alamat lengkap, contoh https://www.youtube.com/watch?v=…";

export type LinkCheck = { ok: true; url: string; host: string } | { ok: false; message: string };

export function checkExternalUrl(input: string): LinkCheck {
  const raw = input.trim();
  if (!raw) return { ok: false, message: "Isi alamat tautan." };
  // Tanpa skema ("youtube.com/…") → anggap https. Skema lain selain http(s) ditolak.
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw);
  if (hasScheme && !/^https?:\/\//i.test(raw)) return { ok: false, message: URL_ERROR };
  let parsed: URL;
  try {
    parsed = new URL(hasScheme ? raw : `https://${raw}`);
  } catch {
    return { ok: false, message: URL_ERROR };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return { ok: false, message: URL_ERROR };
  if (parsed.username || parsed.password) return { ok: false, message: URL_ERROR };
  if (!parsed.hostname.includes(".") && parsed.hostname !== "localhost") return { ok: false, message: URL_ERROR };
  const url = parsed.href;
  if (url.length > MAX_URL_LENGTH) return { ok: false, message: "Tautan terlalu panjang (maks. 2.000 karakter)." };
  return { ok: true, url, host: parsed.hostname.replace(/^www\./, "") };
}

/** Nama situs singkat untuk ditampilkan di kartu ("youtube.com"). */
export function linkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
