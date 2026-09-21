import snapshot from "@/data/active-video-projects.json"
import { normalizeProject } from "@/lib/projects"
import { BASE_ID, BASE_NAME, TABLE_ID } from "@/lib/taxonomy"
import type { Catalog } from "@/lib/types"

export function demoCatalog(): Catalog {
  const file = snapshot as {
    exportedAt?: string
    baseName?: string
    projects: Array<Record<string, unknown> & { id: string }>
  }
  return {
    source: "snapshot",
    writable: false,
    exportedAt: file.exportedAt ?? null,
    fetchedAt: new Date().toISOString(),
    warning: null,
    projects: file.projects.map((project) => normalizeProject(project)),
    baseId: BASE_ID,
    tableId: TABLE_ID,
    baseName: file.baseName || BASE_NAME,
  }
}
