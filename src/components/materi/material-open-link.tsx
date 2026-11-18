import { BookOpenText, Download, ExternalLink, PlayCircle } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import type { MaterialKind } from "@/lib/domain/types";
import { isMaterialFileKind, opensInBrowser } from "@/lib/materials/file-rules";

export interface OpenableMaterial {
  id: string;
  title: string;
  kind: MaterialKind;
  filePath: string | null;
  externalUrl: string | null;
}

/**
 * Cara membuka materi sesuai jenisnya: PDF di browser, Word/PowerPoint diunduh (signed URL lewat server),
 * video/tautan di tab baru (hanya http/https, tanpa referrer), catatan di halaman detail.
 */
export function materialOpenTarget(m: OpenableMaterial) {
  if (isMaterialFileKind(m.kind) && m.filePath) {
    const inBrowser = opensInBrowser(m.kind);
    return { href: `/materi/${m.id}/berkas`, external: inBrowser, label: inBrowser ? "Buka PDF" : "Unduh", Icon: inBrowser ? ExternalLink : Download };
  }
  if ((m.kind === "video" || m.kind === "link") && m.externalUrl && /^https?:\/\//i.test(m.externalUrl)) {
    return { href: m.externalUrl, external: true, label: m.kind === "video" ? "Tonton video" : "Buka tautan", Icon: m.kind === "video" ? PlayCircle : ExternalLink };
  }
  if (m.kind === "note") {
    return { href: `/materi/${m.id}`, external: false, label: "Baca catatan", Icon: BookOpenText };
  }
  return null;
}

export function MaterialOpenLink({
  material,
  variant = "secondary",
  size = "sm",
}: {
  material: OpenableMaterial;
  variant?: "secondary" | "ghost";
  size?: "sm" | "md";
}) {
  const target = materialOpenTarget(material);
  if (!target) return null;
  const { href, external, label, Icon } = target;
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      aria-label={`${label}: ${material.title}`}
      className={buttonClass(variant, size)}
    >
      <Icon aria-hidden className="size-4" /> {label}
    </a>
  );
}
