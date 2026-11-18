import { Archive, BookOpen, CalendarDays, ChartColumn, House, Settings, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Navigasi sidebar V1 (PRD §8). Kelola Kelas berada di dalam halaman Jadwal. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Beranda", icon: House },
  { href: "/jadwal", label: "Jadwal", icon: CalendarDays },
  { href: "/materi", label: "Materi", icon: BookOpen },
  { href: "/progres", label: "Progres", icon: ChartColumn },
  { href: "/arsip", label: "Arsip", icon: Archive },
  { href: "/pengaturan", label: "Pengaturan", icon: Settings },
];

export function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
