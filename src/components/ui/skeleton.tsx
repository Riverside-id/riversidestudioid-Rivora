import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-xl bg-[#e9eef8]", className)} />;
}

/** Kerangka halaman umum saat data dimuat. */
export function PageSkeleton({ label = "Memuat data…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <span className="sr-only">{label}</span>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-9 w-72 max-w-full" />
          <Skeleton className="h-5 w-96 max-w-full" />
        </div>
        <Skeleton className="h-12 w-64" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-28 rounded-3xl" />
        <Skeleton className="h-28 rounded-3xl" />
        <Skeleton className="h-28 rounded-3xl" />
      </div>
      <Skeleton className="h-72 rounded-3xl" />
    </div>
  );
}
