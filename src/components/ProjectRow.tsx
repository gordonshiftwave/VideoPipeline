import { deadlineKind, deadlineLabel } from "@/lib/projects"
import { DEFAULT_DOT, STATUS_DOT, STATUS_SHORT } from "@/lib/taxonomy"
import type { DeadlineKind, Density, Project } from "@/lib/types"

const CHIP: Record<DeadlineKind, string> = {
  overdue: "distance-chip distance-chip--overdue",
  today: "distance-chip",
  upcoming: "distance-chip distance-chip--upcoming",
  missing: "distance-chip distance-chip--missing",
  met: "distance-chip distance-chip--met",
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
  onOpen: () => void
  onToggle: (shiftKey: boolean) => void
}) {
  const kind = deadlineKind(project, today)
  const compact = density === "list"
  const dot = STATUS_DOT[project.status] ?? DEFAULT_DOT
  const meta = [
    project.uniqueId,
    project.primaryMarket,
    project.requester.length ? project.requester.join(", ") : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <div
      id={`project-${project.id}`}
      data-index={index}
      data-active={active}
      data-cursor={cursor}
      className={`place-row flex items-start ${compact ? "gap-2" : "gap-2.5"}`}
    >
      <label className={`flex shrink-0 items-start ${compact ? "pt-2 pl-2.5" : "pt-3.5 pl-3 sm:pt-4 sm:pl-4"}`}>
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
        className={`focus-ring min-w-0 flex-1 cursor-pointer text-left ${
          compact ? "py-2 pr-3" : "py-3.5 pr-3.5 sm:py-4 sm:pr-5"
        }`}
        onClick={onOpen}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3
              className={`font-display font-semibold leading-[1.3] tracking-normal text-ink ${
                compact ? "text-[0.95rem]" : "text-[1.02rem] sm:text-[1.12rem]"
              }`}
            >
              {project.name}
            </h3>
            <p className="mt-0.5 flex items-center gap-2 text-[0.78rem] leading-snug text-ink-faint">
              <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: dot }} />
              <span className="truncate">
                {STATUS_SHORT[project.status] ?? project.status}
                {edited ? " · Edited here" : ""}
              </span>
            </p>
            <p className={`mt-1 text-ink-soft ${compact ? "text-[0.78rem]" : "text-[0.86rem] sm:text-[0.9rem]"}`}>
              {meta}
            </p>
          </div>
          <span className={`${CHIP[kind]} mt-0.5`}>{shortDeadline(project, today, kind)}</span>
        </div>
        {compact ? null : (
          <div className="mt-1.5 flex flex-wrap gap-x-4 text-[0.86rem]">
            <RowLink href={project.sourceFootage} label="Footage" />
            <RowLink href={project.reviewLink} label="Review" />
            <RowLink href={project.linkToBrief} label="Brief" />
          </div>
        )}
      </button>
    </div>
  )
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
