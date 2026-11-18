// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/(app)/jadwal/actions", () => ({ saveMeetingAction: vi.fn() }));

import { MeetingStatusForm } from "@/components/sesi/meeting-status-form";

const PLANS = [
  { id: "p1", title: "Mengenal Bilangan 1–10", plannedSessions: 3, completedSessions: 3, midtermSegment: "before" as const },
  { id: "p2", title: "Penjumlahan Sederhana", plannedSessions: 4, completedSessions: 1, midtermSegment: null },
];

function renderForm(currentStatus: "scheduled" | "completed" = "scheduled", canCreateReplacement = true) {
  render(
    <MeetingStatusForm
      sessionId="sch_2026-07-15"
      sessionDate="2026-07-15"
      currentStatus={currentStatus}
      plans={PLANS}
      defaultPlanId="p2"
      defaultSummary={null}
      defaultNotes={null}
      canCreateReplacement={canCreateReplacement}
    />,
  );
}

afterEach(cleanup);

describe("form status pertemuan", () => {
  it("Tandai Selesai: topik saran terpilih, tanggal = tanggal sesi, ringkasan & kendala opsional", () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Tandai Selesai" }));
    expect((screen.getByLabelText("Materi yang diajarkan") as HTMLSelectElement).value).toBe("p2");
    expect((screen.getByLabelText("Tanggal pelaksanaan") as HTMLInputElement).value).toBe("2026-07-15");
    expect(screen.getByLabelText(/Ringkasan pembelajaran/)).toBeTruthy();
    expect(screen.getByLabelText(/Kendala atau catatan tambahan/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Simpan sebagai Selesai" })).toBeTruthy();
  });

  it("Tunda: alasan + jadwal pengganti opsional (tanggal & jam)", () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Tunda" }));
    expect(screen.getByLabelText(/Alasan/)).toBeTruthy();
    expect(screen.queryByLabelText("Tanggal")).toBeNull();
    fireEvent.click(screen.getByLabelText("Buat jadwal pengganti"));
    expect(screen.getByLabelText("Tanggal")).toBeTruthy();
    expect(screen.getByLabelText("Jam mulai")).toBeTruthy();
    expect(screen.getByLabelText("Jam selesai")).toBeTruthy();
    // Hanya tombol terpilih yang tampil sebagai tombol utama.
    expect(screen.getByRole("button", { name: "Tunda" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Tandai Selesai" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("pertemuan yang sudah punya pengganti tidak menawarkan pengganti kedua", () => {
    renderForm("scheduled", false);
    fireEvent.click(screen.getByRole("button", { name: "Tunda" }));
    expect(screen.queryByLabelText("Buat jadwal pengganti")).toBeNull();
  });

  it("status yang sudah dicatat bisa diubah atau dikembalikan ke Terjadwal", () => {
    renderForm("completed");
    expect(screen.getByRole("button", { name: /Tandai Selesai \(ubah catatan\)/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Kembalikan ke Terjadwal/ }));
    expect(screen.getByText(/progres kelas ikut dikoreksi/)).toBeTruthy();
  });
});
