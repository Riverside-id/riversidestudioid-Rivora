import { describe, expect, it } from "vitest";
import { assertDemoDataAllowed, DemoDataNotAllowedError, readDataConfig } from "@/lib/data/config";
import { initialsOf, salutationOf } from "@/lib/domain/labels";
import { takeWithRemainder } from "@/lib/utils";

describe("pengaman data demo", () => {
  it("menolak fixture di production tanpa izin eksplisit", () => {
    const config = readDataConfig({ NODE_ENV: "production" });
    expect(() => assertDemoDataAllowed(config)).toThrow(DemoDataNotAllowedError);
  });

  it("mengizinkan fixture di production bila RIVORA_ALLOW_DEMO_DATA=true (deploy preview)", () => {
    const config = readDataConfig({ NODE_ENV: "production", RIVORA_ALLOW_DEMO_DATA: "true" });
    expect(() => assertDemoDataAllowed(config)).not.toThrow();
  });

  it("mengizinkan fixture di development", () => {
    expect(() => assertDemoDataAllowed(readDataConfig({ NODE_ENV: "development" }))).not.toThrow();
  });

  it("tanggal demo hanya berlaku di mode fixture dan harus valid", () => {
    expect(readDataConfig({ RIVORA_DEMO_TODAY: "2026-11-18" }).demoToday).toBe("2026-11-18");
    expect(readDataConfig({ RIVORA_DEMO_TODAY: "18-11-2026" }).demoToday).toBeNull();
    expect(
      readDataConfig({ RIVORA_DATA_SOURCE: "supabase", RIVORA_DEMO_TODAY: "2026-11-18" }).demoToday,
    ).toBeNull();
  });
});

describe("util tampilan", () => {
  it("maksimal 3 item + sisa (F02)", () => {
    expect(takeWithRemainder([1, 2, 3, 4], 3)).toEqual({ visible: [1, 2, 3], remaining: 1 });
    expect(takeWithRemainder([1], 3)).toEqual({ visible: [1], remaining: 0 });
  });

  it("sapaan & inisial dari nama panggilan", () => {
    expect(salutationOf("Bu Sari")).toBe("Bu");
    expect(salutationOf("Pak Andi")).toBe("Pak");
    expect(salutationOf("Rina")).toBe("Rina");
    expect(initialsOf("Bu Sari")).toBe("S");
    expect(initialsOf("Sari Wulandari")).toBe("SW");
  });
});
