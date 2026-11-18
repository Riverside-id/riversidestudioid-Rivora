import { describe, expect, it } from "vitest";
import {
  findScheduleConflicts,
  occurrenceId,
  parseOccurrenceId,
  schedulesForDate,
  timeRangesOverlap,
} from "@/lib/domain/schedule";
import type { WeeklySchedule } from "@/lib/domain/types";

const base: Omit<WeeklySchedule, "id" | "startTime" | "endTime"> = {
  classId: "c1",
  semesterId: "s1",
  weekday: 3,
  effectiveFrom: "2026-07-13",
  effectiveUntil: "2026-12-18",
};

describe("bentrok jadwal (F04)", () => {
  it("10.00–11.00 tidak bentrok dengan 11.00–12.00", () => {
    expect(
      timeRangesOverlap({ startTime: "10:00", endTime: "11:00" }, { startTime: "11:00", endTime: "12:00" }),
    ).toBe(false);
  });

  it("jam yang beririsan dianggap bentrok", () => {
    expect(
      timeRangesOverlap({ startTime: "10:00", endTime: "11:00" }, { startTime: "10:30", endTime: "11:30" }),
    ).toBe(true);
  });

  it("hanya bentrok bila hari dan masa berlaku juga beririsan", () => {
    const a: WeeklySchedule = { ...base, id: "a", startTime: "10:00", endTime: "11:00" };
    const otherDay: WeeklySchedule = { ...base, id: "b", weekday: 4, startTime: "10:00", endTime: "11:00" };
    const laterPeriod: WeeklySchedule = {
      ...base,
      id: "c",
      startTime: "10:00",
      endTime: "11:00",
      effectiveFrom: "2027-01-04",
      effectiveUntil: "2027-06-25",
    };
    const clash: WeeklySchedule = { ...base, id: "d", classId: "c2", startTime: "10:30", endTime: "11:30" };
    const conflicts = findScheduleConflicts([a, otherDay, laterPeriod, clash]);
    expect(conflicts).toHaveLength(1);
    expect([conflicts[0].a.id, conflicts[0].b.id]).toEqual(["a", "d"]);
  });
});

describe("jadwal berulang", () => {
  const rabu: WeeklySchedule = { ...base, id: "rabu", startTime: "10:00", endTime: "11:00" };
  const pagi: WeeklySchedule = { ...base, id: "pagi", startTime: "07:30", endTime: "08:40" };

  it("muncul pada hari yang tepat dan urut jam", () => {
    expect(schedulesForDate([rabu, pagi], "2026-11-18").map((s) => s.id)).toEqual(["pagi", "rabu"]);
    expect(schedulesForDate([rabu, pagi], "2026-11-19")).toEqual([]);
  });

  it("tidak muncul di luar masa berlaku", () => {
    expect(schedulesForDate([rabu], "2027-01-06")).toEqual([]);
    expect(schedulesForDate([rabu], "2026-07-08")).toEqual([]);
  });

  it("ID kejadian bisa dibaca balik", () => {
    const id = occurrenceId("demo-sch-126-1a-3", "2026-11-18");
    expect(parseOccurrenceId(id)).toEqual({ scheduleId: "demo-sch-126-1a-3", date: "2026-11-18" });
    expect(parseOccurrenceId("tanpa-tanggal")).toBeNull();
  });
});
