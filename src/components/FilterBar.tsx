import { PLATFORMS, statusOptionLabel } from "@/lib/taxonomy"
import { CREDIBILITY, PRIORITIES, STATUSES, TOPIC_TAGS, type ExplicitFilters } from "@/lib/types"

export function FilterBar({
  filters,
  statusCounts,
  marketCounts,
  priorityCounts,
  topicCounts,
  onChange,
}: {
  filters: ExplicitFilters
  statusCounts: Map<string, number>
  marketCounts: Map<string, number>
  priorityCounts: Map<string, number>
  topicCounts: Map<string, number>
  onChange: (next: ExplicitFilters) => void
}) {
  const statuses = [...STATUSES, ...[...statusCounts.keys()].filter((status) => !STATUSES.includes(status as (typeof STATUSES)[number]))]
  const markets = [...marketCounts.keys()].sort(
    (a, b) => (marketCounts.get(b) ?? 0) - (marketCounts.get(a) ?? 0) || a.localeCompare(b),
  )

  function toggle(list: string[], value: string) {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
  }

  return (
    <div className="grid gap-4 border-t border-line pt-3 sm:grid-cols-2 lg:grid-cols-4">
      <CheckGroup
        title="Status"
        options={statuses.map((status) => ({
          value: status,
          label: statusOptionLabel(status),
          count: statusCounts.get(status) ?? 0,
        }))}
        selected={filters.statuses}
        onToggle={(value) => onChange({ ...filters, statuses: toggle(filters.statuses, value) })}
      />
      <CheckGroup
        title="Market"
        options={markets.map((market) => ({
          value: market,
          label: market,
          count: marketCounts.get(market) ?? 0,
        }))}
        selected={filters.markets}
        onToggle={(value) => onChange({ ...filters, markets: toggle(filters.markets, value) })}
      />
      <CheckGroup
        title="Category / Topic tags"
        options={TOPIC_TAGS.map((tag) => ({
          value: tag,
          label: tag,
          count: topicCounts.get(tag) ?? 0,
        }))}
        selected={filters.topics}
        onToggle={(value) => onChange({ ...filters, topics: toggle(filters.topics, value) })}
      />
      <div>
        <p className="mb-1 text-[0.78rem] font-semibold text-ink">Priority</p>
        <div className="flex flex-wrap gap-1.5">
          {PRIORITIES.map((priority) => (
            <button
              key={priority}
              type="button"
              className="radius-chip focus-ring"
              aria-pressed={filters.priorities.includes(priority)}
              onClick={() => onChange({ ...filters, priorities: toggle(filters.priorities, priority) })}
            >
              {priority}
              <span className="ml-1 text-[0.75rem] opacity-70">{priorityCounts.get(priority) ?? 0}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 mb-1 text-[0.78rem] font-semibold text-ink">Credibility</p>
        <div className="flex flex-wrap gap-1.5">
          {CREDIBILITY.map((rating) => (
            <button
              key={rating}
              type="button"
              className="radius-chip focus-ring"
              aria-pressed={filters.credibility.includes(rating)}
              onClick={() => onChange({ ...filters, credibility: toggle(filters.credibility, rating) })}
            >
              {rating === "Medium" ? "Med" : rating}
            </button>
          ))}
        </div>
        <p className="mt-3 mb-1 text-[0.78rem] font-semibold text-ink">Video link</p>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["any", "Any"],
              ["has", "Has review or final"],
              ["missing", "Missing"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="radius-chip focus-ring"
              aria-pressed={filters.videoLink === value}
              onClick={() => onChange({ ...filters, videoLink: value })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1 text-[0.78rem] font-semibold text-ink">Posted</p>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["any", "Any"],
              ["posted", "Posted"],
              ["not-posted", "Not posted"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="radius-chip focus-ring"
              aria-pressed={filters.posted === value}
              onClick={() => onChange({ ...filters, posted: value })}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-3 mb-1 text-[0.78rem] font-semibold text-ink">Missing on</p>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            className="radius-chip focus-ring"
            aria-pressed={filters.missingPlatform === ""}
            onClick={() => onChange({ ...filters, missingPlatform: "" })}
          >
            Any
          </button>
          {PLATFORMS.map((platform) => (
            <button
              key={platform.id}
              type="button"
              className="radius-chip focus-ring"
              aria-pressed={filters.missingPlatform === platform.id}
              onClick={() =>
                onChange({
                  ...filters,
                  missingPlatform: filters.missingPlatform === platform.id ? "" : platform.id,
                })
              }
            >
              {platform.label}
            </button>
          ))}
        </div>
        <p className="mt-3 mb-1 text-[0.78rem] font-semibold text-ink">Deadline</p>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["any", "Any"],
              ["has", "Has date"],
              ["missing", "Missing"],
              ["overdue", "Overdue"],
              ["today", "Due today"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="radius-chip focus-ring"
              aria-pressed={filters.deadline === value}
              onClick={() => onChange({ ...filters, deadline: value })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function CheckGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string
  options: { value: string; label: string; count: number }[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1 text-[0.78rem] font-semibold text-ink">{title}</legend>
      <div className="max-h-44 space-y-0.5 overflow-auto pr-1">
        {options.map((option) => (
          <label key={option.value} className="flex items-start justify-between gap-2 py-0.5 text-[0.82rem] text-ink-soft">
            <span className="flex min-w-0 items-start gap-2">
              <input
                type="checkbox"
                className="focus-ring mt-0.5 size-3.5 shrink-0 accent-cta"
                checked={selected.includes(option.value)}
                onChange={() => onToggle(option.value)}
              />
              <span>{option.label}</span>
            </span>
            <span className="shrink-0 text-ink-faint tabular-nums">{option.count}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
