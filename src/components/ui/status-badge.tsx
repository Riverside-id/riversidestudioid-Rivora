import { CalendarClock, CircleCheck, CircleSlash, Clock3 } from "lucide-react";
import { MEETING_STATUS_LABEL } from "@/lib/domain/labels";
import type { MeetingStatus } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

const styles: Record<MeetingStatus, { className: string; Icon: typeof Clock3 }> = {
  scheduled: { className: "bg-primary-softer text-primary-strong", Icon: Clock3 },
  completed: { className: "bg-mint-soft text-mint-strong", Icon: CircleCheck },
  postponed: { className: "bg-amber-soft text-amber-strong", Icon: CalendarClock },
  cancelled: { className: "bg-rose-soft text-rose-strong", Icon: CircleSlash },
};

/** Status selalu ditampilkan dengan ikon + teks, bukan warna saja. */
export function StatusBadge({ status, className }: { status: MeetingStatus; className?: string }) {
  const { className: tone, Icon } = styles[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        tone,
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" strokeWidth={2.25} />
      {MEETING_STATUS_LABEL[status]}
    </span>
  );
}
