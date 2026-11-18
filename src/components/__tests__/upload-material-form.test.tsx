// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  prepareMaterialUploadAction: vi.fn(),
  createMaterialAction: vi.fn(),
}));
const uploadToSignedUrl = vi.hoisted(() => vi.fn());

vi.mock("@/app/(app)/materi/actions", () => actions);
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ storage: { from: () => ({ uploadToSignedUrl }) } }),
}));

import { UploadMaterialForm } from "@/components/materi/upload-material-form";

const OWNER = "11111111-1111-4111-8111-111111111111";
const PATH = `${OWNER}/33333333-3333-4333-8333-333333333333.docx`;
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function pick(file: File) {
  fireEvent.change(screen.getByLabelText(/Pilih atau tarik file/), { target: { files: [file] } });
}

function makeFile(name: string, type: string, size = 2048) {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  Object.defineProperty(file, "arrayBuffer", { value: async () => new ArrayBuffer(8) });
  return file;
}

beforeEach(() => {
  actions.prepareMaterialUploadAction.mockReset();
  actions.createMaterialAction.mockReset();
  uploadToSignedUrl.mockReset();
});
afterEach(cleanup);

describe("form unggah materi", () => {
  it("menolak jenis file yang tidak didukung sebelum mengunggah", () => {
    render(<UploadMaterialForm supabaseUrl="https://contoh.supabase.co" publishableKey="sb_publishable_x" />);
    pick(makeFile("foto.jpg", "image/jpeg"));
    expect(screen.getByRole("alert").textContent).toMatch(/PDF, Word \(DOC\/DOCX\), atau PowerPoint/);
    expect(actions.prepareMaterialUploadAction).not.toHaveBeenCalled();
  });

  it("tidak membatasi ukuran file di aplikasi (file 40 MB diterima)", () => {
    render(<UploadMaterialForm supabaseUrl="https://contoh.supabase.co" publishableKey="sb_publishable_x" />);
    pick(makeFile("Modul besar.pdf", "application/pdf", 40 * 1024 * 1024));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("Modul besar.pdf")).toBeTruthy();
  });

  it("mengisi judul dari nama file, mengunggah ke Storage, lalu menyimpan materi", async () => {
    actions.prepareMaterialUploadAction.mockResolvedValue({ ok: true, path: PATH, token: "tkn", contentType: DOCX });
    uploadToSignedUrl.mockResolvedValue({ data: { path: PATH }, error: null });
    actions.createMaterialAction.mockResolvedValue({ status: "success", message: 'Materi "Modul ajar pecahan" tersimpan.' });

    render(<UploadMaterialForm supabaseUrl="https://contoh.supabase.co" publishableKey="sb_publishable_x" />);
    pick(makeFile("Modul_ajar-pecahan.docx", DOCX));
    expect((screen.getByLabelText("Judul materi") as HTMLInputElement).value).toBe("Modul ajar pecahan");
    fireEvent.change(screen.getByLabelText(/Topik/), { target: { value: "Pecahan" } });
    fireEvent.change(screen.getByLabelText(/Tingkat/), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Unggah Materi" }));

    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch("tersimpan"));
    expect(actions.prepareMaterialUploadAction).toHaveBeenCalledWith({ fileName: "Modul_ajar-pecahan.docx", fileSize: 2048, mimeType: DOCX });
    expect(uploadToSignedUrl).toHaveBeenCalledWith(PATH, "tkn", expect.any(Blob), { contentType: DOCX, upsert: false });
    expect((uploadToSignedUrl.mock.calls[0][2] as Blob).type).toBe(DOCX);
    expect(actions.createMaterialAction).toHaveBeenCalledWith({
      path: PATH,
      fileName: "Modul_ajar-pecahan.docx",
      title: "Modul ajar pecahan",
      description: "",
      topic: "Pecahan",
      gradeLevel: "4",
    });
    expect((screen.getByLabelText("Judul materi") as HTMLInputElement).value).toBe("");
  });

  it("menampilkan pesan jelas bila Storage menolak unggahan, tanpa menyimpan materi", async () => {
    actions.prepareMaterialUploadAction.mockResolvedValue({ ok: true, path: PATH, token: "tkn", contentType: DOCX });
    uploadToSignedUrl.mockResolvedValue({ data: null, error: { message: "The object exceeded the maximum allowed size", statusCode: "413" } });

    render(<UploadMaterialForm supabaseUrl="https://contoh.supabase.co" publishableKey="sb_publishable_x" />);
    pick(makeFile("Modul.docx", DOCX));
    fireEvent.click(screen.getByRole("button", { name: "Unggah Materi" }));

    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/batas unggah Supabase/));
    expect(actions.createMaterialAction).not.toHaveBeenCalled();
  });
});
