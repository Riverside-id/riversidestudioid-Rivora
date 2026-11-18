import { ProgressBar } from "@/components/ui/progress-bar";
import type { Tone } from "@/components/ui/icon-tile";
import type { ClassProgressItem } from "@/lib/services/dashboard";

const TONES: Tone[] = ["primary", "mint", "violet"];

/**
 * Daftar progres pelaksanaan per kelas.
 * - Tanpa rencana → "Belum ada rencana" (bukan 0% tanpa penjelasan, F08).
 * - Selalu tampil pembilang/penyebut agar tidak dibaca sebagai nilai siswa.
 */
export function ClassProgressList({ items }: { items: ClassProgressItem[] }) {
  return (
    <ul className="divide-y divide-line/70">
      {items.map((item, index) => {
        const tone = TONES[index % TONES.length];
        const label = `Kelas ${item.classLabel} – Matematika`;
        return (
          <li
            key={item.classId}
            className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 py-3.5 first:pt-0 last:pb-0 md:grid-cols-[minmax(170px,220px)_1fr_auto]"
          >
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-ink sm:text-base">{label}</p>
              <p className="text-sm text-ink-muted">
                {item.progress.kind === "planned"
                  ? `${item.progress.completed}/${item.progress.planned} pertemuan selesai`
                  : "Rencana materi belum dibuat"}
              </p>
            </div>

            {item.progress.kind === "planned" ? (
              <>
                <span className="text-right text-lg font-bold text-ink tabular-nums md:order-last">
                  {item.progress.percent}%
                </span>
                <ProgressBar
                  className="col-span-2 md:col-span-1"
                  value={item.progress.percent}
                  tone={tone}
                  label={`Progres pelaksanaan ${label}`}
                  valueText={`${item.progress.completed} dari ${item.progress.planned} pertemuan selesai`}
                />
              </>
            ) : (
              <span className="rounded-full bg-primary-softer px-3 py-1 text-sm font-semibold text-ink-muted md:col-span-2 md:justify-self-end">
                Belum ada rencana
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
