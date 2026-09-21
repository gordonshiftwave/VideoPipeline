import type { FormEvent, RefObject } from "react"

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.75" />
      <path d="M16 16.5 20 20.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

export function SearchBar({
  query,
  onQueryChange,
  inputRef,
}: {
  query: string
  onQueryChange: (value: string) => void
  inputRef: RefObject<HTMLInputElement | null>
}) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    inputRef.current?.blur()
  }

  return (
    <form onSubmit={handleSubmit} role="search">
      <label htmlFor="project-search" className="sr-only">
        Search projects
      </label>
      <div className="search-aura">
        <div className="search-shell search-shell--compact">
          <span className="search-shell__icon" aria-hidden="true">
            <SearchIcon />
          </span>
          <input
            ref={inputRef}
            id="project-search"
            name="q"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Name, person, market, caretaker, SWE id"
            autoComplete="off"
            enterKeyHint="search"
            className="search-shell__input min-h-11 text-base"
          />
          {query ? (
            <button
              type="button"
              className="focus-ring mr-1 rounded-full px-2 text-sm text-ink-faint hover:text-ink"
              aria-label="Clear search"
              onClick={() => {
                onQueryChange("")
                inputRef.current?.focus()
              }}
            >
              Clear
            </button>
          ) : null}
          <button
            type="submit"
            className="search-submit focus-ring m-1 min-h-9 shrink-0 rounded-full px-4 text-sm font-medium"
          >
            Search
          </button>
        </div>
      </div>
    </form>
  )
}
