import type { MaterialKind, MeetingStatus, MidtermSegment, SemesterNumber, Weekday } from "./types";

export const WEEKDAY_LABEL: Record<Weekday, string> = {
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
  7: "Minggu",
};

export const MEETING_STATUS_LABEL: Record<MeetingStatus, string> = {
  scheduled: "Terjadwal",
  completed: "Selesai",
  postponed: "Ditunda",
  cancelled: "Batal",
};

export const MATERIAL_KIND_LABEL: Record<MaterialKind, string> = {
  pdf: "PDF",
  doc: "Word",
  docx: "Word",
  ppt: "PPT",
  pptx: "PPTX",
  video: "Video",
  link: "Tautan",
  note: "Catatan",
};

/** Istilah default; PRD §6 mengizinkan diganti (mis. "Asesmen Tengah Semester") tanpa ubah data. */
export const DEFAULT_MIDTERM_TERM = "UTS/PTS";

export function semesterLabel(number: SemesterNumber): string {
  return number === 1 ? "Semester 1 (Ganjil)" : "Semester 2 (Genap)";
}

export function semesterShortLabel(number: SemesterNumber): string {
  return number === 1 ? "Ganjil" : "Genap";
}

export function midtermSegmentLabel(
  segment: MidtermSegment,
  term: string = DEFAULT_MIDTERM_TERM,
): string {
  return segment === "before" ? `Sebelum ${term}` : `Setelah ${term}`;
}

/** "Bu Sari" → "Bu", "Pak Andi" → "Pak"; selain itu nama panggilan apa adanya. */
export function salutationOf(displayName: string): string {
  const first = displayName.trim().split(/\s+/)[0] ?? "";
  const honorifics: Record<string, string> = { bu: "Bu", ibu: "Bu", pak: "Pak", bapak: "Pak" };
  return honorifics[first.toLowerCase()] ?? displayName.trim();
}

export function initialsOf(displayName: string): string {
  const words = displayName
    .trim()
    .split(/\s+/)
    .filter((w) => !["bu", "ibu", "pak", "bapak"].includes(w.toLowerCase()));
  const source = words.length > 0 ? words : displayName.trim().split(/\s+/);
  return source
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}
