import type { PlatformId } from "@/lib/types"
import { tokens } from "@/theme/tokens"

export const STATUS_SHORT: Record<string, string> = {
  "Busy Briefing": "Briefing",
  "Editing Not Started ( already Briefed)": "Briefed",
  "Editing In Progress": "Editing",
  "Ready for Review": "For review",
  "Reviewed - needs edits": "Needs edits",
  "Reviewed - Approved": "Approved",
  Complete: "Complete",
  "On Hold": "On hold",
}

/** Small status dots drawn from shiftwave.co tokens. Energy and calm stay rare. */
export const STATUS_DOT: Record<string, string> = {
  "Busy Briefing": tokens.peachDeep,
  "Editing Not Started ( already Briefed)": tokens.inkFaint,
  "Editing In Progress": tokens.indigo,
  "Ready for Review": tokens.calm,
  "Reviewed - needs edits": tokens.energy,
  "Reviewed - Approved": tokens.indigoDeep,
  Complete: tokens.positive,
  "On Hold": tokens.inkSoft,
}

export const DEFAULT_DOT = tokens.inkFaint

/**
 * Platform completion is not on the Projects table yet.
 * `plannedFields` is the name pair to use if those columns are added later.
 * Pinterest stays last and visually quieter.
 */
export const PLATFORMS: {
  id: PlatformId
  label: string
  emphasis: "primary" | "low"
  plannedFields: { completedOn: string; url: string }
}[] = [
  {
    id: "tiktok",
    label: "TikTok",
    emphasis: "primary",
    plannedFields: { completedOn: "TikTok Completed On", url: "TikTok URL" },
  },
  {
    id: "youtube",
    label: "YouTube",
    emphasis: "primary",
    plannedFields: { completedOn: "YouTube Completed On", url: "YouTube URL" },
  },
  {
    id: "instagram",
    label: "Instagram",
    emphasis: "primary",
    plannedFields: {
      completedOn: "Instagram Completed On",
      url: "Instagram URL",
    },
  },
  {
    id: "facebook",
    label: "Facebook",
    emphasis: "primary",
    plannedFields: { completedOn: "Facebook Completed On", url: "Facebook URL" },
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    emphasis: "primary",
    plannedFields: { completedOn: "LinkedIn Completed On", url: "LinkedIn URL" },
  },
  {
    id: "x",
    label: "X",
    emphasis: "primary",
    plannedFields: { completedOn: "X Completed On", url: "X URL" },
  },
  {
    id: "threads",
    label: "Threads",
    emphasis: "primary",
    plannedFields: { completedOn: "Threads Completed On", url: "Threads URL" },
  },
  {
    id: "reddit",
    label: "Reddit",
    emphasis: "primary",
    plannedFields: { completedOn: "Reddit Completed On", url: "Reddit URL" },
  },
  {
    id: "pinterest",
    label: "Pinterest",
    emphasis: "low",
    plannedFields: {
      completedOn: "Pinterest Completed On",
      url: "Pinterest URL",
    },
  },
]

/** Airtable Projects field names used for reads and writes. */
export const AIRTABLE_FIELDS = {
  uniqueId: "Unique ID",
  name: "Name",
  primaryMarket: "Primary Market",
  status: "Status",
  priority: "Priority",
  videoTopic: "Video Topic",
  requestorsDeadline: "Requestors Deadline (if applicable)",
  kpiStartDate: "KPI Start Date",
  kpiEstDeliveryDate: "KPI Est Delivery Date",
  kpiActualDeliveryDate: "KPI Actual Delivery date",
  description: "Description",
  recordingDate: "Recording Date",
  linkToBrief: "Link to Brief",
  reviewLink: "Review Link ( Latest Video)",
  dateReviewLinkSent: "Date Review Link Sent",
  sourceFootage: "Source Footage",
  requester: "Requester",
  editType: "Edit Type",
  questionsNotes: "Questions/Notes",
  finalApprovedVideoLink: "Final Approved Video Link",
  evidenceLibraryHandoff: "Evidence Library Handoff",
  evidenceLibrarySwoId: "Evidence Library SWO ID",
  evidenceLibraryRecordUrl: "Evidence Library Record URL",
  evidenceHandoffNotes: "Evidence Handoff Notes",
} as const

export const CLOSED_STATUSES = new Set(["Complete", "Reviewed - Approved"])

export const BASE_ID = "appjow4jvzjySNd9x"
export const TABLE_ID = "tblbX5AOLbbGU7YjR"
export const BASE_NAME = "Active Video Projects"
export const TABLE_URL = `https://airtable.com/${BASE_ID}/${TABLE_ID}`
