import { NextResponse, type NextRequest } from "next/server";
import { getDataAccess } from "@/lib/data";
import { MEETING_STATUS_LABEL, semesterLabel } from "@/lib/domain/labels";
import { getTeachingReport, toCsv } from "@/lib/services/report";

/**
 * Ekspor CSV laporan mengajar (F11). Data diambil ulang di server untuk guru yang login (RLS),
 * dengan filter yang sama seperti halaman laporan. jenis=ringkasan → per kelas; selain itu per pertemuan.
 */
export async function GET(request: NextRequest) {
  const access = await getDataAccess();
  if (!access.repo) return NextResponse.redirect(new URL("/login", request.nextUrl.origin));

  const sp = request.nextUrl.searchParams;
  const report = await getTeachingReport(access.repo, {
    yearId: sp.get("tahun") ?? undefined,
    semesterId: sp.get("semester") ?? undefined,
    classId: sp.get("kelas") ?? undefined,
    from: sp.get("dari") ?? undefined,
    to: sp.get("sampai") ?? undefined,
  });
  const yearLabel = report.year?.label ?? "-";
  const semesterText = report.semester ? semesterLabel(report.semester.number) : "Semua semester";
  const summary = sp.get("jenis") === "ringkasan";

  const rows = summary
    ? [
        ["Tahun ajaran", "Semester", "Kelas", "Pertemuan direncanakan", "Selesai", "Ditunda", "Batal", "Progres pelaksanaan"],
        ...report.classes.map((c) => [
          yearLabel,
          semesterText,
          c.classLabel + (c.archived ? " (diarsipkan)" : ""),
          c.plannedSessions,
          c.completed,
          c.postponed,
          c.cancelled,
          c.progress.kind === "planned" ? `${c.progress.percent}%` : "Belum ada rencana",
        ]),
      ]
    : [
        ["Tahun ajaran", "Semester", "Tanggal", "Jam", "Kelas", "Topik", "Status", "Ringkasan", "Catatan"],
        ...report.meetings.map((m) => [
          yearLabel,
          semesterLabel(m.semesterNumber),
          m.date,
          m.startTime && m.endTime ? `${m.startTime}-${m.endTime}` : "",
          m.classLabel,
          m.topic ?? "",
          MEETING_STATUS_LABEL[m.status],
          m.summary ?? "",
          m.notes ?? "",
        ]),
      ];

  const safe = (s: string) => s.replace(/[^0-9A-Za-z-]+/g, "-").replace(/^-+|-+$/g, "");
  const filename = `laporan-mengajar-${summary ? "ringkasan" : "pertemuan"}-${safe(yearLabel)}-${safe(semesterText)}.csv`;
  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
