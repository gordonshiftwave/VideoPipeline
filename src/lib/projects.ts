import { CLOSED_STATUSES, STATUS_SHORT } from "@/lib/taxonomy"
import type {
  DeadlineFilter,
  DeadlineKind,
  ExplicitFilters,
  FieldOverride,
  Project,
  SortKey,
} from "@/lib/types"
import { STATUSES } from "@/lib/types"

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

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  const [y, m, d] = iso.split("-").map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
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
  const [y, m, d] = iso.split("-").map(Number)
  const [ty, tm, td] = today.split("-").map(Number)
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
}

const QUERY_RULES: {
  pattern: RegExp
  apply: (out: InterpretedQuery) => void
}[] = [
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

function haystack(project: Project): string {
  return [
    project.name,
    project.uniqueId,
    project.primaryMarket,
    project.status,
    STATUS_SHORT[project.status],
    project.priority,
    project.description,
    project.questionsNotes,
    project.editType,
    project.evidenceHandoffNotes,
    project.evidenceLibrarySwoId,
    project.videoTopic.join(" "),
    project.requester.join(" "),
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
  return Boolean(project.reviewLink || project.finalApprovedVideoLink)
}

export function filterProjects(
  projects: Project[],
  filters: ExplicitFilters,
  today: string,
): Project[] {
  const interpreted = interpretQuery(filters.query)
  const statuses = combineLists(filters.statuses, interpreted.statuses)
  const markets = combineLists(filters.markets, interpreted.markets)
  const deadline = combineDeadline(filters.deadline, interpreted.deadline)
  const videoLink = filters.videoLink === "any" ? interpreted.videoLink : filters.videoLink
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
    if (!matchesDeadline(project, deadline, today)) return false
    if (videoLink === "has" && !hasVideoLink(project)) return false
    if (videoLink === "missing" && hasVideoLink(project)) return false
    if (tokens.length) {
      const hay = haystack(project)
      if (!tokens.every((token) => hay.includes(token))) return false
    }
    return true
  })
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

export function sortProjects(projects: Project[], sort: SortKey, today: string): Project[] {
  const copy = [...projects]
  copy.sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name)
    if (sort === "market") {
      return a.primaryMarket.localeCompare(b.primaryMarket) || a.name.localeCompare(b.name)
    }
    if (sort === "status") {
      return statusRank(a.status) - statusRank(b.status) || a.name.localeCompare(b.name)
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

export function searchProjects(
  projects: Project[],
  filters: ExplicitFilters,
  sort: SortKey,
  today: string,
): Project[] {
  return sortProjects(filterProjects(projects, filters, today), sort, today)
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
  deadline: "any",
  videoLink: "any",
}

export function filtersAreActive(filters: ExplicitFilters): boolean {
  return (
    filters.query.trim() !== "" ||
    filters.statuses.length > 0 ||
    filters.markets.length > 0 ||
    filters.priorities.length > 0 ||
    filters.deadline !== "any" ||
    filters.videoLink !== "any"
  )
}
