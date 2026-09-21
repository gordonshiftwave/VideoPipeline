import { BulkDialog } from "@/components/BulkDialog"
import { FilterBar } from "@/components/FilterBar"
import { ProjectDetail } from "@/components/ProjectDetail"
import { BoardHead, ProjectRow } from "@/components/ProjectRow"
import { SearchBar } from "@/components/SearchBar"
import { WaveMark } from "@/components/WaveMark"
import { demoCatalog } from "@/lib/demo-catalog"
import {
  applyOverride,
  countBy,
  deadlineKind,
  BOARD_FILTERS,
  filtersAreActive,
  interpretQuery,
  overrideKeys,
  searchProjects,
  todayISO,
} from "@/lib/projects"
import {
  clearOverrides,
  getLocalStore,
  getServerStore,
  saveCredibility,
  savePlatform,
  saveUpdates,
  subscribeLocalStore,
} from "@/lib/storage"
import { PLATFORMS, TABLE_URL } from "@/lib/taxonomy"
import type { Catalog, Credibility, Density, ExplicitFilters, FieldPatch, PlatformId, SortKey } from "@/lib/types"
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"

const SORTS: { value: SortKey; label: string }[] = [
  { value: "urgency", label: "Urgency" },
  { value: "deadline", label: "Deadline" },
  { value: "recency", label: "Recency" },
  { value: "priority", label: "Priority" },
  { value: "credibility", label: "Credibility" },
  { value: "status", label: "Status" },
  { value: "market", label: "Market" },
  { value: "name", label: "Name" },
]

export function App() {
  const store = useSyncExternalStore(subscribeLocalStore, getLocalStore, getServerStore)
  const [catalog, setCatalog] = useState<Catalog>(() => demoCatalog())
  const [filters, setFilters] = useState<ExplicitFilters>(BOARD_FILTERS)
  const [sort, setSort] = useState<SortKey>("urgency")
  const [density, setDensity] = useState<Density>("cards")
  const [selected, setSelected] = useState<string[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [cursor, setCursor] = useState(0)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [urlReady, setUrlReady] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const anchorRef = useRef(0)
  const [today, setToday] = useState(() => todayISO())

  const projects = useMemo(
    () =>
      catalog.projects.map((project) => ({
        ...applyOverride(project, store.overrides[project.id]),
        credibility: store.credibility[project.id] ?? null,
        platforms: store.platforms[project.id] ?? {},
      })),
    [catalog.projects, store.overrides, store.credibility, store.platforms],
  )
  const visible = useMemo(
    () => searchProjects(projects, filters, sort, today),
    [projects, filters, sort, today],
  )
  const statusCounts = useMemo(() => countBy(projects, (project) => project.status), [projects])
  const marketCounts = useMemo(() => countBy(projects, (project) => project.primaryMarket), [projects])
  const priorityCounts = useMemo(() => countBy(projects, (project) => project.priority), [projects])
  const active = projects.find((project) => project.id === activeId) ?? null
  const interpreted = interpretQuery(filters.query)
  const activeFilterCount =
    filters.statuses.length +
    filters.markets.length +
    filters.priorities.length +
    (filters.credibility.length ? 1 : 0) +
    (filters.deadline !== "any" ? 1 : 0) +
    (filters.videoLink !== "any" ? 1 : 0) +
    (filters.posted !== "any" ? 1 : 0) +
    (filters.missingPlatform ? 1 : 0) +
    (filters.pipeline !== "active" ? 1 : 0)
  const localEditCount = Object.keys(store.overrides).length
  const dueToday = projects.filter((project) => deadlineKind(project, today) === "today").length
  const overdue = projects.filter((project) => deadlineKind(project, today) === "overdue").length

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const next = { ...BOARD_FILTERS }
    next.query = params.get("q") ?? ""
    next.statuses = params.getAll("status")
    next.markets = params.getAll("market")
    next.priorities = params.getAll("priority")
    next.credibility = params.getAll("credibility").filter((value): value is Credibility =>
      value === "High" || value === "Medium" || value === "Low",
    )
    const pipeline = params.get("pipeline")
    if (pipeline === "active" || pipeline === "live" || pipeline === "all") next.pipeline = pipeline
    const posted = params.get("posted")
    if (posted === "any" || posted === "posted" || posted === "not-posted") next.posted = posted
    const platform = params.get("platform")
    if (PLATFORMS.some((item) => item.id === platform)) next.missingPlatform = platform as PlatformId
    const deadline = params.get("deadline")
    if (deadline === "has" || deadline === "missing" || deadline === "overdue" || deadline === "today") {
      next.deadline = deadline
    }
    const link = params.get("link")
    if (link === "has" || link === "missing") next.videoLink = link
    setFilters(next)
    const sortParam = params.get("sort")
    if (SORTS.some((item) => item.value === sortParam)) setSort(sortParam as SortKey)
    if (params.get("view") === "list" || params.get("view") === "cards") {
      setDensity(params.get("view") as Density)
    }
    if (
      next.statuses.length ||
      next.markets.length ||
      next.priorities.length ||
      next.credibility.length ||
      next.deadline !== "any" ||
      next.videoLink !== "any" ||
      next.posted !== "any" ||
      next.missingPlatform
    ) {
      setFiltersOpen(true)
    }
    const projectParam = params.get("project")
    if (projectParam) {
      const match = catalog.projects.find(
        (project) => project.id === projectParam || project.uniqueId === projectParam,
      )
      if (match) setActiveId(match.id)
    }
    setUrlReady(true)
  }, [catalog.projects])

  useEffect(() => {
    let cancelled = false
    void refreshCatalog(false).then((next) => {
      if (cancelled || !next) return
      setCatalog(next)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!urlReady) return
    const params = new URLSearchParams()
    if (filters.query) params.set("q", filters.query)
    filters.statuses.forEach((status) => params.append("status", status))
    filters.markets.forEach((market) => params.append("market", market))
    filters.priorities.forEach((priority) => params.append("priority", priority))
    filters.credibility.forEach((rating) => params.append("credibility", rating))
    if (filters.deadline !== "any") params.set("deadline", filters.deadline)
    if (filters.videoLink !== "any") params.set("link", filters.videoLink)
    if (filters.posted !== "any") params.set("posted", filters.posted)
    if (filters.missingPlatform) params.set("platform", filters.missingPlatform)
    if (filters.pipeline !== "active") params.set("pipeline", filters.pipeline)
    if (sort !== "urgency") params.set("sort", sort)
    if (density !== "cards") params.set("view", density)
    if (activeId) {
      const project = projects.find((item) => item.id === activeId)
      params.set("project", project?.uniqueId ?? activeId)
    }
    const next = params.toString()
    const url = next ? `${window.location.pathname}?${next}` : window.location.pathname
    window.history.replaceState(null, "", url)
  }, [urlReady, filters, sort, density, activeId, projects])

  useEffect(() => {
    if (cursor >= visible.length) setCursor(Math.max(0, visible.length - 1))
  }, [cursor, visible.length])

  useEffect(() => {
    document.querySelector(`[data-index="${cursor}"]`)?.scrollIntoView({ block: "nearest" })
  }, [cursor, density])

  const keyHandler = useRef<(event: KeyboardEvent) => void>(() => {})
  keyHandler.current = (event: KeyboardEvent) => {
    const target = event.target
    const typing =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    if (event.key === "/" && !typing) {
      event.preventDefault()
      searchRef.current?.focus()
      searchRef.current?.select()
      return
    }
    if (event.key === "Escape") {
      if (bulkOpen) {
        setBulkOpen(false)
        return
      }
      if (activeId) {
        setActiveId(null)
        return
      }
      if (document.activeElement === searchRef.current && filters.query) {
        setFilters((current) => ({ ...current, query: "" }))
      }
      return
    }
    if (typing || bulkOpen) return
    if (event.key === "j") {
      event.preventDefault()
      setCursor((current) => Math.min(visible.length - 1, current + 1))
    } else if (event.key === "k") {
      event.preventDefault()
      setCursor((current) => Math.max(0, current - 1))
    } else if (event.key === "Enter" && target === document.body && visible[cursor]) {
      setActiveId(visible[cursor].id)
    } else if (event.key === "x" && visible[cursor] && target === document.body) {
      toggleOne(visible[cursor].id, cursor, event.shiftKey)
    }
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => keyHandler.current(event)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  function toggleOne(id: string, index: number, shiftKey: boolean) {
    setSelected((current) => {
      if (shiftKey) {
        const start = Math.min(anchorRef.current, index)
        const end = Math.max(anchorRef.current, index)
        const range = visible.slice(start, end + 1).map((project) => project.id)
        return [...new Set([...current, ...range])]
      }
      anchorRef.current = index
      return current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    })
  }

  async function persist(ids: string[], patch: FieldPatch) {
    const updates = ids.map((id) => ({ id, ...patch }))
    saveUpdates(updates)
    if (!catalog.writable) {
      setNotice("Saved on this device. Airtable writes are off until a personal access token is set.")
      return
    }
    setNotice("Saving to Airtable…")
    try {
      const response = await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      })
      const body = (await response.json()) as { message?: string }
      if (!response.ok) {
        setNotice(body.message ?? "Saved on this device. Airtable did not accept the change.")
        return
      }
      setNotice("Saved to Airtable.")
    } catch {
      setNotice("Saved on this device. The Airtable request did not go through.")
    }
  }

  async function refreshCatalog(announce: boolean): Promise<Catalog | null> {
    try {
      const response = await fetch("/api/projects")
      if (!response.ok) throw new Error("Refresh failed")
      const next = (await response.json()) as Catalog
      if (announce) {
        setCatalog(next)
        setToday(todayISO())
        setNotice(next.source === "airtable" ? "Reloaded from Airtable." : "Reloaded the saved snapshot.")
      }
      return next
    } catch {
      if (announce) setNotice("Could not refresh. Showing the catalog already on screen.")
      return null
    }
  }

  function toggleQuick(query: string) {
    setFilters((current) => {
      const has = current.query.toLowerCase().includes(query)
      if (!has) {
        return { ...current, query: current.query.trim() ? `${current.query.trim()} ${query}` : query }
      }
      const stripped = current.query.replace(new RegExp(query, "ig"), " ").replace(/\s+/g, " ").trim()
      return { ...current, query: stripped }
    })
  }

  const reading = [
    interpreted.pipeline === "live" ? "already live" : interpreted.pipeline === "active" ? "in pipeline" : null,
    interpreted.posted === "not-posted" ? "not posted" : interpreted.posted === "posted" ? "posted" : null,
    interpreted.missingPlatform ? `missing ${interpreted.missingPlatform}` : null,
    interpreted.deadline,
    ...interpreted.statuses,
    ...interpreted.markets,
    interpreted.videoLink === "has" ? "has video link" : null,
    interpreted.videoLink === "missing" ? "missing video link" : null,
  ].filter(Boolean)
  const liveCount = projects.filter((project) => project.status === "Complete").length

  return (
    <div className="min-h-screen bg-paper text-ink">
      <a
        href="#results"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:bg-cream focus:px-3 focus:py-2"
      >
        Skip to projects
      </a>

      {catalog.warning ? (
        <div className="border-b border-energy/30 bg-energy-tint px-4 py-2.5 text-sm text-energy sm:px-6">
          <p className="mx-auto max-w-[1100px]">{catalog.warning}</p>
        </div>
      ) : null}

      <div className="live-banner">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-1 px-4 py-2.5 text-sm text-ink-soft sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            {catalog.writable ? (
              <>
                <strong>Connected to Airtable.</strong> Status and deadline changes sync to Active Video Projects.
              </>
            ) : (
              <>
                <strong>Read-only Airtable.</strong> Edits save in this browser until a personal access token with
                edit access is set. The current account can comment, not update records.
              </>
            )}
          </p>
          {localEditCount > 0 ? (
            <button
              type="button"
              className="text-link focus-ring shrink-0 text-left text-sm"
              onClick={() => {
                clearOverrides()
                setNotice("Cleared deadline and status edits stored on this device.")
              }}
            >
              Clear {localEditCount} local edit{localEditCount === 1 ? "" : "s"}
            </button>
          ) : null}
        </div>
      </div>

      <header className="results-chrome">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <WaveMark className="h-7 w-[5.15rem] shrink-0 text-cta" title="Shiftwave" />
              <h1 className="truncate font-display text-[0.98rem] font-semibold leading-[1.3] text-ink sm:text-xl">
                Video Pipeline
              </h1>
            </div>
            <button
              type="button"
              className="site-btn focus-ring shrink-0"
              onClick={() => {
                setRefreshing(true)
                void refreshCatalog(true).finally(() => setRefreshing(false))
              }}
              disabled={refreshing}
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
          <SearchBar
            query={filters.query}
            inputRef={searchRef}
            onQueryChange={(query) => setFilters((current) => ({ ...current, query }))}
          />
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            <FilterChip
              label="In pipeline"
              pressed={filters.pipeline === "active"}
              onClick={() => setFilters((current) => ({ ...current, pipeline: current.pipeline === "active" ? "all" : "active" }))}
            />
            <FilterChip
              label="Already live"
              pressed={filters.pipeline === "live"}
              onClick={() => setFilters((current) => ({ ...current, pipeline: current.pipeline === "live" ? "active" : "live" }))}
            />
            <FilterChip
              label="Not posted"
              pressed={filters.posted === "not-posted"}
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  posted: current.posted === "not-posted" ? "any" : "not-posted",
                }))
              }
            />
            <FilterChip
              label="Missing link"
              pressed={filters.videoLink === "missing"}
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  videoLink: current.videoLink === "missing" ? "any" : "missing",
                }))
              }
            />
            <FilterChip
              label="Overdue"
              pressed={filters.deadline === "overdue" || filters.query.toLowerCase().includes("overdue")}
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  deadline: current.deadline === "overdue" ? "any" : "overdue",
                }))
              }
            />
            <FilterChip
              label="Missing Instagram"
              pressed={filters.missingPlatform === "instagram"}
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  missingPlatform: current.missingPlatform === "instagram" ? "" : "instagram",
                }))
              }
            />
            <FilterChip
              label="Seniors"
              pressed={filters.query.toLowerCase().includes("seniors")}
              onClick={() => toggleQuick("seniors")}
            />
            <FilterChip
              label="Pro Sports"
              pressed={filters.query.toLowerCase().includes("pro sports")}
              onClick={() => toggleQuick("pro sports")}
            />
          </div>
          {reading.length ? (
            <p className="text-[0.82rem] text-ink-faint">
              Reading the search as {reading.join(" · ")}
              {interpreted.text ? ` · plus “${interpreted.text}”` : ""}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              className="radius-chip focus-ring"
              aria-pressed={filtersOpen}
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((open) => !open)}
            >
              Filters{activeFilterCount ? ` · ${activeFilterCount}` : ""}
            </button>
            <button
              type="button"
              className="radius-chip focus-ring"
              aria-pressed={density === "cards"}
              onClick={() => setDensity("cards")}
            >
              Comfortable
            </button>
            <button
              type="button"
              className="radius-chip focus-ring"
              aria-pressed={density === "list"}
              onClick={() => setDensity("list")}
            >
              Compact
            </button>
            <label className="ml-auto flex items-center gap-2 text-sm text-ink-soft">
              <span className="sr-only">Sort</span>
              <select
                className="field w-auto"
                aria-label="Sort projects"
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
              >
                {SORTS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {filtersOpen ? (
            <div>
              <div className="mb-2 flex justify-end">
                {filtersAreActive(filters) ? (
                  <button
                    type="button"
                    className="text-link focus-ring text-sm"
                    onClick={() => setFilters(BOARD_FILTERS)}
                  >
                    Clear filters
                  </button>
                ) : null}
              </div>
              <FilterBar
                filters={filters}
                statusCounts={statusCounts}
                marketCounts={marketCounts}
                priorityCounts={priorityCounts}
                onChange={setFilters}
              />
            </div>
          ) : null}
        </div>
      </header>

      <main
        id="results"
        className="reveal mx-auto max-w-[1100px] px-4 py-5 sm:px-6"
      >
        <section className="min-w-0">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-display text-[1.35rem] font-semibold leading-[1.3] text-ink sm:text-[1.55rem]">
                {visible.length} of {projects.length}
              </h2>
              <p className="text-sm text-ink-faint">
                {filters.pipeline === "live"
                  ? "Already live"
                  : filters.pipeline === "all"
                    ? "All projects, including already live"
                    : "In pipeline"}
                {" · "}
                {dueToday} due today
                {overdue ? ` · ${overdue} overdue` : ""}
                {filters.pipeline !== "live" ? ` · ${liveCount} already live` : ""}
                <span className="hidden sm:inline"> · / search · j k move · enter open · x select</span>
              </p>
            </div>
            {visible.length > 0 ? (
              <div className="flex gap-3 text-sm">
                <button
                  type="button"
                  className="text-link focus-ring"
                  onClick={() => setSelected(visible.map((project) => project.id))}
                >
                  Select these {visible.length}
                </button>
                {selected.length > 0 ? (
                  <button type="button" className="text-link focus-ring" onClick={() => setSelected([])}>
                    Clear
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {visible.length === 0 ? (
            <EmptyState
              query={filters.query}
              overdueEmpty={filters.query.toLowerCase().includes("overdue") && overdue === 0}
              dueToday={dueToday}
              onClear={() => setFilters(BOARD_FILTERS)}
              onDueToday={() => setFilters({ ...BOARD_FILTERS, deadline: "today" })}
            />
          ) : (
            <div className="place-panel">
              <BoardHead />
              <ul className="place-list">
                {visible.map((project, index) => (
                  <li key={project.id}>
                    <ProjectRow
                      project={project}
                      today={today}
                      index={index}
                      density={density}
                      platforms={project.platforms}
                      credibility={project.credibility}
                      selected={selected.includes(project.id)}
                      active={project.id === activeId}
                      cursor={index === cursor}
                      edited={overrideKeys(store.overrides[project.id]).length > 0}
                      onOpen={() => {
                        setCursor(index)
                        setActiveId(project.id)
                      }}
                      onToggle={(shiftKey) => toggleOne(project.id, index, shiftKey)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

      </main>

      {active ? (
        <aside className="fixed inset-0 z-40 md:inset-y-0 md:left-auto md:w-[28rem]">
          <button
            type="button"
            className="absolute inset-0 bg-[rgb(60_59_59/0.28)] md:hidden"
            aria-label="Close project"
            onClick={() => setActiveId(null)}
          />
          <div className="place-panel absolute inset-y-0 right-0 w-full overflow-y-auto bg-cream md:w-[28rem] md:shadow-[0_8px_28px_rgb(60_59_59/0.12)]">
            <ProjectDetail
              project={active}
              today={today}
              platforms={store.platforms[active.id] ?? {}}
              credibility={store.credibility[active.id] ?? null}
              edited={overrideKeys(store.overrides[active.id]).length > 0}
              onClose={() => setActiveId(null)}
              onPatch={(patch) => void persist([active.id], patch)}
              onPlatform={(platformId, entry) => savePlatform(active.id, platformId, entry)}
              onCredibility={(rating) => {
                saveCredibility(active.id, rating)
                setNotice(rating ? "Saved credibility on this device." : "Cleared credibility on this device.")
              }}
            />
          </div>
        </aside>
      ) : null}

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-2 px-4 py-8 text-sm text-ink-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            {catalog.source === "airtable"
              ? `Live from Airtable · ${new Date(catalog.fetchedAt).toLocaleString()}`
              : `Demo snapshot · ${catalog.exportedAt ?? "saved export"}`}
            {" · "}
            {catalog.baseName}
          </p>
          <a className="text-link focus-ring" href={TABLE_URL} target="_blank" rel="noreferrer">
            Open Active Video Projects
          </a>
        </div>
      </footer>

      {selected.length > 0 ? (
        <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
          <div className="flex flex-wrap items-center gap-2 rounded-full bg-cta px-3 py-2 text-sm text-cream shadow-[0_8px_24px_rgb(17_17_17/0.18)]">
            <span className="px-2">{selected.length} selected</span>
            <button
              type="button"
              className="focus-ring rounded-full bg-cream px-3 py-1 text-sm text-cta"
              onClick={() => setBulkOpen(true)}
            >
              Set deadline or status
            </button>
            <button
              type="button"
              className="focus-ring rounded-full px-2 py-1 text-cream/80 hover:text-cream"
              onClick={() => setSelected([])}
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}

      <BulkDialog
        open={bulkOpen}
        count={selected.length}
        onClose={() => setBulkOpen(false)}
        onApply={(patch, credibility) => {
          if (credibility !== undefined) {
            for (const id of selected) saveCredibility(id, credibility)
          }
          if (Object.keys(patch).length > 0) void persist(selected, patch)
          else if (credibility !== undefined) setNotice("Saved credibility on this device.")
        }}
      />

      {notice ? (
        <div
          role="status"
          className="paper-card fixed top-4 right-4 z-50 max-w-sm px-4 py-3 text-sm text-ink"
        >
          <div className="flex items-start gap-3">
            <p>{notice}</p>
            <button type="button" className="text-link focus-ring shrink-0" aria-label="Dismiss notice" onClick={() => setNotice(null)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function FilterChip({
  label,
  pressed,
  onClick,
}: {
  label: string
  pressed: boolean
  onClick: () => void
}) {
  return (
    <button type="button" className="radius-chip focus-ring shrink-0" aria-pressed={pressed} onClick={onClick}>
      {label}
    </button>
  )
}

function EmptyState({
  query,
  overdueEmpty,
  dueToday,
  onClear,
  onDueToday,
}: {
  query: string
  overdueEmpty: boolean
  dueToday: number
  onClear: () => void
  onDueToday: () => void
}) {
  return (
    <div className="paper-card px-6 py-12 text-center">
      <WaveMark className="mx-auto h-8 w-[5.75rem] text-cta" />
      <p className="mt-4 font-display text-xl font-semibold text-ink">Nothing in this slice</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
        {overdueEmpty
          ? `No requester deadline is past due. ${dueToday} projects are due today.`
          : query
            ? `No projects match “${query}”. Try Seniors, Pro Sports, or a SWE id.`
            : "Those filters don’t overlap. Clear them and start from the search box."}
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <button type="button" className="site-btn focus-ring" onClick={onClear}>
          Clear filters
        </button>
        {overdueEmpty ? (
          <button type="button" className="search-submit focus-ring rounded-[6px] px-4 py-2 text-sm" onClick={onDueToday}>
            Show due today
          </button>
        ) : null}
      </div>
    </div>
  )
}
