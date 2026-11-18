import type { RivoraRepository } from "@/lib/data/repository";
import type { TeachingMaterial } from "@/lib/domain/types";
import type { AppContext } from "./app-context";

export interface MaterialListItem extends TeachingMaterial {
  /** Kelas di semester terpilih yang rencananya memakai materi ini (tanpa upload ulang). */
  usedInClasses: string[];
}

export async function getMaterialsOverview(
  repo: RivoraRepository,
  ctx: AppContext,
): Promise<MaterialListItem[]> {
  const [materials, plans, classes] = await Promise.all([
    repo.listMaterials(),
    ctx.selectedSemester ? repo.listLessonPlans(ctx.selectedSemester.id) : Promise.resolve([]),
    ctx.activeYear ? repo.listClasses(ctx.activeYear.id) : Promise.resolve([]),
  ]);
  const classLabel = new Map(classes.map((c) => [c.id, c.displayName]));

  return materials.map((m) => {
    const labels = new Set<string>();
    for (const p of plans) {
      if (p.materialId === m.id) {
        const label = classLabel.get(p.classId);
        if (label) labels.add(label);
      }
    }
    return { ...m, usedInClasses: [...labels] };
  });
}
