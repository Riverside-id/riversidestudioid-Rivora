import { describe, expect, it } from "vitest";
import { createFixtureRepository } from "@/lib/data/fixture-repository";
import { csvCell, getTeachingReport, toCsv } from "@/lib/services/report";

describe("CSV laporan", () => {
  it("UTF-8 BOM, pemisah titik koma, kutip & baris baru aman", () => {
    const csv = toCsv([["Kelas", "Catatan"], ["1A", 'Siswa "aktif"; latihan\nlanjut']]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain('1A;"Siswa ""aktif""; latihan\nlanjut"');
  });

  it("menetralkan formula spreadsheet (CSV injection)", () => {
    expect(csvCell("=HYPERLINK(\"http://x\")")).toBe("\"'=HYPERLINK(\"\"http://x\"\")\"");
    expect(csvCell("=1+1")).toBe("'=1+1");
    expect(csvCell("+62812")).toBe("'+62812");
    expect(csvCell("-5")).toBe("'-5");
    expect(csvCell("@cmd")).toBe("'@cmd");
    expect(csvCell("Pecahan")).toBe("Pecahan");
    expect(csvCell(12)).toBe("12");
    expect(csvCell(null)).toBe("");
  });
});

describe("laporan mengajar dari data (repository)", () => {
  it("total konsisten dengan baris kelas; progres maks. 100%", async () => {
    const report = await getTeachingReport(createFixtureRepository("lengkap"), {});
    expect(report.classes.length).toBeGreaterThan(0);
    const sum = report.classes.reduce((t, c) => t + c.completed, 0);
    expect(report.totals.completed).toBe(sum);
    for (const c of report.classes) {
      if (c.progress.kind === "planned") expect(c.progress.percent).toBeLessThanOrEqual(100);
      expect(c.completed).toBeLessThanOrEqual(c.plannedSessions || c.completed);
    }
    expect(report.meetings.every((m) => m.status !== "scheduled" || m.summary || m.notes)).toBe(true);
  });

  it("filter kelas dan rentang tanggal", async () => {
    const repo = createFixtureRepository("lengkap");
    const all = await getTeachingReport(repo, {});
    const one = all.classOptions[0];
    const byClass = await getTeachingReport(repo, { classId: one.id });
    expect(byClass.classes.map((c) => c.classId)).toEqual([one.id]);
    expect(byClass.meetings.every((m) => m.classLabel === one.label)).toBe(true);

    const dates = all.meetings.map((m) => m.date).sort();
    if (dates.length > 1) {
      const mid = dates[Math.floor(dates.length / 2)];
      const ranged = await getTeachingReport(repo, { from: mid, to: mid });
      expect(ranged.meetings.every((m) => m.date === mid)).toBe(true);
    }
    const bad = await getTeachingReport(repo, { from: "bukan-tanggal" });
    expect(bad.filters.from).toBe("");
  });

  it("semua semester digabung bila dipilih", async () => {
    const repo = createFixtureRepository("lengkap");
    const semua = await getTeachingReport(repo, { semesterId: "semua" });
    expect(semua.semester).toBeNull();
    expect(semua.filters.semesterId).toBe("semua");
  });
});
