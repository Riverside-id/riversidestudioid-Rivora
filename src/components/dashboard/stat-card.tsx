import type { LucideIcon } from "lucide-react";
import { IconTile, type Tone } from "@/components/ui/icon-tile";

export function StatCard({
  icon,
  tone,
  label,
  value,
  unit,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="card flex flex-col items-center gap-2 p-3 text-center sm:flex-row sm:gap-4 sm:p-5 sm:text-left xl:gap-5 xl:p-6">
      <IconTile icon={icon} tone={tone} size="stat" />
      <div className="min-w-0">
        <p className="text-[13px] leading-tight font-semibold text-ink sm:text-[15px] xl:text-[17px]">{label}</p>
        <p className="mt-1 flex items-baseline justify-center gap-1.5 sm:justify-start sm:gap-2">
          <span className="text-[28px] leading-none font-extrabold text-navy sm:text-4xl xl:text-[40px]">
            {value}
          </span>
          <span className="text-sm font-medium text-ink-muted sm:text-[15px]">{unit}</span>
        </p>
      </div>
    </div>
  );
}
