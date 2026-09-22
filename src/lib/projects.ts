import { CLOSED_STATUSES, ladderFor, PLATFORMS, STATUS_SHORT } from "@/lib/taxonomy"
import type {
  BoardProject,
  DeadlineFilter,
  DeadlineKind,
  ExplicitFilters,
  FieldOverride,
  PipelineView,
  PlatformId,
  PlatformMap,
  PostedFilter,
  Project,
  SortKey,
  TopicTag,
} from "@/lib/types"
import { PRIORITIES, STATUSES } from "@/lib/types"

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function todayISO(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function asDate(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim().slice(0, 10)
  return DATE_RE.test(trimmed) ? trimmed : null
}

export function asText(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function asNameList(value: unknown): string[] {
  if (!value) return []
  if (typeof value === "string") return value.trim() ? [value.trim()] : []
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (typeof item === "string") return item.trim()
      if (item && typeof item === "object" && "name" in item) {
        return String((item as { name?: unknown }).name ?? "").trim()
      }
      return ""
    })
    .filter(Boolean)
}

export function normalizeProject(input: {
  id: string
  createdTime?: unknown
  uniqueId?: unknown
  name?: unknown
  primaryMarket?: unknown
  status?: unknown
  priority?: unknown
  videoTopic?: unknown
  requestorsDeadline?: unknown
  kpiStartDate?: unknown
  kpiEstDeliveryDate?: unknown
  kpiActualDeliveryDate?: unknown
  recordingDate?: unknown
  description?: unknown
  linkToBrief?: unknown
  reviewLink?: unknown
  dateReviewLinkSent?: unknown
  sourceFootage?: unknown
  finalApprovedVideoLink?: unknown
  editType?: unknown
  requester?: unknown
  questionsNotes?: unknown
  evidenceLibraryHandoff?: unknown
  evidenceLibrarySwoId?: unknown
  evidenceLibraryRecordUrl?: unknown
  evidenceHandoffNotes?: unknown
}): Project {
  const uniqueId = asText(input.uniqueId) ?? input.id
  return {
    id: input.id,
    createdTime: asText(input.createdTime) ?? "",
    uniqueId,
    name: asText(input.name) ?? uniqueId,
    primaryMarket: asText(input.primaryMarket) ?? "Uncategorized",
    status: asText(input.status) ?? "On Hold",
    priority: asText(input.priority) ?? "Low",
    videoTopic: asNameList(input.videoTopic),
    requestorsDeadline: asDate(input.requestorsDeadline),
    kpiStartDate: asDate(input.kpiStartDate),
    kpiEstDeliveryDate: asDate(input.kpiEstDeliveryDate),
    kpiActualDeliveryDate: asDate(input.kpiActualDeliveryDate),
    recordingDate: asDate(input.recordingDate),
    description: asText(input.description),
    linkToBrief: asText(input.linkToBrief),
    reviewLink: asText(input.reviewLink),
    dateReviewLinkSent: asDate(input.dateReviewLinkSent),
    sourceFootage: asText(input.sourceFootage),
    finalApprovedVideoLink: asText(input.finalApprovedVideoLink),
    editType: asText(input.editType),
    requester: asNameList(input.requester),
    questionsNotes: asText(input.questionsNotes),
    evidenceLibraryHandoff: asText(input.evidenceLibraryHandoff),
    evidenceLibrarySwoId: asText(input.evidenceLibrarySwoId),
    evidenceLibraryRecordUrl: asText(input.evidenceLibraryRecordUrl),
    evidenceHandoffNotes: asText(input.evidenceHandoffNotes),
  }
}

export function applyOverride(project: Project, override?: FieldOverride): Project {
  if (!override) return project
  return {
    ...project,
    status: override.status ?? project.status,
    requestorsDeadline:
      override.requestorsDeadline !== undefined
        ? override.requestorsDeadline
        : project.requestorsDeadline,
    kpiEstDeliveryDate:
      override.kpiEstDeliveryDate !== undefined
        ? override.kpiEstDeliveryDate
        : project.kpiEstDeliveryDate,
    kpiActualDeliveryDate:
      override.kpiActualDeliveryDate !== undefined
        ? override.kpiActualDeliveryDate
        : project.kpiActualDeliveryDate,
  }
}

export function overrideKeys(override?: FieldOverride): string[] {
  if (!override) return []
  return (
    ["status", "requestorsDeadline", "kpiEstDeliveryDate", "kpiActualDeliveryDate"] as const
  ).filter((key) => override[key] !== undefined)
}

export function deadlineKind(project: Project, today: string): DeadlineKind {
  const date = project.requestorsDeadline
  if (!date) {
    return CLOSED_STATUSES.has(project.status) ? "met" : "missing"
  }
  if (CLOSED_STATUSES.has(project.status) && date <= today) return "met"
  if (date < today) return "overdue"
  if (date === today) return "today"
  return "upcoming"
}

function dateParts(iso: string): [number, number, number] | null {
  const head = iso.slice(0, 10)
  if (!DATE_RE.test(head)) return null
  const [y, m, d] = head.split("-").map(Number)
  if (!y || !m || !d) return null
  return [y, m, d]
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  const parts = dateParts(iso)
  if (!parts) return iso
  const [y, m, d] = parts
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function isDateInput(value: string): boolean {
  return DATE_RE.test(value)
}

/** Only http(s) links are clickable. Other strings are treated as not added. */
export function isHttpUrl(value: string | null | undefined): value is string {
  if (!value) return false
  try {
    const url = new URL(value.trim())
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

export function deadlineLabel(project: Project, today: string): string {
  const kind = deadlineKind(project, today)
  const date = project.requestorsDeadline
  if (kind === "missing") return "No requester deadline"
  if (kind === "overdue" && date) {
    const days = Math.abs(daysFromToday(date, today))
    return days === 1 ? "Overdue by 1 day" : `Overdue by ${days} days`
  }
  if (kind === "today") return "Due today"
  if (kind === "upcoming" && date) return `Due ${formatDate(date)}`
  if (date) return `Deadline was ${formatDate(date)}`
  return "Delivered"
}

export function daysFromToday(iso: string, today: string): number {
  const parts = dateParts(iso)
  const todayParts = dateParts(today)
  if (!parts || !todayParts) return 0
  const [y, m, d] = parts
  const [ty, tm, td] = todayParts
  const a = Date.UTC(y, m - 1, d)
  const b = Date.UTC(ty, tm - 1, td)
  return Math.round((a - b) / 86_400_000)
}

export type InterpretedQuery = {
  text: string
  statuses: string[]
  markets: string[]
  deadline: DeadlineFilter | null
  videoLink: "has" | "missing" | null
  posted: PostedFilter | null
  missingPlatform: PlatformId | null
  pipeline: PipelineView | null
}

function platformByLabel(label: string): PlatformId | null {
  const match = PLATFORMS.find((platform) => platform.label.toLowerCase() === label.toLowerCase())
  return match?.id ?? null
}

const QUERY_RULES: {
  pattern: RegExp
  apply: (out: InterpretedQuery) => void
}[] = [
  {
    pattern: /\bmissing (tiktok|youtube|instagram|facebook|linkedin|threads|reddit|pinterest)\b|\bno (tiktok|youtube|instagram|facebook|linkedin|threads|reddit|pinterest)\b/gi,
    apply: (out) => {
      const match = /\b(?:missing|no) (tiktok|youtube|instagram|facebook|linkedin|threads|reddit|pinterest)\b/i.exec(
        ` ${out.text} `,
      )
      const id = match ? platformByLabel(match[1] ?? "") : null
      if (id) out.missingPlatform = id
    },
  },
  {
    pattern: /\bmissing (?:on )?x\b|\bno (?:post on )?x\b/gi,
    apply: (out) => {
      out.missingPlatform = "x"
    },
  },
  {
    pattern: /\bnot posted\b|\bunposted\b/gi,
    apply: (out) => {
      out.posted = "not-posted"
    },
  },
  {
    pattern: /\balready live\b|\blive videos\b/gi,
    apply: (out) => {
      out.pipeline = "live"
    },
  },
  {
    pattern: /\bnot complete\b|\bin pipeline\b|\bstill in pipeline\b/gi,
    apply: (out) => {
      out.pipeline = "active"
    },
  },
  {
    pattern: /\brough cut\b/gi,
    apply: (out) => {
      out.statuses.push("Editing In Progress")
    },
  },
  {
    pattern: /\bfirst pass\b/gi,
    apply: (out) => {
      out.statuses.push("Ready for Review")
    },
  },
  {
    pattern: /\bsecond pass\b/gi,
    apply: (out) => {
      out.statuses.push("Reviewed - needs edits")
    },
  },
  {
    pattern: /\bfinals in the can\b|\bfinals\b/gi,
    apply: (out) => {
      out.statuses.push("Reviewed - Approved", "Complete")
    },
  },
  {
    pattern: /\braw\b/gi,
    apply: (out) => {
      out.statuses.push("Busy Briefing", "Editing Not Started ( already Briefed)")
    },
  },
  {
    pattern: /\bmissing deadline\b|\bno deadline\b|\bwithout deadline\b/gi,
    apply: (out) => {
      out.deadline = "missing"
    },
  },
  {
    pattern: /\bhas deadline\b|\bwith deadline\b/gi,
    apply: (out) => {
      out.deadline = "has"
    },
  },
  {
    pattern: /\bdue today\b|\bdeadline today\b/gi,
    apply: (out) => {
      out.deadline = "today"
    },
  },
  {
    pattern: /\boverdue\b|\bpast due\b/gi,
    apply: (out) => {
      out.deadline = "overdue"
    },
  },
  {
    pattern: /\bhas video link\b|\bwith video link\b|\bhas review link\b/gi,
    apply: (out) => {
      out.videoLink = "has"
    },
  },
  {
    pattern: /\bmissing video link\b|\bno video link\b/gi,
    apply: (out) => {
      out.videoLink = "missing"
    },
  },
  {
    pattern: /\bediting in progress\b|\bin progress\b/gi,
    apply: (out) => {
      out.statuses.push("Editing In Progress")
    },
  },
  {
    pattern: /\bready for review\b/gi,
    apply: (out) => {
      out.statuses.push("Ready for Review")
    },
  },
  {
    pattern: /\bneeds edits\b/gi,
    apply: (out) => {
      out.statuses.push("Reviewed - needs edits")
    },
  },
  {
    pattern: /\breviewed - approved\b|\bapproved\b/gi,
    apply: (out) => {
      out.statuses.push("Reviewed - Approved")
    },
  },
  {
    pattern: /\bbusy briefing\b|\bbriefing\b/gi,
    apply: (out) => {
      out.statuses.push("Busy Briefing")
    },
  },
  {
    pattern: /\bnot started\b|\balready briefed\b/gi,
    apply: (out) => {
      out.statuses.push("Editing Not Started ( already Briefed)")
    },
  },
  {
    pattern: /\bon hold\b/gi,
    apply: (out) => {
      out.statuses.push("On Hold")
    },
  },
  {
    pattern: /\bpro sports\b/gi,
    apply: (out) => {
      out.markets.push("Pro Sports")
    },
  },
  {
    pattern: /\bat-home\b|\bat home\b/gi,
    apply: (out) => {
      out.markets.push("At-Home")
    },
  },
  {
    pattern: /\bfirst responders\b/gi,
    apply: (out) => {
      out.markets.push("First Responders")
    },
  },
  {
    pattern: /\bclinics\b/gi,
    apply: (out) => {
      out.markets.push("Clinics / Performance Centers")
    },
  },
  {
    pattern: /\bhigher education\b|\buniversit(?:y|ies)\b/gi,
    apply: (out) => {
      out.markets.push("Higher Education / Universities")
    },
  },
  {
    pattern: /\bgolf\b/gi,
    apply: (out) => {
      out.markets.push("Golf")
    },
  },
  {
    pattern: /\bcorporate\b/gi,
    apply: (out) => {
      out.markets.push("Corporate")
    },
  },
  {
    pattern: /\bcomplete\b/gi,
    apply: (out) => {
      out.statuses.push("Complete")
    },
  },
]

export function interpretQuery(query: string): InterpretedQuery {
  const out: InterpretedQuery = {
    text: query,
    statuses: [],
    markets: [],
    deadline: null,
    videoLink: null,
    posted: null,
    missingPlatform: null,
    pipeline: null,
  }
  let text = ` ${query} `
  for (const rule of QUERY_RULES) {
    if (rule.pattern.test(text)) {
      rule.pattern.lastIndex = 0
      text = text.replace(rule.pattern, " ")
      rule.apply(out)
    }
    rule.pattern.lastIndex = 0
  }
  out.text = text.replace(/\s+/g, " ").trim()
  out.statuses = unique(out.statuses)
  out.markets = unique(out.markets)
  return out
}

function unique(values: string[]): string[] {
  return [...new Set(values)]
}

function boardTopicNames(project: Project): string[] {
  const board = project as BoardProject
  return [...(board.confirmedTopics ?? []), ...(board.suggestedTopics ?? [])]
}

function haystack(project: Project): string {
  return [
    project.name,
    project.uniqueId,
    project.primaryMarket,
    project.status,
    STATUS_SHORT[project.status],
    ladderFor(project.status).label,
    project.priority,
    project.description,
    project.questionsNotes,
    project.editType,
    project.evidenceHandoffNotes,
    project.evidenceLibrarySwoId,
    project.videoTopic.join(" "),
    project.requester.join(" "),
    boardTopicNames(project).join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

function combineLists(explicit: string[], interpreted: string[]): string[] | null {
  if (explicit.length === 0 && interpreted.length === 0) return null
  if (explicit.length === 0) return interpreted
  if (interpreted.length === 0) return explicit
  return explicit.filter((value) => interpreted.includes(value))
}

function combineDeadline(
  explicit: DeadlineFilter,
  interpreted: DeadlineFilter | null,
): DeadlineFilter | "conflict" {
  if (!interpreted || interpreted === "any") return explicit
  if (explicit === "any" || explicit === interpreted) return interpreted
  return "conflict"
}

function matchesDeadline(
  project: Project,
  filter: DeadlineFilter | "conflict",
  today: string,
): boolean {
  if (filter === "any") return true
  if (filter === "conflict") return false
  const kind = deadlineKind(project, today)
  if (filter === "has") return Boolean(project.requestorsDeadline)
  if (filter === "missing") return kind === "missing"
  if (filter === "overdue") return kind === "overdue"
  if (filter === "today") return kind === "today"
  return true
}

function hasVideoLink(project: Project): boolean {
  return isHttpUrl(project.reviewLink) || isHttpUrl(project.finalApprovedVideoLink)
}

export function isPosted(platforms: PlatformMap | undefined): boolean {
  if (!platforms) return false
  return Object.values(platforms).some((entry) => Boolean(entry?.completedOn || entry?.url))
}

export function platformPosted(platforms: PlatformMap | undefined, id: PlatformId): boolean {
  const entry = platforms?.[id]
  return Boolean(entry?.completedOn || entry?.url)
}

function boardPlatforms(project: Project): PlatformMap {
  return (project as BoardProject).platforms ?? {}
}

function boardCredibility(project: Project): string | null {
  return (project as BoardProject).credibility ?? null
}

export function filterProjects<T extends Project>(
  projects: T[],
  filters: ExplicitFilters,
  today: string,
): T[] {
  const interpreted = interpretQuery(filters.query)
  const statuses = combineLists(filters.statuses, interpreted.statuses)
  const markets = combineLists(filters.markets, interpreted.markets)
  const deadline = combineDeadline(filters.deadline, interpreted.deadline)
  const videoLink = filters.videoLink === "any" ? interpreted.videoLink : filters.videoLink
  const posted = filters.posted === "any" ? interpreted.posted : filters.posted
  const missingPlatform = filters.missingPlatform || interpreted.missingPlatform
  const pipeline = interpreted.pipeline ?? filters.pipeline ?? "all"
  const wantsComplete = (statuses ?? []).includes("Complete") || pipeline === "live"
  const tokens = interpreted.text
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)

  return projects.filter((project) => {
    if (statuses && !statuses.includes(project.status)) return false
    if (markets && !markets.includes(project.primaryMarket)) return false
    if (filters.priorities.length && !filters.priorities.includes(project.priority)) {
      return false
    }
    if (filters.credibility?.length && !filters.credibility.includes(boardCredibility(project) ?? "")) {
      return false
    }
    if (pipeline === "active" && !wantsComplete && tokens.length === 0 && project.status === "Complete") return false
    if (pipeline === "live" && project.status !== "Complete") return false
    if (!matchesDeadline(project, deadline, today)) return false
    if (videoLink === "has" && !hasVideoLink(project)) return false
    if (videoLink === "missing" && hasVideoLink(project)) return false
    if (posted === "posted" && !isPosted(boardPlatforms(project))) return false
    if (posted === "not-posted" && isPosted(boardPlatforms(project))) return false
    if (missingPlatform && platformPosted(boardPlatforms(project), missingPlatform)) return false
    if (filters.topics?.length) {
      const tags = boardTopicNames(project)
      if (!filters.topics.some((tag) => tags.includes(tag as TopicTag))) return false
    }
    if (tokens.length) {
      const hay = haystack(project)
      if (!tokens.every((token) => hay.includes(token))) return false
    }
    return true
  })
}

function priorityRank(value: string): number {
  const index = PRIORITIES.indexOf(value as (typeof PRIORITIES)[number])
  if (value === "Med") return PRIORITIES.indexOf("Medium")
  return index === -1 ? PRIORITIES.length : index
}

function statusRank(status: string): number {
  const index = STATUSES.indexOf(status as (typeof STATUSES)[number])
  return index === -1 ? STATUSES.length : index
}

function urgencyRank(project: Project, today: string): number {
  const kind = deadlineKind(project, today)
  if (kind === "overdue") return 0
  if (kind === "today") return 1
  if (kind === "upcoming") return 2
  if (kind === "missing") return 3
  return 4
}

export function sortByManual<T extends Project>(projects: T[], order: readonly string[]): T[] {
  const index = new Map(order.map((id, position) => [id, position]))
  const copy = [...projects]
  copy.sort((a, b) => {
    const ai = index.has(a.id) ? (index.get(a.id) as number) : Number.MAX_SAFE_INTEGER
    const bi = index.has(b.id) ? (index.get(b.id) as number) : Number.MAX_SAFE_INTEGER
    if (ai !== bi) return ai - bi
    return a.name.localeCompare(b.name)
  })
  return copy
}

/**
 * Manual order to save after a drag.
 * `onScreenIds` is every project in the order the board is showing for the active sort.
 * Pass that list, not an older stored order, so the rows stay where the user just put them.
 * Items hidden by the current filter keep their slots inside `onScreenIds`.
 */
export function manualOrderFromDrag(
  onScreenIds: readonly string[],
  visibleIds: readonly string[],
  fromIndex: number,
  toIndex: number,
): string[] {
  return reorderVisible(onScreenIds, visibleIds, fromIndex, toIndex)
}

/**
 * Visible index for a pointer drop.
 * `gapBefore` is the row whose top edge is the purple line, or `visibleCount` for the line under the last row.
 * Dragging downward used to splice at that row and land one slot below the line.
 */
export function indexForDropGap(fromIndex: number, gapBefore: number): number {
  if (gapBefore > fromIndex) return gapBefore - 1
  return gapBefore
}

/** Move one visible row. Items hidden by the current filter stay in their slots. */
export function reorderVisible(order: readonly string[], visibleIds: readonly string[], fromIndex: number, toIndex: number): string[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= visibleIds.length || toIndex >= visibleIds.length) {
    return [...order]
  }
  const moving = visibleIds[fromIndex]
  const nextVisible = visibleIds.filter((_, index) => index !== fromIndex)
  nextVisible.splice(toIndex, 0, moving)
  const visibleSet = new Set(visibleIds)
  const base = [...order]
  for (const id of visibleIds) {
    if (!base.includes(id)) base.push(id)
  }
  let cursor = 0
  return base.map((id) => {
    if (!visibleSet.has(id)) return id
    const next = nextVisible[cursor]
    cursor += 1
    return next
  })
}

export function sortProjects<T extends Project>(projects: T[], sort: SortKey, today: string): T[] {
  const copy = [...projects]
  copy.sort((a, b) => {
    if (sort === "manual") return a.name.localeCompare(b.name)
    if (sort === "name") return a.name.localeCompare(b.name)
    if (sort === "market") {
      return a.primaryMarket.localeCompare(b.primaryMarket) || a.name.localeCompare(b.name)
    }
    if (sort === "status") {
      return statusRank(a.status) - statusRank(b.status) || a.name.localeCompare(b.name)
    }
    if (sort === "recency") {
      const ad = a.recordingDate || a.createdTime.slice(0, 10)
      const bd = b.recordingDate || b.createdTime.slice(0, 10)
      if (ad && bd && ad !== bd) return ad < bd ? 1 : -1
      if (ad && !bd) return -1
      if (!ad && bd) return 1
      return a.name.localeCompare(b.name)
    }
    if (sort === "priority") {
      return priorityRank(a.priority) - priorityRank(b.priority) || a.name.localeCompare(b.name)
    }
    if (sort === "credibility") {
      return (
        priorityRank(boardCredibility(a) ?? "") - priorityRank(boardCredibility(b) ?? "") ||
        a.name.localeCompare(b.name)
      )
    }
    if (sort === "deadline") {
      const ad = a.requestorsDeadline
      const bd = b.requestorsDeadline
      if (ad && bd && ad !== bd) return ad < bd ? -1 : 1
      if (ad && !bd) return -1
      if (!ad && bd) return 1
      return a.name.localeCompare(b.name)
    }
    const urgency = urgencyRank(a, today) - urgencyRank(b, today)
    if (urgency !== 0) return urgency
    const ad = a.requestorsDeadline
    const bd = b.requestorsDeadline
    if (ad && bd && ad !== bd) {
      const aKind = deadlineKind(a, today)
      if (aKind === "overdue") return ad < bd ? -1 : 1
      return ad < bd ? -1 : 1
    }
    return statusRank(a.status) - statusRank(b.status) || a.name.localeCompare(b.name)
  })
  return copy
}

export function searchProjects<T extends Project>(
  projects: T[],
  filters: ExplicitFilters,
  sort: SortKey,
  today: string,
  order: readonly string[] = [],
): T[] {
  const filtered = filterProjects(projects, filters, today)
  if (sort === "manual") return sortByManual(filtered, order)
  return sortProjects(filtered, sort, today)
}

export function countBy(projects: Project[], pick: (project: Project) => string): Map<string, number> {
  const counts = new Map<string, number>()
  for (const project of projects) {
    const key = pick(project)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

export const EMPTY_FILTERS: ExplicitFilters = {
  query: "",
  statuses: [],
  markets: [],
  priorities: [],
  credibility: [],
  deadline: "any",
  videoLink: "any",
  posted: "any",
  missingPlatform: "",
  pipeline: "all",
  topics: [],
}

/** Opening view: still in the edit pipeline. Complete stays one click away. */
export const BOARD_FILTERS: ExplicitFilters = {
  ...EMPTY_FILTERS,
  pipeline: "active",
}

export function filtersAreActive(filters: ExplicitFilters): boolean {
  return (
    filters.query.trim() !== "" ||
    filters.statuses.length > 0 ||
    filters.markets.length > 0 ||
    filters.priorities.length > 0 ||
    (filters.credibility?.length ?? 0) > 0 ||
    filters.deadline !== "any" ||
    filters.videoLink !== "any" ||
    (filters.posted ?? "any") !== "any" ||
    Boolean(filters.missingPlatform) ||
    (filters.topics?.length ?? 0) > 0 ||
    (filters.pipeline ?? "all") !== "active"
  )
}
