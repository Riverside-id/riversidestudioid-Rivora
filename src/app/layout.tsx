import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Rivora — Atur Kelas, Fokus Mengajar.",
    template: "%s · Rivora",
  },
  description:
    "Rivora membantu guru Matematika SD mengatur jadwal, materi, dan progres pelaksanaan pembelajaran di setiap kelas.",
  applicationName: "Rivora",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#f8fafe",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
