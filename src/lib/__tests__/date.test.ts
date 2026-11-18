import { describe, expect, it } from "vitest";
import { addDays, formatLongDate, formatTimeRange, getZonedToday, isISODate, weekdayOf } from "@/lib/date";

describe("tanggal & zona waktu", () => {
  it("memakai tanggal Asia/Jakarta, bukan UTC server", () => {
    // 17 Nov 18:30 UTC = 18 Nov 01:30 WIB
    expect(getZonedToday("Asia/Jakarta", new Date("2026-11-17T18:30:00Z"))).toBe("2026-11-18");
    expect(getZonedToday("UTC", new Date("2026-11-17T18:30:00Z"))).toBe("2026-11-17");
  });

  it("menghitung hari ISO (1 = Senin)", () => {
    expect(weekdayOf("2026-11-16")).toBe(1);
    expect(weekdayOf("2026-11-18")).toBe(3);
    expect(weekdayOf("2026-11-22")).toBe(7);
  });

  it("format Indonesia", () => {
    expect(formatLongDate("2026-11-18")).toBe("Rabu, 18 November 2026");
    expect(formatTimeRange("07:30", "08:40")).toBe("07.30 – 08.40");
  });

  it("validasi & aritmetika tanggal", () => {
    expect(isISODate("2026-02-29")).toBe(false);
    expect(isISODate("2028-02-29")).toBe(true);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});
