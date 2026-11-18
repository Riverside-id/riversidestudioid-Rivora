export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** Ambil maksimal `limit` item + jumlah sisanya (PRD F02: maks. 3 dengan "Lihat Semua"). */
export function takeWithRemainder<T>(items: T[], limit: number): { visible: T[]; remaining: number } {
  return { visible: items.slice(0, limit), remaining: Math.max(items.length - limit, 0) };
}
