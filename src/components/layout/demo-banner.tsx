import { FlaskConical } from "lucide-react";

/** Penanda jelas bahwa semua angka adalah data contoh (PRD §8: bukan angka demo di production). */
export function DemoBanner() {
  return (
    <div
      role="note"
      className="mb-6 flex items-start gap-2.5 rounded-2xl border border-amber-strong/15 bg-amber-soft px-4 py-2.5 text-sm text-amber-strong"
    >
      <FlaskConical aria-hidden className="mt-0.5 size-4 shrink-0" />
      <p>
        <strong className="font-semibold">Data demo.</strong> Semua nama, jadwal, dan angka di halaman ini
        adalah contoh untuk pengembangan — belum tersambung ke akun dan database sungguhan.
      </p>
    </div>
  );
}
