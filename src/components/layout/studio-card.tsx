import { Heart } from "lucide-react";

/** Kartu kecil "Dari Riverside Studio" di dasar sidebar (sesuai referensi). */
export function StudioCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-white px-5 py-4 shadow-[var(--shadow-card)]">
      <Heart aria-hidden className="mb-1.5 size-4 text-ink" strokeWidth={2} />
      <p className="text-sm leading-snug text-ink">
        Dari
        <br />
        <span className="font-semibold">Riverside Studio</span>
      </p>
      <svg
        aria-hidden
        viewBox="0 0 120 50"
        className="pointer-events-none absolute -right-2 -bottom-2 h-14 w-28"
      >
        <path d="M0 50 C30 30 50 42 72 26 C90 13 105 18 120 8 L120 50 Z" fill="#EAF0FD" />
        <path d="M30 50 C55 38 75 46 95 32 C105 25 112 26 120 22 L120 50 Z" fill="#DCE5FB" />
      </svg>
    </div>
  );
}
