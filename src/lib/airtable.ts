import snapshotFile from "@/data/active-video-projects.json"
import { AIRTABLE_FIELDS, BASE_ID, BASE_NAME, TABLE_ID } from "@/lib/taxonomy"
import { normalizeProject } from "@/lib/projects"
import type { Catalog, Project, ProjectUpdate } from "@/lib/types"

type AirtableRecord = {
  id: string
  createdTime?: string
  fields?: Record<string, unknown>
}

type AirtablePage = {
  records?: AirtableRecord[]
  offset?: string
  error?: { message?: string }
}

const F = AIRTABLE_FIELDS

function snapshotProjects(): Project[] {
  const projects = snapshotFile.projects as Array<Record<string, unknown> & { id: string }>
  return projects.map((project) =>
    normalizeProject({
      id: project.id,
      createdTime: project.createdTime,
      uniqueId: project.uniqueId,
      name: project.name,
      primaryMarket: project.primaryMarket,
      status: project.status,
      priority: project.priority,
      videoTopic: project.videoTopic,
      requestorsDeadline: project.requestorsDeadline,
      kpiStartDate: project.kpiStartDate,
      kpiEstDeliveryDate: project.kpiEstDeliveryDate,
      kpiActualDeliveryDate: project.kpiActualDeliveryDate,
      recordingDate: project.recordingDate,
      description: project.description,
      linkToBrief: project.linkToBrief,
      reviewLink: project.reviewLink,
      dateReviewLinkSent: project.dateReviewLinkSent,
      sourceFootage: project.sourceFootage,
      finalApprovedVideoLink: project.finalApprovedVideoLink,
      editType: project.editType,
      requester: project.requester,
      questionsNotes: project.questionsNotes,
      evidenceLibraryHandoff: project.evidenceLibraryHandoff,
      evidenceLibrarySwoId: project.evidenceLibrarySwoId,
      evidenceLibraryRecordUrl: project.evidenceLibraryRecordUrl,
    }),
  )
}

function fromAirtable(record: AirtableRecord): Project {
  const fields = record.fields ?? {}
  return normalizeProject({
    id: record.id,
    createdTime: record.createdTime,
    uniqueId: fields[F.uniqueId],
    name: fields[F.name],
    primaryMarket: fields[F.primaryMarket],
    status: fields[F.status],
    priority: fields[F.priority],
    videoTopic: fields[F.videoTopic],
    requestorsDeadline: fields[F.requestorsDeadline],
    kpiStartDate: fields[F.kpiStartDate],
    kpiEstDeliveryDate: fields[F.kpiEstDeliveryDate],
    kpiActualDeliveryDate: fields[F.kpiActualDeliveryDate],
    recordingDate: fields[F.recordingDate],
    description: fields[F.description],
    linkToBrief: fields[F.linkToBrief],
    reviewLink: fields[F.reviewLink],
    dateReviewLinkSent: fields[F.dateReviewLinkSent],
    sourceFootage: fields[F.sourceFootage],
    finalApprovedVideoLink: fields[F.finalApprovedVideoLink],
    editType: fields[F.editType],
    requester: fields[F.requester],
    questionsNotes: fields[F.questionsNotes],
    evidenceLibraryHandoff: fields[F.evidenceLibraryHandoff],
    evidenceLibrarySwoId: fields[F.evidenceLibrarySwoId],
    evidenceLibraryRecordUrl: fields[F.evidenceLibraryRecordUrl],
    evidenceHandoffNotes: fields[F.evidenceHandoffNotes],
  })
}

export function airtableConfig() {
  const token = process.env.AIRTABLE_PAT || process.env.AIRTABLE_API_KEY || ""
  const baseId = process.env.AIRTABLE_BASE_ID || BASE_ID
  const tableId = process.env.AIRTABLE_TABLE_ID || TABLE_ID
  return { token: token.trim(), baseId, tableId }
}

function snapshotCatalog(warning: string | null): Catalog {
  const { baseId, tableId } = airtableConfig()
  return {
    source: "snapshot",
    writable: false,
    exportedAt: snapshotFile.exportedAt,
    fetchedAt: new Date().toISOString(),
    warning,
    projects: snapshotProjects(),
    baseId,
    tableId,
    baseName: snapshotFile.baseName || BASE_NAME,
  }
}

async function fetchAirtableProjects(token: string, baseId: string, tableId: string): Promise<Project[]> {
  const projects: Project[] = []
  let offset: string | undefined
  for (let page = 0; page < 20; page += 1) {
    const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`)
    url.searchParams.set("pageSize", "100")
    if (offset) url.searchParams.set("offset", offset)
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    })
    const body = (await response.json()) as AirtablePage
    if (!response.ok) {
      throw new Error(body.error?.message || `Airtable responded ${response.status}`)
    }
    for (const record of body.records ?? []) projects.push(fromAirtable(record))
    if (!body.offset) break
    offset = body.offset
  }
  return projects
}

export async function loadCatalog(): Promise<Catalog> {
  const { token, baseId, tableId } = airtableConfig()
  if (!token) return snapshotCatalog(null)
  try {
    const projects = await fetchAirtableProjects(token, baseId, tableId)
    return {
      source: "airtable",
      writable: true,
      exportedAt: null,
      fetchedAt: new Date().toISOString(),
      warning: null,
      projects,
      baseId,
      tableId,
      baseName: BASE_NAME,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Airtable request failed"
    return snapshotCatalog(
      `Airtable could not be read (${message}). Showing the saved snapshot instead, and writes are paused.`,
    )
  }
}

function toAirtableFields(update: ProjectUpdate): Record<string, string | null> {
  const fields: Record<string, string | null> = {}
  if (update.status !== undefined) fields[F.status] = update.status
  if (update.requestorsDeadline !== undefined) {
    fields[F.requestorsDeadline] = update.requestorsDeadline
  }
  if (update.kpiEstDeliveryDate !== undefined) {
    fields[F.kpiEstDeliveryDate] = update.kpiEstDeliveryDate
  }
  if (update.kpiActualDeliveryDate !== undefined) {
    fields[F.kpiActualDeliveryDate] = update.kpiActualDeliveryDate
  }
  return fields
}

export async function updateProjects(updates: ProjectUpdate[]): Promise<{ updated: number }> {
  const { token, baseId, tableId } = airtableConfig()
  if (!token) {
    throw new Error("No Airtable token is configured.")
  }
  const records = updates
    .map((update) => ({ id: update.id, fields: toAirtableFields(update) }))
    .filter((record) => Object.keys(record.fields).length > 0)
  if (records.length === 0) return { updated: 0 }

  let updated = 0
  for (let index = 0; index < records.length; index += 10) {
    const chunk = records.slice(index, index + 10)
    const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ records: chunk }),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    })
    const body = (await response.json()) as AirtablePage
    if (!response.ok) {
      throw new Error(body.error?.message || `Airtable responded ${response.status}`)
    }
    updated += body.records?.length ?? chunk.length
  }
  return { updated }
}
