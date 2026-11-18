import { cn } from "@/lib/utils";

/**
 * Ilustrasi guru ramah (dekoratif, aria-hidden) — mengikuti gaya screenshot referensi:
 * guru tersenyum, jempol ke atas, memeluk buku biru, di atas lingkaran biru pucat.
 */
export function TeacherIllustration({ className }: { className?: string }) {
  const skin = "#F6CBA9";
  const skinShade = "#EBB28C";
  const hair = "#5B3A2A";
  const hairLight = "#6E4733";
  const blazer = "#D7A56C";
  const blazerShade = "#C48F55";

  return (
    <svg viewBox="0 0 340 380" aria-hidden className={cn("h-auto w-full", className)}>
      {/* latar */}
      <circle cx="190" cy="200" r="150" fill="#EAF0FD" />
      <circle cx="70" cy="300" r="46" fill="#F1F5FE" />
      <circle cx="300" cy="120" r="26" fill="#F4F7FE" />

      {/* rambut belakang (panjang) */}
      <path
        d="M118 132c-6-62 30-92 74-92s82 30 76 96l4 96c-14 18-36 20-52 8V158h-56v82c-16 12-40 10-52-8z"
        fill={hair}
      />

      {/* badan + blazer */}
      <path
        d="M96 380l6-86c4-44 30-66 70-72h44c40 6 66 28 70 72l6 86z"
        fill={blazer}
      />
      <path d="M172 222l20 58 20-58z" fill="#FFFFFF" />
      <path d="M172 222l-14 10 22 64 12-16zM212 222l14 10-22 64-12-16z" fill={blazerShade} />

      {/* leher */}
      <rect x="176" y="190" width="32" height="40" rx="14" fill={skin} />
      <path d="M176 204c10 8 22 8 32 0v12c-10 6-22 6-32 0z" fill={skinShade} />

      {/* kepala */}
      <ellipse cx="192" cy="140" rx="52" ry="56" fill={skin} />
      <ellipse cx="139" cy="148" rx="9" ry="12" fill={skin} />
      <ellipse cx="245" cy="148" rx="9" ry="12" fill={skin} />

      {/* poni */}
      <path
        d="M138 136c-4-50 26-76 58-74 34 2 58 26 54 70-14-20-34-34-58-36-8 18-30 34-54 40z"
        fill={hair}
      />
      <path d="M196 66c14 6 26 18 30 34-10-12-22-20-34-24z" fill={hairLight} />

      {/* wajah: mata tertutup bahagia, pipi merona, senyum lebar */}
      <path d="M160 142q8-9 16 0" stroke="#3B2619" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M208 142q8-9 16 0" stroke="#3B2619" strokeWidth="4" strokeLinecap="round" fill="none" />
      <ellipse cx="156" cy="160" rx="10" ry="6" fill="#F29C98" opacity="0.55" />
      <ellipse cx="228" cy="160" rx="10" ry="6" fill="#F29C98" opacity="0.55" />
      <path d="M172 164q20 24 40 0z" fill="#8A2E2E" />
      <path d="M180 172q12 9 24 0q-12-3-24 0z" fill="#E7716F" />

      {/* lengan kiri terangkat + jempol */}
      <path d="M108 300c-24-34-26-70-14-100l30-2c-4 30 0 58 18 84z" fill={blazer} />
      <path d="M104 214l22-2" stroke={blazerShade} strokeWidth="6" strokeLinecap="round" />
      <rect x="82" y="168" width="46" height="42" rx="14" fill={skin} />
      <rect x="94" y="136" width="15" height="40" rx="7.5" fill={skin} />
      <path d="M90 184h32M90 196h32" stroke={skinShade} strokeWidth="3" strokeLinecap="round" />

      {/* kilau di dekat jempol */}
      <rect x="56" y="140" width="22" height="9" rx="4.5" fill="#F7C548" transform="rotate(-30 67 144)" />
      <rect x="74" y="108" width="9" height="24" rx="4.5" fill="#F7C548" transform="rotate(-12 78 120)" />
      <rect x="104" y="104" width="8" height="18" rx="4" fill="#F7C548" transform="rotate(14 108 113)" />

      {/* buku biru dipeluk */}
      <g transform="rotate(-8 252 314)">
        <rect x="216" y="262" width="70" height="96" rx="8" fill="#E5EBFA" />
        <rect x="212" y="258" width="70" height="96" rx="8" fill="#3F66DA" />
        <rect x="212" y="258" width="12" height="96" rx="6" fill="#2F52BD" />
        <rect x="236" y="282" width="34" height="6" rx="3" fill="#7E9CF0" />
      </g>
      {/* lengan kanan memeluk buku: lengan dulu, lalu tangan di depan buku */}
      <path d="M286 360c8-40 6-90-14-128l-22 10c14 34 16 76 8 118z" fill={blazer} />
      <path d="M270 236l-20 10" stroke={blazerShade} strokeWidth="5" strokeLinecap="round" />
      <rect x="226" y="296" width="44" height="26" rx="13" fill={skin} />
      <path d="M238 300v18M249 300v18" stroke={skinShade} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function SproutIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden className={cn("h-auto", className ?? "w-full")}>
      <ellipse cx="62" cy="112" rx="50" ry="14" fill="#BFE9DC" />
      <path d="M30 110c4-16 18-24 32-24s28 8 32 24z" fill="#6B4632" />
      <path d="M62 90V44" stroke="#2C9B78" strokeWidth="5" strokeLinecap="round" />
      <path d="M62 62C40 64 26 52 24 30c22 0 36 10 38 32z" fill="#3DBB8F" />
      <path d="M62 52c4-24 22-36 46-34-2 24-20 36-46 34z" fill="#2EA77D" />
      <path d="M62 62C48 58 38 50 32 38" stroke="#2C9B78" strokeWidth="2" fill="none" opacity="0.6" />
    </svg>
  );
}
