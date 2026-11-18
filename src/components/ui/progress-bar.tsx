import { cn } from "@/lib/utils";
import { toneClasses, type Tone } from "./icon-tile";

export function ProgressBar({
  value,
  tone = "primary",
  label,
  valueText,
  className,
}: {
  /** 0–100 */
  value: number;
  tone?: Tone;
  label: string;
  valueText: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-valuetext={valueText}
      className={cn("h-2.5 w-full overflow-hidden rounded-full bg-[#edf1f8]", className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", toneClasses[tone].bar)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
