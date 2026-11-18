import { FILE_TOO_LARGE_ERROR, FILE_TYPE_ERROR } from "@/lib/materials/file-rules";

/**
 * Menerjemahkan error database/Auth menjadi pesan berbahasa Indonesia yang mudah dipahami guru.
 * Isi catatan/data pribadi tidak pernah dimasukkan ke pesan atau log.
 */

export interface DbErrorLike {
  code?: string;
  message?: string;
  details?: string | null;
}

export class DataError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = "DataError";
  }
}

/** Mode demo tidak menyimpan perubahan. */
export class DemoReadOnlyError extends DataError {
  constructor() {
    super("Mode demo: perubahan tidak disimpan. Hubungkan Supabase untuk menyimpan data.", "DEMO");
    this.name = "DemoReadOnlyError";
  }
}

const RIVORA_CODES = new Set(["RV001", "RV002", "RV003", "RV004", "RV005", "RV006", "RV007"]);

export function dbErrorMessage(error: DbErrorLike): string {
  const text = `${error.message ?? ""} ${error.details ?? ""}`;

  // Kode khusus Rivora: pesan dari database sudah berbahasa Indonesia.
  if (error.code && RIVORA_CODES.has(error.code) && error.message) return error.message;

  if (error.code === "23P01" || text.includes("weekly_schedules_no_overlap")) {
    return "Jadwal bentrok dengan jadwal lain pada hari dan jam yang sama.";
  }
  if (text.includes("teaching_classes_unique_rombel")) {
    return "Kelas dengan tingkat dan rombel ini sudah ada di tahun ajaran ini.";
  }
  if (text.includes("academic_years_one_active_per_owner")) {
    return "Hanya boleh ada satu tahun ajaran aktif.";
  }
  if (text.includes("academic_years_owner_label_key")) {
    return "Tahun ajaran dengan label ini sudah ada. Pilih label lain atau pulihkan dari Arsip.";
  }
  if (text.includes("weekly_schedules_time_order")) return "Jam selesai harus setelah jam mulai.";
  if (text.includes("semesters_midterm_inside")) return "Tanggal UTS/PTS harus berada di dalam semester.";
  if (text.includes("semesters_dates") || text.includes("academic_years_dates")) {
    return "Tanggal mulai harus sebelum tanggal selesai.";
  }
  if (text.includes("profiles_timezone_supported")) return "Zona waktu tidak didukung.";
  if (text.includes("profiles_display_name_length")) return "Nama panggilan harus 2–40 huruf.";
  if (text.includes("teaching_materials_file_size_positive")) return "File kosong. Pilih file lain.";
  if (text.includes("teaching_materials_url_shape") || text.includes("teaching_materials_url_length")) {
    return "Tautan tidak valid. Gunakan alamat yang diawali https:// atau http://.";
  }
  if (text.includes("teaching_materials_note_shape")) return "Tulis isi catatan (maks. 20.000 karakter).";
  if (text.includes("meeting_records_plan_fk")) {
    return "Rencana ini sudah dipakai di catatan pertemuan, jadi tidak bisa dihapus. Ubah judul atau jumlah pertemuannya saja.";
  }
  if (text.includes("meeting_records_replacement_key")) return "Pertemuan ini sudah punya jadwal pengganti.";
  if (text.includes("meeting_records_occurrence_key")) return "Pertemuan ini sudah dicatat. Muat ulang halaman.";
  if (text.includes("meeting_records_time_order")) return "Jam selesai harus setelah jam mulai.";
  if (text.includes("class_lesson_plans_sessions_range")) return "Jumlah pertemuan harus 1–60.";
  if (text.includes("class_lesson_plans_title_length")) return "Judul topik harus 2–120 karakter.";
  if (text.includes("class_lesson_plans_material_fk")) return "File materi tidak ditemukan di Bank Materi Anda.";
  if (text.includes("teaching_materials_title_length")) return "Judul materi harus 2–120 karakter.";
  if (text.includes("teaching_materials_file_path") || text.includes("teaching_materials_file_shape")) {
    return "File materi tidak valid. Unggah ulang file Anda.";
  }
  if (error.code === "PGRST205" || error.code === "PGRST202") {
    return "Fitur ini belum aktif karena database belum diperbarui. Hubungi pengelola Rivora.";
  }
  if (error.code === "42501" || text.includes("row-level security")) {
    return "Anda tidak memiliki akses ke data ini.";
  }
  if (error.code === "23503") return "Data yang dirujuk tidak ditemukan atau bukan milik Anda.";
  return "Terjadi kesalahan saat menyimpan. Coba lagi.";
}

export function toDataError(error: DbErrorLike): DataError {
  return new DataError(dbErrorMessage(error), error.code);
}

export interface StorageErrorLike {
  message?: string;
  statusCode?: string | number;
  status?: number;
  name?: string;
}

/** Error dari Supabase Storage (unggah/buka file) → pesan untuk guru. */
export function storageErrorMessage(error: StorageErrorLike): string {
  const text = (error.message ?? "").toLowerCase();
  const status = Number(error.statusCode ?? error.status ?? 0);
  if (status === 413 || text.includes("maximum allowed size") || text.includes("too large")) {
    return FILE_TOO_LARGE_ERROR;
  }
  if (status === 415 || text.includes("mime type") || text.includes("not supported")) {
    return FILE_TYPE_ERROR;
  }
  if (status === 403 || text.includes("row-level security") || text.includes("unauthorized")) {
    return "Anda tidak memiliki akses ke file ini.";
  }
  if (status === 404 || text.includes("not found")) return "File materi tidak ditemukan. Coba unggah ulang.";
  if (text.includes("already exists") || status === 409) return "File ini sudah pernah diunggah. Muat ulang halaman.";
  if (error.name === "StorageUnknownError" || text.includes("fetch")) return CONNECTION_ERROR_MESSAGE;
  return "File belum berhasil diproses. Coba lagi.";
}

export function toStorageError(error: StorageErrorLike): DataError {
  return new DataError(storageErrorMessage(error), "STORAGE");
}

export interface AuthErrorLike {
  code?: string;
  status?: number;
  message?: string;
  name?: string;
}

export const CONNECTION_ERROR_MESSAGE = "Tidak dapat terhubung ke server. Periksa koneksi internet Anda, lalu coba lagi.";

export function authErrorMessage(error: AuthErrorLike): string {
  if (error.name === "AuthRetryableFetchError" || error.status === 0) return CONNECTION_ERROR_MESSAGE;
  switch (error.code) {
    case "invalid_credentials":
      return "Email atau kata sandi salah.";
    case "email_not_confirmed":
      return "Email belum dikonfirmasi. Buka tautan konfirmasi yang kami kirim ke email Anda.";
    case "user_already_exists":
    case "email_exists":
      return "Email ini sudah terdaftar. Silakan masuk.";
    case "weak_password":
      return "Kata sandi terlalu lemah. Gunakan minimal 8 karakter.";
    case "same_password":
      return "Kata sandi baru harus berbeda dari kata sandi lama.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Terlalu banyak percobaan. Tunggu beberapa menit, lalu coba lagi.";
    case "session_not_found":
    case "session_expired":
    case "refresh_token_not_found":
      return "Sesi Anda sudah berakhir. Silakan masuk lagi.";
    default:
      return error.status && error.status >= 500
        ? "Layanan sedang bermasalah. Coba lagi beberapa saat lagi."
        : "Permintaan belum berhasil. Periksa isian Anda, lalu coba lagi.";
  }
}
