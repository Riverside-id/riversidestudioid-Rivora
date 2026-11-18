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

const RIVORA_CODES = new Set(["RV001", "RV002", "RV003", "RV004"]);

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
    return "Tahun ajaran dengan label ini sudah ada.";
  }
  if (text.includes("weekly_schedules_time_order")) return "Jam selesai harus setelah jam mulai.";
  if (text.includes("semesters_midterm_inside")) return "Tanggal UTS/PTS harus berada di dalam semester.";
  if (text.includes("semesters_dates") || text.includes("academic_years_dates")) {
    return "Tanggal mulai harus sebelum tanggal selesai.";
  }
  if (text.includes("profiles_timezone_supported")) return "Zona waktu tidak didukung.";
  if (text.includes("profiles_display_name_length")) return "Nama panggilan harus 2–40 huruf.";
  if (error.code === "42501" || text.includes("row-level security")) {
    return "Anda tidak memiliki akses ke data ini.";
  }
  if (error.code === "23503") return "Data yang dirujuk tidak ditemukan atau bukan milik Anda.";
  return "Terjadi kesalahan saat menyimpan. Coba lagi.";
}

export function toDataError(error: DbErrorLike): DataError {
  return new DataError(dbErrorMessage(error), error.code);
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
