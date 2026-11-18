import Link from "next/link";
import { cn } from "@/lib/utils";

/** Ikon buku terbuka biru, mengikuti logo pada screenshot referensi. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 40" aria-hidden className={cn("h-9 w-auto", className)}>
      <path
        d="M3 6.5C3 4.6 4.7 3.2 6.6 3.5c5.8.9 11.1 3 15.4 6.4v27.3c-4.4-3.3-9.8-5.4-15.6-6.2A3 3 0 0 1 3 28V6.5Z"
        fill="#4B73E6"
      />
      <path
        d="M45 6.5c0-1.9-1.7-3.3-3.6-3c-5.8.9-11.1 3-15.4 6.4v27.3c4.4-3.3 9.8-5.4 15.6-6.2A3 3 0 0 0 45 28V6.5Z"
        fill="#7E9CF0"
      />
    </svg>
  );
}

export function Logo({
  href = "/dashboard",
  withTagline = false,
  className,
}: {
  href?: string;
  withTagline?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-3 rounded-xl", className)}
      aria-label="Rivora — ke Beranda"
    >
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="text-[28px] font-extrabold tracking-tight text-navy">
          rivora<span className="text-mint">.</span>
        </span>
        {withTagline ? (
          <span className="mt-1 text-xs font-medium text-ink-muted">by Riverside Studio</span>
        ) : null}
      </span>
    </Link>
  );
}
