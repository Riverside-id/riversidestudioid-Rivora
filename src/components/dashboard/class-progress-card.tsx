import { ArrowRight, ChartColumn, Users } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { ClassProgressItem } from "@/lib/services/dashboard";
import { takeWithRemainder } from "@/lib/utils";
import { ClassProgressList } from "./class-progress-list";

const MAX_VISIBLE = 3;

export function ClassProgressCard({ items }: { items: ClassProgressItem[] }) {
  const { visible, remaining } = takeWithRemainder(items, MAX_VISIBLE);

  return (
    <Card aria-labelledby="progres-kelas">
      <CardHeader
        icon={ChartColumn}
        title="Progres Kelas"
        titleId="progres-kelas"
        subtitle="Pelaksanaan materi yang direncanakan — bukan nilai siswa"
        action={
          <ButtonLink href="/progres" variant="soft" size="sm">
            {remaining > 0 ? `Lihat Semua (${items.length})` : "Detail"}
            <ArrowRight aria-hidden className="size-4" />
          </ButtonLink>
        }
      />
      {visible.length > 0 ? (
        <ClassProgressList items={visible} />
      ) : (
        <EmptyState
          icon={Users}
          title="Belum ada kelas. Tambah kelas pertama Anda."
          description="Progres akan muncul setelah kelas memiliki rencana materi."
        />
      )}
    </Card>
  );
}
