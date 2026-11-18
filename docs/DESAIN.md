# Panduan Desain Rivora V1

## Referensi utama

Screenshot dashboard pilihan pemilik (dikirim 18 November 2026) adalah acuan UI/UX utama:

- Latar putih kebiruan dengan lengkung biru lembut di kanan atas.
- Sidebar kiri: logo buku biru, menu besar ber-ikon, item aktif berupa pill biru pastel,
  kartu kecil "♡ Dari Riverside Studio" di bawah.
- Header sapaan besar + subjudul, profil guru (avatar + nama + panah) di kanan atas.
- Tiga kartu statistik dengan ikon di kotak pastel (biru, mint, ungu).
- Kartu **Jadwal Hari Ini**: pill jam biru pastel · judul + kelas · tombol bulat ›; tombol "Lihat Semua →".
- Kartu **Progres Kelas**: label kelas, bar berwarna (biru, mint, ungu), persentase.
- Kolom kanan: ilustrasi guru ramah + kartu mint "Terus Semangat".

### Penyesuaian dari referensi (mengikuti PRD)

| Referensi | Rivora V1 | Alasan |
|---|---|---|
| Statistik ke-3 "Progres Mengajar 82% +2%" | **Materi Tersimpan** | PRD F02 menetapkan Kelas Aktif, Jadwal Hari Ini, Materi Tersimpan; tidak ada tren palsu |
| Bahasa Indonesia, IPA, Matematika | Semua sesi **Matematika**; baris menampilkan materi yang direncanakan | Fokus V1 guru Matematika SD |
| 5 menu | 6 menu: + **Arsip** | PRD §8 navigasi sidebar |
| Hanya persentase | Persentase + **pembilang/penyebut** ("9/14 pertemuan selesai"), "Belum ada rencana" | PRD F08 & mitigasi risiko "progres menyesatkan" |
| — | **Pemilih Tahun Ajaran/Semester** satu kontrol ringkas di samping profil | PRD F02/F09, tanpa menambah keramaian |
| — | Banner kecil **Data demo** | PRD §8: data contoh harus jelas |
| Logo "Rivora" | Ikon buku + wordmark `rivora.` | Brand resmi di prompt awal |

## Token

Didefinisikan di `src/app/globals.css` (`@theme`, Tailwind v4).

| Token | Nilai | Pakai untuk |
|---|---|---|
| `navy` / `ink` | `#10204A` | Teks utama, judul |
| `ink-muted` | `#56637F` | Teks sekunder (kontras ≥ 4.5:1 di putih) |
| `primary` | `#4B73E6` | Tombol utama, ikon, bar |
| `primary-strong` | `#3457C6` | Teks biru (kontras memadai) |
| `primary-soft` / `-softer` | `#EAF0FD` / `#F4F7FE` | Pill aktif, pill jam, latar lembut |
| `mint` / `mint-soft` / `mint-strong` | `#20A68A` / `#E6F8F2` / `#12715E` | Status Selesai, kartu semangat |
| `violet` / `violet-soft` | `#7C52E0` / `#F1EBFD` | Statistik materi, penanda UTS |
| `amber-*`, `rose-*` | — | Status Ditunda, Batal, error |
| `canvas` | `#F8FAFE` | Latar halaman |
| `line` | `#E3E9F4` | Border kartu |
| `radius-card` | 24px | Kartu |
| Font | Plus Jakarta Sans | `next/font`, fallback system sans |

## Prinsip yang diterapkan

- Teks dasar 15–17px, judul 28–40px, target sentuh ≥ 44px.
- Status selalu ikon + teks (tidak bergantung warna).
- Fokus keyboard terlihat (`outline` biru 3px), tautan "Lewati ke konten utama".
- Ilustrasi `aria-hidden`, hanya tampil di layar ≥ 1280px, tidak menutupi jadwal.
- Ponsel: sidebar → laci `<dialog>`; statistik jadi 3 kartu ringkas; baris jadwal bertumpuk.
- Empty/loading/error state berbahasa Indonesia.
- Maksimal 3 jadwal dan 3 progres di Beranda, sisanya lewat "Lihat Semua".
