import { PLATFORMS } from "@/lib/taxonomy"
import type { PlatformEntry, PlatformId, PlatformMap } from "@/lib/types"

export function PlatformSection({
  value,
  onChange,
}: {
  value: PlatformMap
  onChange: (platformId: PlatformId, entry: PlatformEntry) => void
}) {
  return (
    <section className="mt-7">
      <h3 className="font-display text-base font-semibold text-ink">Platform completion</h3>
      <p className="mt-1 text-[0.82rem] leading-relaxed text-ink-faint">
        One source can spawn a cut per platform. Dates, links, and cut marks stay in this browser until
        columns like “Instagram Completed On”, “Instagram URL”, and “Instagram Cut” exist. Pinterest stays last.
      </p>
      <ul className="mt-3 divide-y divide-line rounded-[18px] border border-line">
        {PLATFORMS.map((platform) => {
          const entry = value[platform.id] ?? { completedOn: null, url: null, cut: null }
          const quiet = platform.emphasis === "low"
          return (
            <li key={platform.id} className={quiet ? "bg-fog px-3 py-2.5" : "px-3 py-2.5"}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className={quiet ? "text-[13px] text-ink-faint" : "text-sm text-ink"}>{platform.label}</span>
                {quiet ? <span className="text-[11px] text-ink-faint">Lower priority</span> : null}
              </div>
              <div className="grid gap-2 sm:grid-cols-[9.25rem_minmax(0,1fr)]">
                <input
                  type="date"
                  className="field"
                  aria-label={`${platform.label} completion date`}
                  value={entry.completedOn ?? ""}
                  onChange={(event) =>
                    onChange(platform.id, {
                      completedOn: event.target.value || null,
                      url: entry.url,
                      cut: entry.cut ?? null,
                    })
                  }
                />
                <input
                  type="url"
                  inputMode="url"
                  placeholder="Link"
                  className="field"
                  aria-label={`${platform.label} URL`}
                  value={entry.url ?? ""}
                  onChange={(event) =>
                    onChange(platform.id, {
                      completedOn: entry.completedOn,
                      url: event.target.value.trim() ? event.target.value : null,
                      cut: entry.cut ?? null,
                    })
                  }
                />
              </div>
              <label className="mt-2 flex items-center gap-2 text-[0.78rem] text-ink-soft">
                <input
                  type="checkbox"
                  className="size-3.5 accent-cta"
                  checked={Boolean(entry.cut)}
                  onChange={(event) =>
                    onChange(platform.id, {
                      completedOn: entry.completedOn,
                      url: entry.url,
                      cut: event.target.checked,
                    })
                  }
                />
                Platform-specific cut
              </label>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
