import type { Credibility, FieldOverride, LocalStore, PlatformEntry, PlatformId, ProjectUpdate } from "@/lib/types"
import { CREDIBILITY } from "@/lib/types"

export const STORE_KEY = "shiftwave-video-pipeline-v1"

const EMPTY: LocalStore = { version: 1, overrides: {}, platforms: {}, credibility: {} }

let snapshot: LocalStore = EMPTY
let rawCache = ""

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

function read(): LocalStore {
  if (!canUseStorage()) return EMPTY
  const raw = window.localStorage.getItem(STORE_KEY) ?? ""
  if (raw === rawCache) return snapshot
  rawCache = raw
  if (!raw) {
    snapshot = EMPTY
    return snapshot
  }
  try {
    const parsed = JSON.parse(raw) as Partial<LocalStore>
    snapshot = {
      version: 1,
      overrides: parsed.overrides && typeof parsed.overrides === "object" ? parsed.overrides : {},
      platforms: parsed.platforms && typeof parsed.platforms === "object" ? parsed.platforms : {},
      credibility: sanitizeCredibility(parsed.credibility),
    }
  } catch {
    snapshot = EMPTY
  }
  return snapshot
}

function write(next: LocalStore) {
  if (!canUseStorage()) return
  const raw = JSON.stringify(next)
  rawCache = raw
  snapshot = next
  window.localStorage.setItem(STORE_KEY, raw)
  window.dispatchEvent(new Event("vp-store"))
}

export function getLocalStore(): LocalStore {
  return read()
}

export function subscribeLocalStore(onChange: () => void): () => void {
  if (!canUseStorage()) return () => {}
  const handler = () => onChange()
  window.addEventListener("storage", handler)
  window.addEventListener("vp-store", handler)
  return () => {
    window.removeEventListener("storage", handler)
    window.removeEventListener("vp-store", handler)
  }
}

export function getServerStore(): LocalStore {
  return EMPTY
}

export function saveUpdates(updates: ProjectUpdate[]) {
  const current = read()
  const overrides = { ...current.overrides }
  for (const update of updates) {
    const prev = overrides[update.id] ?? {}
    const next: FieldOverride = { ...prev }
    if (update.status !== undefined) next.status = update.status
    if (update.requestorsDeadline !== undefined) next.requestorsDeadline = update.requestorsDeadline
    if (update.kpiEstDeliveryDate !== undefined) next.kpiEstDeliveryDate = update.kpiEstDeliveryDate
    if (update.kpiActualDeliveryDate !== undefined) {
      next.kpiActualDeliveryDate = update.kpiActualDeliveryDate
    }
    overrides[update.id] = next
  }
  write({ ...current, overrides })
}

export function clearOverrides() {
  const current = read()
  write({ ...current, overrides: {} })
}

function sanitizeCredibility(value: unknown): Record<string, Credibility> {
  if (!value || typeof value !== "object") return {}
  const next: Record<string, Credibility> = {}
  for (const [id, rating] of Object.entries(value as Record<string, unknown>)) {
    if (CREDIBILITY.includes(rating as Credibility)) next[id] = rating as Credibility
  }
  return next
}

export function saveCredibility(projectId: string, rating: Credibility | null) {
  const current = read()
  const credibility = { ...current.credibility }
  if (!rating) delete credibility[projectId]
  else credibility[projectId] = rating
  write({ ...current, credibility })
}

export function savePlatform(projectId: string, platformId: PlatformId, entry: PlatformEntry) {
  const current = read()
  const projectPlatforms = { ...(current.platforms[projectId] ?? {}) }
  if (!entry.completedOn && !entry.url) {
    delete projectPlatforms[platformId]
  } else {
    projectPlatforms[platformId] = entry
  }
  const platforms = { ...current.platforms }
  if (Object.keys(projectPlatforms).length === 0) delete platforms[projectId]
  else platforms[projectId] = projectPlatforms
  write({ ...current, platforms })
}
