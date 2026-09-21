import { isDateInput } from "@/lib/projects"
import { statusOptionLabel } from "@/lib/taxonomy"
import { CREDIBILITY, STATUSES, type Credibility, type FieldPatch } from "@/lib/types"
import { useEffect, useRef, useState } from "react"

export function BulkDialog({
  open,
  count,
  onClose,
  onApply,
}: {
  open: boolean
  count: number
  onClose: () => void
  onApply: (patch: FieldPatch, credibility: Credibility | null | undefined) => void
}) {
  const [deadline, setDeadline] = useState("")
  const [clearDeadline, setClearDeadline] = useState(false)
  const [kpiEst, setKpiEst] = useState("")
  const [status, setStatus] = useState("")
  const [credibility, setCredibility] = useState("")
  const dateRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) dateRef.current?.focus()
  }, [open])

  if (!open || count < 1) return null

  const patch: FieldPatch = {}
  if (clearDeadline) patch.requestorsDeadline = null
  else if (deadline && isDateInput(deadline)) patch.requestorsDeadline = deadline
  if (kpiEst && isDateInput(kpiEst)) patch.kpiEstDeliveryDate = kpiEst
  if (status) patch.status = status
  const credibilityValue: Credibility | null | undefined =
    credibility === "clear" ? null : credibility === "" ? undefined : (credibility as Credibility)
  const ready = Object.keys(patch).length > 0 || credibilityValue !== undefined

  function close() {
    setDeadline("")
    setClearDeadline(false)
    setKpiEst("")
    setStatus("")
    setCredibility("")
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgb(60_59_59/0.28)] p-4 sm:items-center">
      <button type="button" className="absolute inset-0" aria-label="Close bulk edit" onClick={close} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-title"
        className="paper-card relative w-full max-w-md p-5"
      >
        <h2 id="bulk-title" className="font-display text-lg font-semibold text-ink">
          Update {count} project{count === 1 ? "" : "s"}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Pick a delivery date on the calendar, or set status. Blank fields stay as they are.
        </p>
        <label className="mt-4 block">
          <span className="mb-1 block text-[0.78rem] text-ink-faint">Delivery date</span>
          <input
            ref={dateRef}
            type="date"
            className="date-picker"
            aria-label="Delivery date"
            value={deadline}
            disabled={clearDeadline}
            onChange={(event) => {
              const next = event.target.value
              if (next && !isDateInput(next)) return
              setDeadline(next)
            }}
          />
          <label className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              className="size-3.5 accent-cta"
              checked={clearDeadline}
              onChange={(event) => setClearDeadline(event.target.checked)}
            />
            Clear delivery date
          </label>
        </label>
        <label className="mt-3 block">
          <span className="mb-1 block text-[0.78rem] text-ink-faint">KPI estimated delivery</span>
          <input type="date" className="field" value={kpiEst} onChange={(event) => setKpiEst(event.target.value)} />
        </label>
        <label className="mt-3 block">
          <span className="mb-1 block text-[0.78rem] text-ink-faint">Status</span>
          <select className="field" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Leave unchanged</option>
            {STATUSES.map((item) => (
              <option key={item} value={item}>
                {statusOptionLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 block">
          <span className="mb-1 block text-[0.78rem] text-ink-faint">Credibility</span>
          <select className="field" value={credibility} onChange={(event) => setCredibility(event.target.value)}>
            <option value="">Leave unchanged</option>
            {CREDIBILITY.map((item) => (
              <option key={item} value={item}>
                {item === "Medium" ? "Med" : item}
              </option>
            ))}
            <option value="clear">Clear credibility</option>
          </select>
          <span className="mt-1 block text-[0.75rem] text-ink-faint">Credibility stays on this device.</span>
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="site-btn focus-ring" onClick={close}>
            Cancel
          </button>
          <button
            type="button"
            className="search-submit focus-ring rounded-[6px] px-4 py-2 text-sm disabled:opacity-50"
            disabled={!ready}
            onClick={() => {
              onApply(patch, credibilityValue)
              close()
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}
