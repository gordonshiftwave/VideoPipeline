import type { KeyboardEvent, PointerEvent, ReactNode } from "react"
import { deadlineKind, formatDate, isDateInput, isHttpUrl, platformPosted } from "@/lib/projects"
import { DEFAULT_DOT, ladderFor, PLATFORMS, STATUS_DOT } from "@/lib/taxonomy"
import type { Credibility, DeadlineKind, Density, PlatformMap, Project, TopicTag } from "@/lib/types"

const CHIP: Record<DeadlineKind, string> = {
  overdue: "distance-chip distance-chip--overdue",
  today: "distance-chip",
  upcoming: "distance-chip distance-chip--upcoming",
  missing: "distance-chip distance-chip--missing",
  met: "distance-chip distance-chip--met",
}

const SHORT_PLATFORM: Record<string, string> = {
  TikTok: "TikTok",
  YouTube: "YouTube",
  Instagram: "IG",
  Facebook: "FB",
  LinkedIn: "LI",
  X: "X",
  Threads: "Threads",
  Reddit: "Reddit",
  Pinterest: "Pin",
}

export function ProjectRow({
  project,
  today,
  index,
  selected,
  active,
  cursor,
  edited,
  density,
  platforms,
  credibility,
  confirmedTopics,
  suggestedTopics,
  dragging,
  dropEdge,
  pulse,
  onOpen,
  onToggle,
  onDeadline,
  onDragStart,
  onKeyboardMove,
}: {
  project: Project
  today: string
  index: number
  selected: boolean
  active: boolean
  cursor: boolean
  edited: boolean
  density: Density
  platforms: PlatformMap
  credibility: Credibility | null
  confirmedTopics: TopicTag[]
  suggestedTopics: TopicTag[]
  dragging: boolean
  dropEdge: "before" | "after" | null
  pulse: boolean
  onOpen: () => void
  onToggle: (shiftKey: boolean) => void
  onDeadline: (value: string | null) => void
  onDragStart: (event: PointerEvent<HTMLButtonElement>) => void
  onKeyboardMove: (event: KeyboardEvent<HTMLButtonElement>) => void
}) {
  const kind = deadlineKind(project, today)
  const compact = density === "list"
  const dot = STATUS_DOT[project.status] ?? DEFAULT_DOT
  const ladder = ladderFor(project.status)
  const recorded = project.recordingDate ?? (project.createdTime ? project.createdTime.slice(0, 10) : null)
  const recordedLabel = project.recordingDate ? "Recorded" : "Added"
  const posted = PLATFORMS.filter((platform) => platformPosted(platforms, platform.id))
  const description = project.description && project.description !== project.name ? project.description : null
  const review = isHttpUrl(project.reviewLink) ? project.reviewLink : null
  const finalLink = isHttpUrl(project.finalApprovedVideoLink) ? project.finalApprovedVideoLink : null
  const footage = isHttpUrl(project.sourceFootage) ? project.sourceFootage : null

  return (
    <div
      id={`project-${project.id}`}
      data-index={index}
      data-active={active}
      data-cursor={cursor}
      data-dragging={dragging}
      data-drop={dropEdge ?? undefined}
      data-pulse={pulse}
      className="place-row board-grid grid"
      onClick={(event) => {
        const target = event.target
        if (!(target instanceof HTMLElement)) return
        if (target.closest("a, input, button, label, select, textarea")) return
        onOpen()
      }}
    >
      <div className="drag-rail order-1">
        <button
          type="button"
          className="drag-handle focus-ring"
          data-drag-handle
          draggable={false}
          aria-label={`Drag to prioritize ${project.name}`}
          aria-keyshortcuts="ArrowUp ArrowDown"
          title="Drag to prioritize. Arrow up or down moves this row."
          onPointerDown={onDragStart}
          onKeyDown={onKeyboardMove}
          onDragStart={(event) => event.preventDefault()}
        >
          <GripIcon />
          <span className="drag-handle__label" aria-hidden="true">
            Drag
          </span>
        </button>
      </div>
      <label className="order-2 flex items-start pt-1.5 md:pt-2.5">
        <input
          type="checkbox"
          className="focus-ring size-3.5 accent-cta"
          checked={selected}
          aria-label={`Select ${project.name}`}
          onClick={(event) => {
            event.preventDefault()
            onToggle(event.shiftKey)
          }}
          onChange={() => {}}
        />
      </label>
      <Field label="Market" className="board-rest order-4 md:order-3">
        <span className="text-[0.78rem] leading-snug text-ink-soft">{project.primaryMarket}</span>
      </Field>
      <div className="order-3 min-w-0 md:order-4">
        <button type="button" className="focus-ring block max-w-full text-left" onClick={onOpen}>
          <span className="block font-display text-[0.98rem] font-semibold leading-[1.3] text-ink">{project.name}</span>
        </button>
        <span className="mt-0.5 block truncate text-[0.78rem] text-ink-faint">
          {project.uniqueId}
          {project.editType ? ` · ${project.editType}` : ""}
          {credibility ? ` · ${credibility === "Medium" ? "Med" : credibility} credibility` : ""}
          {edited ? " · Edited here" : ""}
        </span>
        {confirmedTopics.length || suggestedTopics.length ? (
          <span className="mt-1 flex flex-wrap gap-1">
            {confirmedTopics.map((tag) => (
              <span key={tag} className="topic-pill">
                {tag}
              </span>
            ))}
            {suggestedTopics.map((tag) => (
              <span key={tag} className="topic-pill topic-pill--suggested" title="Suggested from the name or topic">
                {tag}
              </span>
            ))}
          </span>
        ) : null}
        {description && !compact ? (
          <span className="mt-0.5 block truncate text-[0.82rem] text-ink-soft">{description}</span>
        ) : null}
      </div>
      <Field label={recordedLabel} className="board-rest order-5">
        <span className="text-[0.78rem] text-ink-soft" title={formatDate(recorded)}>
          {recorded ? shortDay(recorded) : "—"}
        </span>
      </Field>
      <Field label="Posted" className="board-rest order-6">
        <span className={posted.length ? "text-[0.78rem] text-ink" : "text-[0.78rem] text-ink-faint"}>
          {posted.length ? posted.map((platform) => SHORT_PLATFORM[platform.label] ?? platform.label).join(" · ") : "Not posted"}
        </span>
      </Field>
      <Field label="Links" className="board-rest order-7">
        <span className="flex flex-wrap gap-x-2 text-[0.78rem]">
          <RowLink href={review} label="Review" />
          <RowLink href={finalLink} label="Final" />
          <RowLink href={footage} label="Footage" />
          {!review && !finalLink ? <span className="text-ink-faint">No video link</span> : null}
        </span>
      </Field>
      <Field label="Due" className="board-rest order-8">
        <label className="block" onClick={(event) => event.stopPropagation()}>
          <span className="sr-only">Delivery date for {project.name}</span>
          <input
            type="date"
            className="date-picker date-picker--compact"
            aria-label={`Delivery date for ${project.name}`}
            value={project.requestorsDeadline ?? ""}
            onChange={(event) => {
              const value = event.target.value
              if (value && !isDateInput(value)) return
              onDeadline(value || null)
            }}
          />
        </label>
        <span className={`${CHIP[kind]} mt-1`}>{shortDeadline(kind, project.requestorsDeadline)}</span>
      </Field>
      <Field label="Status" className="board-rest order-9">
        <span className="flex items-center gap-1.5 text-[0.82rem] text-ink">
          <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: dot }} />
          <span className="truncate">{ladder.label}</span>
        </span>
      </Field>
    </div>
  )
}

export function BoardHead() {
  const labels = ["Market", "Project", "Recorded", "Posted", "Links", "Due", "Status"]
  return (
    <div className="board-grid hidden border-b border-line py-2 text-[0.72rem] font-semibold text-ink-faint md:grid">
      <span className="text-center">Drag</span>
      <span />
      {labels.map((label) => (
        <span key={label}>{label}</span>
      ))}
    </div>
  )
}

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`flex min-w-0 items-baseline gap-2 md:block ${className}`}>
      <span className="w-16 shrink-0 text-[0.68rem] font-semibold text-ink-faint md:hidden">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function shortDay(iso: string): string {
  const head = iso.slice(0, 10)
  const [y, m, d] = head.split("-").map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function shortDeadline(kind: DeadlineKind, date: string | null): string {
  if (kind === "today") return "Due today"
  if (kind === "missing") return "No date"
  if (kind === "overdue") return "Overdue"
  if (kind === "met") return "Done"
  return date ? formatDate(date).replace(/, \d{4}$/, "") : "Due"
}

function RowLink({ href, label }: { href: string | null; label: string }) {
  if (!href) return null
  return (
    <a className="text-link focus-ring rounded-sm" href={href} target="_blank" rel="noreferrer">
      {label}
    </a>
  )
}

function GripIcon() {
  return (
    <svg className="drag-handle__icon" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="5.5" cy="3.5" r="1.45" fill="currentColor" />
      <circle cx="12.5" cy="3.5" r="1.45" fill="currentColor" />
      <circle cx="5.5" cy="9" r="1.45" fill="currentColor" />
      <circle cx="12.5" cy="9" r="1.45" fill="currentColor" />
      <circle cx="5.5" cy="14.5" r="1.45" fill="currentColor" />
      <circle cx="12.5" cy="14.5" r="1.45" fill="currentColor" />
    </svg>
  )
}
