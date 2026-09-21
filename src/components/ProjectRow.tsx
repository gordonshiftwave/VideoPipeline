import type { ReactNode } from "react"
import { deadlineKind, deadlineLabel, formatDate, platformPosted } from "@/lib/projects"
import { DEFAULT_DOT, ladderFor, PLATFORMS, STATUS_DOT } from "@/lib/taxonomy"
import type { Credibility, DeadlineKind, Density, PlatformMap, Project } from "@/lib/types"

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
  onOpen,
  onToggle,
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
  onOpen: () => void
  onToggle: (shiftKey: boolean) => void
}) {
  const kind = deadlineKind(project, today)
  const compact = density === "list"
  const dot = STATUS_DOT[project.status] ?? DEFAULT_DOT
  const ladder = ladderFor(project.status)
  const recorded = project.recordingDate ?? (project.createdTime ? project.createdTime.slice(0, 10) : null)
  const recordedLabel = project.recordingDate ? "Recorded" : "Added"
  const posted = PLATFORMS.filter((platform) => platformPosted(platforms, platform.id))
  const description = project.description && project.description !== project.name ? project.description : null

  return (
    <div
      id={`project-${project.id}`}
      data-index={index}
      data-active={active}
      data-cursor={cursor}
      className="place-row flex items-start gap-2"
    >
      <label className={`flex shrink-0 items-start ${compact ? "pt-2 pl-2.5" : "pt-3 pl-3"}`}>
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
      <button
        type="button"
        className={`focus-ring min-w-0 flex-1 cursor-pointer py-2.5 pr-3 text-left ${compact ? "" : "sm:py-3 sm:pr-4"}`}
        onClick={onOpen}
      >
        <div className="grid grid-cols-1 items-start gap-1 md:grid-cols-[5.4rem_minmax(0,1.5fr)_4.6rem_5.2rem_minmax(4.5rem,0.7fr)_5.4rem_7.2rem] md:gap-x-3">
          <Field label="Market">
            <span className="text-[0.78rem] leading-snug text-ink-soft">{project.primaryMarket}</span>
          </Field>
          <Field label="Project">
            <span className="block font-display text-[0.98rem] font-semibold leading-[1.3] text-ink">
              {project.name}
            </span>
            <span className="mt-0.5 block truncate text-[0.78rem] text-ink-faint">
              {project.uniqueId}
              {project.editType ? ` · ${project.editType}` : ""}
              {credibility ? ` · ${credibility === "Medium" ? "Med" : credibility} credibility` : ""}
              {edited ? " · Edited here" : ""}
            </span>
            {description && !compact ? (
              <span className="mt-0.5 block truncate text-[0.82rem] text-ink-soft">{description}</span>
            ) : null}
          </Field>
          <Field label={recordedLabel}>
            <span className="text-[0.78rem] text-ink-soft" title={formatDate(recorded)}>
              {recorded ? shortDay(recorded) : "—"}
            </span>
          </Field>
          <Field label="Posted">
            <span className={posted.length ? "text-[0.78rem] text-ink" : "text-[0.78rem] text-ink-faint"}>
              {posted.length
                ? posted.map((platform) => SHORT_PLATFORM[platform.label] ?? platform.label).join(" · ")
                : "Not posted"}
            </span>
          </Field>
          <Field label="Links">
            <span className="flex flex-wrap gap-x-2 text-[0.78rem]">
              <RowLink href={project.reviewLink} label="Review" />
              <RowLink href={project.finalApprovedVideoLink} label="Final" />
              <RowLink href={project.sourceFootage} label="Footage" />
              {!project.reviewLink && !project.finalApprovedVideoLink ? (
                <span className="text-ink-faint">No video link</span>
              ) : null}
            </span>
          </Field>
          <Field label="Deadline">
            <span className={CHIP[kind]}>{shortDeadline(project, today, kind)}</span>
          </Field>
          <Field label="Status">
            <span className="flex items-center gap-1.5 text-[0.82rem] text-ink">
              <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: dot }} />
              <span className="truncate">{ladder.label}</span>
            </span>
          </Field>
        </div>
      </button>
    </div>
  )
}

export function BoardHead() {
  const labels = ["Market", "Project", "Recorded", "Posted", "Links", "Deadline", "Status"]
  return (
    <div className="hidden border-b border-line px-3 py-2 text-[0.72rem] font-semibold text-ink-faint md:grid md:grid-cols-[1.15rem_5.4rem_minmax(0,1.5fr)_4.6rem_5.2rem_minmax(4.5rem,0.7fr)_5.4rem_7.2rem] md:gap-x-3 md:pl-3">
      <span />
      {labels.map((label) => (
        <span key={label}>{label}</span>
      ))}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="flex min-w-0 items-baseline gap-2 md:block">
      <span className="w-16 shrink-0 text-[0.68rem] font-semibold text-ink-faint md:hidden">{label}</span>
      <span className="min-w-0">{children}</span>
    </span>
  )
}

function shortDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function shortDeadline(project: Project, today: string, kind: DeadlineKind): string {
  if (kind === "today") return "Due today"
  if (kind === "missing") return "No date"
  if (kind === "overdue") return "Overdue"
  if (kind === "met") return "Done"
  return deadlineLabel(project, today).replace(/^Due /, "")
}

function RowLink({ href, label }: { href: string | null; label: string }) {
  if (!href) return null
  return (
    <a
      className="text-link focus-ring rounded-sm"
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={(event) => event.stopPropagation()}
    >
      {label}
    </a>
  )
}
