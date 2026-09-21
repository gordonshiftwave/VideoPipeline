export const STATUSES = [
  "Busy Briefing",
  "Editing Not Started ( already Briefed)",
  "Editing In Progress",
  "Ready for Review",
  "Reviewed - needs edits",
  "Reviewed - Approved",
  "Complete",
  "On Hold",
] as const

export type Status = (typeof STATUSES)[number]

export const PRIORITIES = ["High", "Medium", "Low"] as const
export type Priority = (typeof PRIORITIES)[number]

export const PLATFORM_IDS = [
  "tiktok",
  "youtube",
  "instagram",
  "facebook",
  "linkedin",
  "x",
  "threads",
  "reddit",
  "pinterest",
] as const

export type PlatformId = (typeof PLATFORM_IDS)[number]

export type Project = {
  id: string
  createdTime: string
  uniqueId: string
  name: string
  primaryMarket: string
  status: string
  priority: string
  videoTopic: string[]
  requestorsDeadline: string | null
  kpiStartDate: string | null
  kpiEstDeliveryDate: string | null
  kpiActualDeliveryDate: string | null
  recordingDate: string | null
  description: string | null
  linkToBrief: string | null
  reviewLink: string | null
  dateReviewLinkSent: string | null
  sourceFootage: string | null
  finalApprovedVideoLink: string | null
  editType: string | null
  requester: string[]
  questionsNotes: string | null
  evidenceLibraryHandoff: string | null
  evidenceLibrarySwoId: string | null
  evidenceLibraryRecordUrl: string | null
  evidenceHandoffNotes: string | null
}

export type FieldPatch = {
  status?: string
  requestorsDeadline?: string | null
  kpiEstDeliveryDate?: string | null
  kpiActualDeliveryDate?: string | null
}

export type ProjectUpdate = FieldPatch & { id: string }

export type FieldOverride = FieldPatch

export type PlatformEntry = {
  completedOn: string | null
  url: string | null
}

export type PlatformMap = Partial<Record<PlatformId, PlatformEntry>>

export type LocalStore = {
  version: 1
  overrides: Record<string, FieldOverride>
  platforms: Record<string, PlatformMap>
}

export type DeadlineFilter = "any" | "has" | "missing" | "overdue" | "today"
export type VideoLinkFilter = "any" | "has" | "missing"
export type SortKey = "urgency" | "deadline" | "name" | "status" | "market"
export type Density = "cards" | "list"

export type ExplicitFilters = {
  query: string
  statuses: string[]
  markets: string[]
  priorities: string[]
  deadline: DeadlineFilter
  videoLink: VideoLinkFilter
}

export type Catalog = {
  source: "snapshot" | "airtable"
  writable: boolean
  exportedAt: string | null
  fetchedAt: string
  warning: string | null
  projects: Project[]
  baseId: string
  tableId: string
  baseName: string
}

export type DeadlineKind = "missing" | "overdue" | "today" | "upcoming" | "met"
