import { describe, expect, it } from "vitest";
import { calculateClassProgress, suggestNextLesson } from "@/lib/domain/progress";
import type { ClassLessonPlan, MeetingRecord, MeetingStatus } from "@/lib/domain/types";

function plan(id: string, classId: string, plannedSessions: number, sortOrder = 1): ClassLessonPlan {
  return { id, classId, semesterId: "s1", materialId: "mat-penjumlahan", title: id, sortOrder, plannedSessions, midtermSegment: null };
}

let seq = 0;
function meeting(
  planId: string | null,
  classId: string,
  status: MeetingStatus,
  extra: Partial<MeetingRecord> = {},
): MeetingRecord {
  seq++;
  return {
    id: `m${seq}`,
    classId,
    semesterId: "s1",
    weeklyScheduleId: "w1",
    lessonPlanId: planId,
    plannedDate: `2026-11-${String(seq).padStart(2, "0")}`,
    actualDate: null,
    startTime: null,
    endTime: null,
    status,
    summary: null,
    notes: null,
    replacementForId: null,
    ...extra,
  };
}

describe("progres pelaksanaan (F08)", () => {
  it("tanpa rencana → 'Belum ada rencana', bukan 0%", () => {
    expect(calculateClassProgress([], [])).toEqual({ kind: "no-plan" });
  });

  it("rumus selesai ÷ direncanakan", () => {
    const plans = [plan("p1", "1a", 4), plan("p2", "1a", 4, 2)];
    const meetings = [meeting("p1", "1a", "completed"), meeting("p1", "1a", "completed"), meeting("p2", "1a", "completed")];
    expect(calculateClassProgress(plans, meetings)).toEqual({ kind: "planned", completed: 3, planned: 8, percent: 38 });
  });

  it("ditunda, batal, dan terjadwal tidak menambah progres", () => {
    const plans = [plan("p1", "1a", 4)];
    const meetings = [meeting("p1", "1a", "postponed"), meeting("p1", "1a", "cancelled"), meeting("p1", "1a", "scheduled")];
    expect(calculateClassProgress(plans, meetings)).toMatchObject({ completed: 0, percent: 0 });
  });

  it("dibatasi jumlah rencana — tidak pernah lebih dari 100%", () => {
    const plans = [plan("p1", "1a", 2)];
    const meetings = [1, 2, 3, 4].map(() => meeting("p1", "1a", "completed"));
    expect(calculateClassProgress(plans, meetings)).toMatchObject({ completed: 2, planned: 2, percent: 100 });
  });

  it("sesi pengganti tidak dihitung ganda", () => {
    const plans = [plan("p1", "1a", 4)];
    const original = meeting("p1", "1a", "completed");
    const replacement = meeting("p1", "1a", "completed", { weeklyScheduleId: null, replacementForId: original.id });
    expect(calculateClassProgress(plans, [original, replacement])).toMatchObject({ completed: 1 });
  });

  it("Skenario A: file sama di 1A dan 1B, progres independen", () => {
    const plans1A = [plan("p-1a", "1a", 4)];
    const plans1B = [plan("p-1b", "1b", 4)];
    const all = [meeting("p-1a", "1a", "completed"), meeting("p-1b", "1b", "postponed")];
    const for1A = calculateClassProgress(plans1A, all.filter((m) => m.classId === "1a"));
    const for1B = calculateClassProgress(plans1B, all.filter((m) => m.classId === "1b"));
    expect(for1A).toMatchObject({ completed: 1, percent: 25 });
    expect(for1B).toMatchObject({ completed: 0, percent: 0 });
  });

  it("revisi total rencana menghitung ulang indikator", () => {
    const meetings = [meeting("p1", "1a", "completed"), meeting("p1", "1a", "completed")];
    expect(calculateClassProgress([plan("p1", "1a", 4)], meetings)).toMatchObject({ percent: 50 });
    expect(calculateClassProgress([plan("p1", "1a", 8)], meetings)).toMatchObject({ percent: 25 });
  });

  it("mengoreksi progres saat status selesai diubah jadi ditunda", () => {
    const plans = [plan("p1", "1a", 4)];
    const m = meeting("p1", "1a", "completed");
    expect(calculateClassProgress(plans, [m])).toMatchObject({ completed: 1 });
    expect(calculateClassProgress(plans, [{ ...m, status: "postponed" }])).toMatchObject({ completed: 0 });
  });
});

describe("saran materi berikutnya (F06)", () => {
  it("mengikuti urutan rencana dan sisa pertemuan", () => {
    const plans = [plan("p2", "1a", 2, 2), plan("p1", "1a", 2, 1)];
    expect(suggestNextLesson(plans, [])).toMatchObject({ plan: { id: "p1" }, sessionNumber: 1 });
    const meetings = [meeting("p1", "1a", "completed"), meeting("p1", "1a", "completed")];
    expect(suggestNextLesson(plans, meetings)).toMatchObject({ plan: { id: "p2" }, sessionNumber: 1 });
  });

  it("null bila semua rencana selesai", () => {
    const plans = [plan("p1", "1a", 1)];
    expect(suggestNextLesson(plans, [meeting("p1", "1a", "completed")])).toBeNull();
  });
});
