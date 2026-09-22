import assert from "node:assert/strict"
import test from "node:test"
import snapshot from "../data/active-video-projects.json"
import { ladderFor } from "./taxonomy"
import {
  BOARD_FILTERS,
  EMPTY_FILTERS,
  formatDate,
  isPosted,
  normalizeProject,
  indexForDropGap,
  manualOrderFromDrag,
  reorderVisible,
  searchProjects,
} from "./projects"
import { suggestedTopics } from "./topics"

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

test("cut ladder aliases map onto Airtable statuses", () => {
  assert.equal(ladderFor("Editing In Progress").label, "Rough cut")
  assert.equal(ladderFor("Ready for Review").label, "First pass")
  assert.equal(ladderFor("Reviewed - needs edits").label, "Second pass")
  assert.equal(ladderFor("Busy Briefing").label, "Raw")
  assert.equal(ladderFor("Complete").label, "Finals in the can")
  assert.equal(count("rough cut"), 22)
  assert.equal(count("first pass"), 13)
})

test("in pipeline hides complete until a name search or already live", () => {
  const active = searchProjects(projects, { ...BOARD_FILTERS }, "name", TODAY)
  assert.equal(active.length, 88)
  assert.ok(active.every((project) => project.status !== "Complete"))
  const live = searchProjects(projects, { ...EMPTY_FILTERS, pipeline: "live" }, "name", TODAY)
  assert.equal(live.length, 4)
  const named = searchProjects(projects, { ...BOARD_FILTERS, query: "Julianne" }, "name", TODAY)
  assert.equal(named.length, 1)
})

test("missing instagram is a platform filter phrase", () => {
  const missing = searchProjects(projects, { ...EMPTY_FILTERS, query: "missing instagram" }, "name", TODAY)
  assert.equal(missing.length, 92)
})

test("delivery dates stay on the calendar day", () => {
  assert.equal(formatDate("2026-09-30"), "Sep 30, 2026")
  assert.equal(formatDate("2026-09-30T00:00:00.000Z"), "Sep 30, 2026")
})

test("topic suggestions follow hints and skip lookalikes", () => {
  const senior = suggestedTopics({
    name: "Bonnie Weiss — Senior 83 Testimonial",
    description: null,
    questionsNotes: null,
    primaryMarket: "At-Home",
    videoTopic: ["Seniors  (Gordon)"],
  })
  assert.deepEqual(senior, ["Seniors"])
  const lookalike = suggestedTopics({
    name: "Seniority ladder",
    description: "A preventative briefing",
    questionsNotes: null,
    primaryMarket: "Corporate",
    videoTopic: [],
  })
  assert.deepEqual(lookalike, [])
  const women = suggestedTopics({
    name: "Clinic morning",
    description: "Women's recovery circle",
    questionsNotes: null,
    primaryMarket: "Clinics / Performance Centers",
    videoTopic: [],
  })
  assert.deepEqual(women, ["Women's Space"])
})

test("manual reorder keeps filtered-out rows in place", () => {
  const next = reorderVisible(["a", "b", "c", "d", "e"], ["b", "d", "e"], 1, 0)
  assert.deepEqual(next, ["a", "d", "c", "b", "e"])
})

test("a downward drop lands in the purple gap, not one row below it", () => {
  const visible = ["a", "b", "c", "d"]
  const landed = indexForDropGap(0, 2)
  assert.equal(landed, 1)
  assert.deepEqual(reorderVisible(visible, visible, 0, landed), ["b", "a", "c", "d"])
  assert.deepEqual(reorderVisible(visible, visible, 0, 2), ["b", "c", "a", "d"])
})

test("an upward drop still inserts at the gap above that row", () => {
  const visible = ["a", "b", "c", "d"]
  assert.equal(indexForDropGap(3, 1), 1)
  assert.deepEqual(reorderVisible(visible, visible, 3, indexForDropGap(3, 1)), ["a", "d", "b", "c"])
})

test("dropping below the last row moves to the end", () => {
  const visible = ["a", "b", "c", "d"]
  assert.equal(indexForDropGap(1, visible.length), 3)
  assert.deepEqual(reorderVisible(visible, visible, 1, indexForDropGap(1, visible.length)), ["a", "c", "d", "b"])
})

test("a drag adopts the on-screen sort instead of a stale manual order", () => {
  const onScreen = ["c", "a", "hidden", "b"]
  const stale = ["a", "hidden", "b", "c"]
  const visible = ["c", "a", "b"]
  assert.deepEqual(manualOrderFromDrag(onScreen, visible, 2, 0), ["b", "c", "hidden", "a"])
  assert.deepEqual(reorderVisible(stale, visible, 2, 0), ["b", "hidden", "c", "a"])
})

test("a platform cut alone is not posted", () => {
  assert.equal(isPosted({ instagram: { completedOn: null, url: null, cut: true } }), false)
  assert.equal(isPosted({ instagram: { completedOn: "2026-09-30", url: null } }), true)
})

test("category filter matches a suggested tag", () => {
  const tagged = projects.map((project) =>
    project.name === "Julianne-senior"
      ? { ...project, confirmedTopics: [] as const, suggestedTopics: ["Seniors"] as const }
      : project,
  )
  const found = searchProjects(tagged, { ...EMPTY_FILTERS, topics: ["Seniors"] }, "name", TODAY)
  assert.equal(found.length, 1)
  assert.equal(found[0]?.name, "Julianne-senior")
})
