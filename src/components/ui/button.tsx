import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "soft" | "ghost";
type Size = "md" | "sm" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors " +
  "disabled:cursor-not-allowed disabled:opacity-55 select-none whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-strong shadow-[0_6px_16px_-8px_rgb(75_115_230/0.7)]",
  secondary: "border border-line bg-white text-ink hover:border-primary/40 hover:bg-primary-softer",
  soft: "bg-primary-softer text-ink hover:bg-primary-soft",
  ghost: "text-ink-muted hover:bg-primary-softer hover:text-ink",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-12 px-6 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
