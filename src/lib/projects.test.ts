import assert from "node:assert/strict"
import test from "node:test"
import snapshot from "../data/active-video-projects.json"
import { EMPTY_FILTERS, normalizeProject, searchProjects } from "./projects"

const TODAY = "2026-09-21"

const projects = (snapshot.projects as Array<Record<string, unknown> & { id: string }>).map((project) =>
  normalizeProject(project),
)

function count(query: string) {
  return searchProjects(projects, { ...EMPTY_FILTERS, query }, "urgency", TODAY).length
}

test("search finds Julianne and Pro Sports", () => {
  assert.equal(count("Julianne"), 1)
  assert.equal(count("pro sports"), 8)
  assert.equal(count("seniors"), 11)
})

test("editing in progress is the live queue of 22", () => {
  assert.equal(count("editing in progress"), 22)
})

test("deadline phrases split the queue", () => {
  assert.equal(count("due today"), 48)
  assert.equal(count("missing deadline"), 40)
  assert.equal(count("overdue"), 0)
  assert.equal(count("complete"), 4)
})

test("explicit status filter matches the phrase", () => {
  const filtered = searchProjects(
    projects,
    { ...EMPTY_FILTERS, statuses: ["Editing In Progress"] },
    "name",
    TODAY,
  )
  assert.equal(filtered.length, 22)
  assert.ok(filtered.every((project) => project.status === "Editing In Progress"))
})
