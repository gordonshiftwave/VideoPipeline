import type { Credibility, FieldOverride, LocalStore, PlatformEntry, PlatformId, ProjectUpdate, TopicTag } from "@/lib/types"
import { CREDIBILITY } from "@/lib/types"
import { isTopicTag } from "@/lib/topics"

export const STORE_KEY = "shiftwave-video-pipeline-v1"

const EMPTY: LocalStore = {
  version: 1,
  overrides: {},
  platforms: {},
  credibility: {},
  topics: {},
  topicDismissed: {},
  order: [],
}

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
      topics: sanitizeTagMap(parsed.topics),
      topicDismissed: sanitizeTagMap(parsed.topicDismissed),
      order: sanitizeOrder(parsed.order),
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
  const keep = Boolean(entry.completedOn || entry.url || entry.cut)
  if (!keep) {
    delete projectPlatforms[platformId]
  } else {
    projectPlatforms[platformId] = entry
  }
  const platforms = { ...current.platforms }
  if (Object.keys(projectPlatforms).length === 0) delete platforms[projectId]
  else platforms[projectId] = projectPlatforms
  write({ ...current, platforms })
}

function sanitizeTagMap(value: unknown): Record<string, TopicTag[]> {
  if (!value || typeof value !== "object") return {}
  const next: Record<string, TopicTag[]> = {}
  for (const [id, tags] of Object.entries(value as Record<string, unknown>)) {
    if (!Array.isArray(tags)) continue
    const clean = [...new Set(tags.filter((tag): tag is TopicTag => typeof tag === "string" && isTopicTag(tag)))]
    if (clean.length) next[id] = clean
  }
  return next
}

function sanitizeOrder(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const next: string[] = []
  for (const id of value) {
    if (typeof id !== "string" || !id || seen.has(id)) continue
    seen.add(id)
    next.push(id)
  }
  return next
}

/** Confirm or reject one category tag. Rejecting also dismisses the suggestion so it does not bounce back. */
export function setTopic(projectId: string, tag: string, on: boolean) {
  if (!isTopicTag(tag)) return
  const current = read()
  const topics = { ...current.topics }
  const topicDismissed = { ...current.topicDismissed }
  const saved = new Set(topics[projectId] ?? [])
  const gone = new Set(topicDismissed[projectId] ?? [])
  if (on) {
    saved.add(tag)
    gone.delete(tag)
  } else {
    saved.delete(tag)
    gone.add(tag)
  }
  if (saved.size) topics[projectId] = [...saved]
  else delete topics[projectId]
  if (gone.size) topicDismissed[projectId] = [...gone]
  else delete topicDismissed[projectId]
  write({ ...current, topics, topicDismissed })
}

export function saveOrder(order: string[]) {
  write({ ...read(), order: sanitizeOrder(order) })
}
