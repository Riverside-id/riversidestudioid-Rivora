import { semesterLabel, semesterShortLabel } from "@/lib/domain/labels";
import type { AcademicYear, Profile, Semester } from "@/lib/domain/types";
import type { RivoraRepository } from "@/lib/data/repository";

export interface PeriodOption {
  semesterId: string;
  /** "2026/2027 · Semester 1 (Ganjil)" */
  label: string;
  /** "2026/2027 · Ganjil" — untuk layar sempit. */
  shortLabel: string;
  isActive: boolean;
}

export interface AppContext {
  profile: Profile | null;
  activeYear: AcademicYear | null;
  semesters: Semester[];
  /** Semester yang sedang DILIHAT (boleh berbeda dari semester aktif untuk melihat histori). */
  selectedSemester: Semester | null;
  activeSemesterId: string | null;
  periodOptions: PeriodOption[];
}

/**
 * Menentukan periode yang ditampilkan. Pilihan dibatasi pada semester di tahun ajaran AKTIF;
 * tahun arsip hanya dibuka lewat menu Arsip (baca-saja), sehingga cookie yang dimanipulasi
 * tidak dapat membuka tahun arsip di layar biasa.
 */
export async function resolveAppContext(
  repo: RivoraRepository,
  { requestedSemesterId }: { requestedSemesterId: string | null },
): Promise<AppContext> {
  const [profile, years] = await Promise.all([repo.getProfile(), repo.listAcademicYears()]);
  const activeYear = years.find((y) => y.status === "active") ?? null;
  const semesters = activeYear ? await repo.listSemesters(activeYear.id) : [];
  const activeSemesterId = activeYear?.activeSemesterId ?? null;

  const selectedSemester =
    semesters.find((s) => s.id === requestedSemesterId) ??
    semesters.find((s) => s.id === activeSemesterId) ??
    semesters[0] ??
    null;

  const periodOptions: PeriodOption[] = activeYear
    ? semesters.map((s) => ({
        semesterId: s.id,
        label: `${activeYear.label} · ${semesterLabel(s.number)}`,
        shortLabel: `${activeYear.label} · ${semesterShortLabel(s.number)}`,
        isActive: s.id === activeSemesterId,
      }))
    : [];

  return { profile, activeYear, semesters, selectedSemester, activeSemesterId, periodOptions };
}
