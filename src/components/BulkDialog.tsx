import { STATUSES, type FieldPatch } from "@/lib/types"
import { useState } from "react"

export function BulkDialog({
  open,
  count,
  onClose,
  onApply,
}: {
  open: boolean
  count: number
  onClose: () => void
  onApply: (patch: FieldPatch) => void
}) {
  const [deadline, setDeadline] = useState("")
  const [clearDeadline, setClearDeadline] = useState(false)
  const [kpiEst, setKpiEst] = useState("")
  const [status, setStatus] = useState("")

  if (!open) return null

  const patch: FieldPatch = {}
  if (clearDeadline) patch.requestorsDeadline = null
  else if (deadline) patch.requestorsDeadline = deadline
  if (kpiEst) patch.kpiEstDeliveryDate = kpiEst
  if (status) patch.status = status
  const ready = Object.keys(patch).length > 0

  function close() {
    setDeadline("")
    setClearDeadline(false)
    setKpiEst("")
    setStatus("")
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
          Set one requester deadline, KPI estimate, or status. Blank fields stay as they are.
        </p>
        <label className="mt-4 block">
          <span className="mb-1 block text-[0.78rem] text-ink-faint">Requester deadline</span>
          <input
            type="date"
            className="field"
            value={deadline}
            disabled={clearDeadline}
            onChange={(event) => setDeadline(event.target.value)}
          />
          <label className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              className="size-3.5 accent-cta"
              checked={clearDeadline}
              onChange={(event) => setClearDeadline(event.target.checked)}
            />
            Clear requester deadline
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
                {item}
              </option>
            ))}
          </select>
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
              onApply(patch)
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
