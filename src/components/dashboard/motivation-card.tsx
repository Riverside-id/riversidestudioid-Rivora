import { Star } from "lucide-react";
import { SproutIllustration } from "@/components/illustrations/teacher-illustration";

/** Kartu semangat dekoratif (sesuai referensi). Tidak memuat informasi wajib. */
export function MotivationCard({ salutation }: { salutation: string }) {
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-mint/20 bg-mint-soft p-6 pr-28">
      <Star aria-hidden className="mb-3 size-8 fill-[#F7C548] text-[#F7C548]" />
      <p className="text-xl font-bold text-navy">Terus Semangat, {salutation}!</p>
      <p className="mt-1.5 text-[15px] leading-relaxed text-ink-muted">
        Pendidikan yang baik untuk masa depan anak-anak.
      </p>
      <SproutIllustration className="absolute -right-1 -bottom-2 w-28" />
    </div>
  );
}
