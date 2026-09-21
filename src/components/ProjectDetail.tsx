import { PlatformSection } from "@/components/PlatformSection"
import { formatDate, isDateInput, isHttpUrl } from "@/lib/projects"
import { CREDIBILITY_FIELD, DEFAULT_DOT, ladderFor, STATUS_DOT, statusOptionLabel } from "@/lib/taxonomy"
import {
  CREDIBILITY,
  STATUSES,
  TOPIC_TAGS,
  type Credibility,
  type FieldPatch,
  type PlatformEntry,
  type PlatformId,
  type PlatformMap,
  type Project,
  type TopicTag,
} from "@/lib/types"

export function ProjectDetail({
  project,
  today,
  platforms,
  credibility,
  confirmedTopics,
  suggestedTopics,
  edited,
  onClose,
  onPatch,
  onPlatform,
  onCredibility,
  onTopic,
}: {
  project: Project
  today: string
  platforms: PlatformMap
  credibility: Credibility | null
  confirmedTopics: TopicTag[]
  suggestedTopics: TopicTag[]
  edited: boolean
  onClose: () => void
  onPatch: (patch: FieldPatch) => void
  onPlatform: (platformId: PlatformId, entry: PlatformEntry) => void
  onCredibility: (rating: Credibility | null) => void
  onTopic: (tag: TopicTag, on: boolean) => void
}) {
  const dot = STATUS_DOT[project.status] ?? DEFAULT_DOT
  const ladder = ladderFor(project.status)
  const statuses = (STATUSES as readonly string[]).includes(project.status)
    ? [...STATUSES]
    : [project.status, ...STATUSES]

  return (
    <div className="bg-cream">
      <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <button type="button" className="text-link focus-ring mb-2 text-sm md:hidden" onClick={onClose}>
            Back to results
          </button>
          <p className="text-[0.78rem] text-ink-faint">{project.uniqueId}</p>
          <h2 className="font-display text-[1.25rem] font-semibold leading-[1.3] text-ink sm:text-[1.4rem]">
            {project.name}
          </h2>
          <p className="mt-1 flex items-center gap-2 text-[0.82rem] text-ink-soft">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
            {ladder.label}
            {project.primaryMarket ? ` · ${project.primaryMarket}` : ""}
            {project.requester.length ? ` · ${project.requester.join(", ")}` : ""}
          </p>
          {project.editType ? <p className="mt-1 text-[0.82rem] text-ink-soft">{project.editType}</p> : null}
          {edited ? <p className="mt-1 text-[0.78rem] text-calm">Edited on this device</p> : null}
        </div>
        <button type="button" className="site-btn focus-ring shrink-0" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="px-4 py-4 sm:px-5 sm:py-5">
        <label className="block">
          <span className="mb-1 block text-[0.78rem] text-ink-faint">Edit status</span>
          <select
            className="field"
            value={project.status}
            aria-label="Edit status"
            onChange={(event) => onPatch({ status: event.target.value })}
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {statusOptionLabel(status)}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[0.75rem] text-ink-faint">Airtable still stores “{project.status}”.</span>
        </label>

        <div className="mt-4">
          <p className="mb-1 text-[0.78rem] text-ink-faint">Credibility</p>
          <div className="flex flex-wrap gap-1.5">
            {CREDIBILITY.map((rating) => (
              <button
                key={rating}
                type="button"
                className="radius-chip focus-ring"
                aria-pressed={credibility === rating}
                onClick={() => onCredibility(credibility === rating ? null : rating)}
              >
                {rating === "Medium" ? "Med" : rating}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[0.75rem] text-ink-faint">
            Saved on this device. Planned column: {CREDIBILITY_FIELD}.
          </p>
        </div>

        <TopicTags confirmed={confirmedTopics} suggested={suggestedTopics} onTopic={onTopic} />

        <div className="mt-4 grid gap-3">
          <DateField
            label="Delivery date"
            prominent
            value={project.requestorsDeadline}
            onChange={(requestorsDeadline) => onPatch({ requestorsDeadline })}
          />
          <DateField
            label="KPI estimated delivery"
            value={project.kpiEstDeliveryDate}
            onChange={(kpiEstDeliveryDate) => onPatch({ kpiEstDeliveryDate })}
          />
          <DateField
            label="KPI actual delivery"
            value={project.kpiActualDeliveryDate}
            onChange={(kpiActualDeliveryDate) => onPatch({ kpiActualDeliveryDate })}
          />
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Meta label="Priority" value={project.priority || "—"} />
          <Meta label="KPI start" value={formatDate(project.kpiStartDate)} />
          <Meta label="Recorded" value={formatDate(project.recordingDate)} />
          <Meta label="Review sent" value={formatDate(project.dateReviewLinkSent)} />
        </dl>
        <p className="mt-2 text-[0.78rem] text-ink-faint">Today is {formatDate(today)}.</p>

        <section className="mt-6">
          <h3 className="text-[0.78rem] font-semibold text-ink">Links</h3>
          <ul className="mt-2 space-y-1.5 text-[0.92rem]">
            <LinkRow label="Source footage" href={project.sourceFootage} />
            <LinkRow label="Frame.io review" href={project.reviewLink} />
            <LinkRow label="Brief" href={project.linkToBrief} />
            <LinkRow label="Final approved video" href={project.finalApprovedVideoLink} />
            <LinkRow
              label={
                project.evidenceLibrarySwoId
                  ? `Evidence library · ${project.evidenceLibrarySwoId}`
                  : "Evidence library"
              }
              href={project.evidenceLibraryRecordUrl}
            />
          </ul>
        </section>

        <section className="mt-6 space-y-4">
          <Note title="Description" body={project.description} />
          <Note title="Questions / notes" body={project.questionsNotes} />
          <Note title="Handoff notes" body={project.evidenceHandoffNotes} />
        </section>

        {project.videoTopic.length || project.editType ? (
          <p className="mt-4 text-[0.82rem] leading-relaxed text-ink-soft">
            {[project.editType, ...project.videoTopic].filter(Boolean).join(" · ")}
          </p>
        ) : null}

        <PlatformSection value={platforms} onChange={onPlatform} />
      </div>
    </div>
  )
}

function TopicTags({
  confirmed,
  suggested,
  onTopic,
}: {
  confirmed: TopicTag[]
  suggested: TopicTag[]
  onTopic: (tag: TopicTag, on: boolean) => void
}) {
  return (
    <div className="mt-4">
      <p className="mb-1 text-[0.78rem] text-ink-faint">Category / Topic tags</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {TOPIC_TAGS.map((tag) => {
          const on = confirmed.includes(tag)
          const hint = suggested.includes(tag)
          return (
            <span key={tag} className="inline-flex items-center gap-1">
              <button
                type="button"
                className="radius-chip focus-ring"
                aria-pressed={on}
                onClick={() => onTopic(tag, !on)}
              >
                {tag}
                {hint && !on ? " · suggested" : ""}
              </button>
              {hint && !on ? (
                <button type="button" className="text-link focus-ring text-[0.75rem]" onClick={() => onTopic(tag, false)}>
                  Not this
                </button>
              ) : null}
            </span>
          )
        })}
      </div>
      {suggested.length ? (
        <p className="mt-1 text-[0.75rem] text-ink-faint">
          Suggested — add if it fits. Click the tag to keep it, or Not this to leave it off.
        </p>
      ) : (
        <p className="mt-1 text-[0.75rem] text-ink-faint">
          Stored in this browser. Primary Market in Airtable does not include these yet.
        </p>
      )}
    </div>
  )
}

function DateField({
  label,
  value,
  onChange,
  prominent = false,
}: {
  label: string
  value: string | null
  onChange: (value: string | null) => void
  prominent?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-[0.78rem] text-ink-faint">
        {label}
        {value ? (
          <button type="button" className="text-link focus-ring text-[0.78rem]" onClick={() => onChange(null)}>
            Clear
          </button>
        ) : null}
      </span>
      <input
        type="date"
        className={prominent ? "date-picker" : "field"}
        value={value ?? ""}
        onChange={(event) => {
          const next = event.target.value
          if (next && !isDateInput(next)) return
          onChange(next || null)
        }}
      />
    </label>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.75rem] text-ink-faint">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  )
}

function LinkRow({ label, href }: { label: string; href: string | null }) {
  if (!isHttpUrl(href)) {
    return (
      <li className="text-ink-faint">
        {label} <span className="text-[0.82rem]">— not added</span>
      </li>
    )
  }
  return (
    <li>
      <a className="text-link focus-ring rounded-sm" href={href} target="_blank" rel="noreferrer">
        {label}
      </a>
    </li>
  )
}

function Note({ title, body }: { title: string; body: string | null }) {
  if (!body) return null
  return (
    <div>
      <h3 className="text-[0.78rem] font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-ink-soft">{body}</p>
    </div>
  )
}
