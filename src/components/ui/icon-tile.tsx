import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type Tone = "primary" | "mint" | "violet";

export const toneClasses: Record<Tone, { tile: string; icon: string; bar: string; text: string }> = {
  primary: { tile: "bg-primary-soft", icon: "text-primary", bar: "bg-primary", text: "text-primary-strong" },
  mint: { tile: "bg-mint-soft", icon: "text-mint", bar: "bg-mint", text: "text-mint-strong" },
  violet: { tile: "bg-violet-soft", icon: "text-violet", bar: "bg-violet", text: "text-violet-strong" },
};

const TILE_SIZE = {
  md: "size-11",
  lg: "size-14 sm:size-[72px]",
  stat: "size-11 sm:size-14 xl:size-[72px]",
} as const;

const ICON_SIZE = {
  md: "size-5",
  lg: "size-7 sm:size-9",
  stat: "size-6 sm:size-7 xl:size-9",
} as const;

export function IconTile({
  icon: Icon,
  tone = "primary",
  size = "lg",
  className,
}: {
  icon: LucideIcon;
  tone?: Tone;
  size?: "md" | "lg" | "stat";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-2xl",
        TILE_SIZE[size],
        toneClasses[tone].tile,
        className,
      )}
    >
      <Icon
        className={cn(ICON_SIZE[size], toneClasses[tone].icon)}
        strokeWidth={2}
      />
    </span>
  );
}
