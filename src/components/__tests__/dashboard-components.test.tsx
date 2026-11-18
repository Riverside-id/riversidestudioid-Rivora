// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ClassProgressList } from "@/components/dashboard/class-progress-list";
import { TodayScheduleCard } from "@/components/dashboard/today-schedule-card";
import type { TeachingSession } from "@/lib/services/sessions";

afterEach(cleanup);

function session(i: number): TeachingSession {
  return {
    id: `s${i}`,
    date: "2026-11-18",
    classId: `c${i}`,
    classLabel: `${i}A`,
    startTime: `0${7 + i}:00`.slice(-5),
    endTime: `0${8 + i}:00`.slice(-5),
    status: "scheduled",
    isReplacement: false,
    notes: null,
    lesson: { planId: "p", title: `Topik ${i}`, materialId: null, sessionNumber: 1, plannedSessions: 3, midtermSegment: null, isSuggestion: true },
    classHasPlan: true,
  };
}

describe("ClassProgressList (F08)", () => {
  it("tanpa rencana menampilkan 'Belum ada rencana', bukan 0%", () => {
    render(
      <ClassProgressList
        items={[
          { classId: "a", classLabel: "1A", gradeLevel: 1, progress: { kind: "planned", completed: 3, planned: 5, percent: 60 } },
          { classId: "b", classLabel: "6A", gradeLevel: 6, progress: { kind: "no-plan" } },
        ]}
      />,
    );
    expect(screen.getByText("60%")).toBeTruthy();
    expect(screen.getByText("3/5 pertemuan selesai")).toBeTruthy();
    expect(screen.getByText("Belum ada rencana")).toBeTruthy();
    expect(screen.queryByText("0%")).toBeNull();
    expect(screen.getAllByRole("progressbar")).toHaveLength(1);
  });
});

describe("TodayScheduleCard (F02)", () => {
  it("menampilkan maksimal 3 jadwal + Lihat Semua", () => {
    render(<TodayScheduleCard sessions={[1, 2, 3, 4].map(session)} today="2026-11-18" hasClasses todayInSemester />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByRole("link", { name: /Lihat Semua \(4\)/ })).toBeTruthy();
  });

  it("empty state bila tidak ada jadwal hari ini", () => {
    render(<TodayScheduleCard sessions={[]} today="2026-11-22" hasClasses todayInSemester />);
    expect(screen.getByText("Tidak ada jadwal mengajar hari ini")).toBeTruthy();
  });

  it("empty state guru baru tanpa kelas", () => {
    render(<TodayScheduleCard sessions={[]} today="2026-11-18" hasClasses={false} todayInSemester />);
    expect(screen.getByText("Belum ada kelas. Tambah kelas pertama Anda.")).toBeTruthy();
  });
});
