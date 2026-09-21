import { airtableConfig, loadCatalog, updateProjects } from "@/lib/airtable"
import type { ProjectUpdate } from "@/lib/types"

function isUpdate(value: unknown): value is ProjectUpdate {
  if (!value || typeof value !== "object") return false
  const record = value as Record<string, unknown>
  if (typeof record.id !== "string" || !record.id) return false
  if (record.status !== undefined && typeof record.status !== "string") return false
  for (const key of ["requestorsDeadline", "kpiEstDeliveryDate", "kpiActualDeliveryDate"] as const) {
    const date = record[key]
    if (date !== undefined && date !== null && typeof date !== "string") return false
  }
  return true
}

export async function handleProjectsRequest(method: string, rawBody: string | null) {
  if (method === "GET" || method === "HEAD") {
    return { status: 200, json: await loadCatalog() }
  }
  if (method !== "PATCH") {
    return { status: 405, json: { ok: false, message: "Method not allowed." } }
  }

  let body: unknown
  try {
    body = rawBody ? JSON.parse(rawBody) : null
  } catch {
    return { status: 400, json: { ok: false, message: "Expected a JSON body." } }
  }
  const updates = (body as { updates?: unknown } | null)?.updates
  if (!Array.isArray(updates) || updates.length === 0 || !updates.every(isUpdate)) {
    return { status: 400, json: { ok: false, message: "Provide a list of project updates." } }
  }
  if (updates.length > 100) {
    return { status: 400, json: { ok: false, message: "Update 100 projects or fewer at a time." } }
  }
  if (!airtableConfig().token) {
    return {
      status: 403,
      json: {
        ok: false,
        code: "read-only",
        message:
          "Saved in this browser only. Add AIRTABLE_PAT with edit access to write deadlines back to Airtable.",
      },
    }
  }

  try {
    const result = await updateProjects(updates)
    return { status: 200, json: { ok: true, updated: result.updated } }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Airtable update failed"
    return {
      status: 502,
      json: {
        ok: false,
        message: `Saved in this browser. Airtable did not accept the change: ${message}`,
      },
    }
  }
}
