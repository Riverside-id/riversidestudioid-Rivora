import { Logo } from "@/components/brand/logo";
import { SidebarNav } from "./sidebar-nav";
import { StudioCard } from "./studio-card";

/** Sidebar desktop (≥ 1024px). Di layar lebih kecil diganti MobileHeader + laci menu. */
export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[272px] print:!hidden flex-col overflow-y-auto overscroll-contain border-r border-line bg-white px-6 pt-8 pb-6 lg:flex">
      <div className="mb-10 px-2">
        <Logo />
      </div>
      <SidebarNav />
      <div className="mt-auto pt-6 [@media(max-height:620px)]:hidden">
        <StudioCard />
      </div>
    </aside>
  );
}
