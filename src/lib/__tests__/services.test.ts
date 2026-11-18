import { describe, expect, it } from "vitest";
import { createFixtureRepository } from "@/lib/data/fixture-repository";
import { buildDemoDataset } from "@/lib/data/fixtures/demo-data";
import { findScheduleConflicts } from "@/lib/domain/schedule";
import { resolveAppContext } from "@/lib/services/app-context";
import { getArchiveOverview } from "@/lib/services/archive";
import { getDashboardData } from "@/lib/services/dashboard";
import { getMaterialsOverview } from "@/lib/services/materials";
import { getSessionDetail, getWeeklyOverview } from "@/lib/services/schedule";

const TODAY = "2026-11-18"; // Rabu

describe("data demo konsisten", () => {
  const data = buildDemoDataset();

  it("tidak ada jadwal bentrok per semester", () => {
    for (const semester of data.semesters) {
      expect(findScheduleConflicts(data.schedules.filter((s) => s.semesterId === semester.id))).toEqual([]);
    }
  });

  it("setiap pertemuan & rencana terikat ke satu kelas dan satu semester yang ada", () => {
    const semesterIds = new Set(data.semesters.map((s) => s.id));
    const classIds = new Set(data.classes.map((c) => c.id));
    for (const m of data.meetings) {
      expect(semesterIds.has(m.semesterId)).toBe(true);
      expect(classIds.has(m.classId)).toBe(true);
    }
    for (const p of data.lessonPlans) {
      expect(semesterIds.has(p.semesterId)).toBe(true);
      expect(classIds.has(p.classId)).toBe(true);
    }
  });

  it("tidak ada pertemuan selesai di masa depan", () => {
    expect(data.meetings.filter((m) => m.status === "completed" && m.plannedDate >= TODAY)).toEqual([]);
  });
});

describe("beranda (F02)", () => {
  it("Rabu 18 Nov 2026: statistik, jadwal urut, dan progres per kelas", async () => {
    const repo = createFixtureRepository();
    const ctx = await resolveAppContext(repo, { requestedSemesterId: null });
    expect(ctx.selectedSemester?.id).toBe("demo-sem-2026-1");

    const dashboard = await getDashboardData(repo, ctx, TODAY);
    expect(dashboard.stats).toEqual({ activeClasses: 6, todaySessions: 4, savedMaterials: 18 });
    expect(dashboard.todaySessions.map((s) => `${s.startTime} ${s.classLabel}`)).toEqual([
      "07:30 1A",
      "10:00 3B",
      "11:00 6A",
      "13:00 5A",
    ]);
    expect(dashboard.todaySessions.every((s) => s.status === "scheduled")).toBe(true);

    const sixA = dashboard.todaySessions.find((s) => s.classLabel === "6A")!;
    expect(sixA.classHasPlan).toBe(false);
    expect(sixA.lesson).toBeNull();

    const progress = Object.fromEntries(dashboard.classProgress.map((c) => [c.classLabel, c.progress]));
    expect(progress["1A"]).toEqual({ kind: "planned", completed: 9, planned: 14, percent: 64 });
    expect(progress["3B"]).toEqual({ kind: "planned", completed: 5, planned: 11, percent: 45 });
    expect(progress["6A"]).toEqual({ kind: "no-plan" });
  });

  it("Skenario C: Semester Genap tidak mencampur progres Ganjil", async () => {
    const repo = createFixtureRepository();
    const ctx = await resolveAppContext(repo, { requestedSemesterId: "demo-sem-2026-2" });
    const dashboard = await getDashboardData(repo, ctx, TODAY);
    expect(dashboard.todayInSelectedSemester).toBe(false);
    expect(dashboard.todaySessions).toEqual([]);
    const progress = Object.fromEntries(dashboard.classProgress.map((c) => [c.classLabel, c.progress]));
    expect(progress["1A"]).toEqual({ kind: "planned", completed: 0, planned: 8, percent: 0 });
    expect(progress["2A"]).toEqual({ kind: "no-plan" });
  });

  it("cookie semester milik tahun arsip diabaikan (kembali ke semester aktif)", async () => {
    const repo = createFixtureRepository();
    const ctx = await resolveAppContext(repo, { requestedSemesterId: "demo-sem-2025-1" });
    expect(ctx.selectedSemester?.id).toBe("demo-sem-2026-1");
  });

  it("guru baru: semua kosong tanpa angka palsu", async () => {
    const repo = createFixtureRepository("kosong");
    const ctx = await resolveAppContext(repo, { requestedSemesterId: null });
    const dashboard = await getDashboardData(repo, ctx, TODAY);
    expect(dashboard.stats).toEqual({ activeClasses: 0, todaySessions: 0, savedMaterials: 0 });
    expect(dashboard.classProgress).toEqual([]);
  });
});

describe("jadwal, materi, arsip", () => {
  it("Skenario E: sesi ditunda punya pengganti, histori tidak hilang", async () => {
    const repo = createFixtureRepository();
    const ctx = await resolveAppContext(repo, { requestedSemesterId: null });
    const postponed = await getSessionDetail(repo, ctx, "demo-sch-126-3b-3_2026-11-11");
    expect(postponed?.status).toBe("postponed");
    const replacement = await getSessionDetail(repo, ctx, "demo-meet-126-3b-3-2026-11-11-pengganti");
    expect(replacement).toMatchObject({ status: "completed", isReplacement: true, startTime: "13:00" });
  });

  it("ringkasan mingguan tanpa bentrok", async () => {
    const repo = createFixtureRepository();
    const ctx = await resolveAppContext(repo, { requestedSemesterId: null });
    const weekly = await getWeeklyOverview(repo, ctx);
    expect(weekly.conflictCount).toBe(0);
    expect(weekly.days.map((d) => d.label)).toEqual(["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]);
    expect(weekly.classes.find((c) => c.classLabel === "1A")?.sessionsPerWeek).toBe(2);
  });

  it("satu materi bisa dipakai beberapa kelas/tahun tanpa upload ulang", async () => {
    const repo = createFixtureRepository();
    const ctx = await resolveAppContext(repo, { requestedSemesterId: null });
    const materials = await getMaterialsOverview(repo, ctx);
    expect(materials.find((m) => m.id === "demo-mat-penjumlahan-dasar")?.usedInClasses).toEqual(["1A"]);
  });

  it("arsip hanya berisi tahun berstatus archived", async () => {
    const archive = await getArchiveOverview(createFixtureRepository());
    expect(archive.map((a) => a.year.label)).toEqual(["2025/2026"]);
    expect(archive[0].classLabels).toHaveLength(5);
  });
});
