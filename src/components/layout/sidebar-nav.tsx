"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { isNavActive, NAV_ITEMS } from "./nav-items";

type NavProps = { onNavigate?: () => void };

function NavList({ pathname, onNavigate }: NavProps & { pathname: string | null }) {
  return (
    <nav aria-label="Menu utama">
      <ul className="space-y-1.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname !== null && isNavActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-14 items-center gap-4 rounded-2xl px-4 text-[17px] transition-colors",
                  active
                    ? "bg-primary-soft font-bold text-primary-strong"
                    : "font-medium text-ink-muted hover:bg-primary-softer hover:text-ink",
                )}
              >
                <Icon
                  aria-hidden
                  className={cn("size-6 shrink-0", active ? "text-primary" : "text-ink-subtle")}
                  strokeWidth={2}
                  fill="currentColor"
                  fillOpacity={active ? 0.18 : 0.08}
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function ActiveNav(props: NavProps) {
  const pathname = usePathname();
  return <NavList pathname={pathname} {...props} />;
}

/**
 * `usePathname()` adalah data runtime pada route dinamis → dibungkus <Suspense> (Cache Components).
 * Fallback: menu yang sama tanpa penanda halaman aktif, jadi tidak ada lompatan tata letak.
 */
export function SidebarNav(props: NavProps) {
  return (
    <Suspense fallback={<NavList pathname={null} {...props} />}>
      <ActiveNav {...props} />
    </Suspense>
  );
}
