# Video Pipeline

A search-first view of Shiftwave’s active video edits, built in the same stack and visual system as [Try Shiftwave](https://gordonshiftwave.github.io/TryShiftwave/): Vite, React, TypeScript, and Tailwind, with Montserrat and the shiftwave.co tokens (ink, paper, peach wash, black Search button). Gordon and Danny can find a project, see whether it is due, open the footage and Frame.io review, and set a requester deadline without hunting through Airtable.

The queue lives in [Active Video Projects](https://airtable.com/appjow4jvzjySNd9x/tblbX5AOLbbGU7YjR) (`appjow4jvzjySNd9x` / table `tblbX5AOLbbGU7YjR`). This app reads that table when a token is configured, and otherwise runs entirely from the saved snapshot of 92 projects.

## Run

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3847](http://127.0.0.1:3847).

Pushing `main` to `gordonshiftwave/VideoPipeline` runs `.github/workflows/deploy-pages.yml` and publishes [https://gordonshiftwave.github.io/VideoPipeline/](https://gordonshiftwave.github.io/VideoPipeline/). That host is the static demo: the snapshot is bundled in, and deadline edits stay in the browser. Airtable reads and writes need `npm run dev` (or preview) so the token stays on the server. GitHub Pages has no API process.

`npm run dev` uses base `/`. Production builds use `/VideoPipeline/` so Pages asset paths resolve. Override either with `VITE_BASE`.

No environment variables are required. Without a token the app is in demo mode: it loads `src/data/active-video-projects.json` (exported 2026-09-21) and keeps deadline, status, and platform edits in this browser.

## Connect Airtable

Copy `.env.example` to `.env.local`:

```bash
AIRTABLE_PAT=pat...
AIRTABLE_BASE_ID=appjow4jvzjySNd9x
AIRTABLE_TABLE_ID=tblbX5AOLbbGU7YjR
```

`AIRTABLE_API_KEY` is accepted as an alias for `AIRTABLE_PAT`. Base and table ids default to Active Video Projects if you omit them.

The token is only used by the Vite server on `GET` and `PATCH /api/projects`. It is never sent to the browser. `npm run dev` and `npm run preview` both attach that route.

**Writes need an editor token.** The OAuth account currently on this base is comment-only, so it can read in some tools but cannot update records. Create a [personal access token](https://airtable.com/create/tokens) with `data.records:read` and `data.records:write` on Active Video Projects. Until that token is present, the app shows a read-only banner and stores edits in `localStorage` under `shiftwave-video-pipeline-v1`.

Fields written back to Airtable:

| App field | Airtable column |
| --- | --- |
| Requester deadline | Requestors Deadline (if applicable) |
| KPI estimated delivery | KPI Est Delivery Date |
| KPI actual delivery | KPI Actual Delivery date |
| Status | Status |

Clearing a date sends `null`, which clears the Airtable cell. Status values must match the existing single-select options, including `Editing Not Started ( already Briefed)`.

If the token is set but Airtable cannot be read, the app falls back to the snapshot and pauses writes.

## What you can do

- The board opens on work still in the pipeline. **Already live** (Airtable status Complete) stays one chip away and is not removed. Each row shows market, name and description, recording or added date, posted or not, video links, a delivery-date calendar, and the cut stage. Drag the handle to set a priority order, saved in this browser.
- Cut stages are display names for the existing Status field: Raw (Busy Briefing, Editing Not Started), Rough cut (Editing In Progress), First pass (Ready for Review), Second pass (Reviewed - needs edits), Finals in the can (Reviewed - Approved, Complete). Saving a status still writes the Airtable string.
- Search `Julianne`, `caretaker`, a person, a market, or `SWE-0069`. Phrases include `rough cut`, `first pass`, `overdue`, `not posted`, `missing instagram`, and `already live`.
- Filter chips: In pipeline, Already live, Not posted, Missing link, Overdue, Missing deadline. Category tags — Seniors, Women’s Space, Events testimonial — sit on their own Topics row and in Filters. They are stored in this browser (Airtable Primary Market does not have them yet). A tag is only suggested when the name, description, or video topic hints at it; confirm it or choose Not this. Missing Instagram, TikTok, YouTube, and the other platforms stay inside Filters under “Missing on”, not as a top chip.
- Credibility (High / Med / Low) is optional and stored in this browser, shaped for a future `Credibility` column. Priority remains the Airtable field. Sort by manual priority (after you drag), deadline, recency, priority, credibility, or market.
- One source can have several platform cuts. Edit type and notes stay on the project. Each platform can be marked as its own cut, with a completion date and URL, until those columns exist.
- Filter by status, market, priority, deadline, and whether a review or final video link exists. Filters stay in the sticky header. On a phone they open from the Filters chip.
- Switch between comfortable and compact rows. `/` focuses search, `j` / `k` move through the list, Enter opens the highlighted project when focus is on the page, `x` selects it, Esc closes the detail.
- Open a project for every date, the status select, notes, and clickable brief, Frame.io review, source footage, final video, and evidence-library links.
- Select several projects and set one delivery date, status, or credibility for all of them. The same calendar control is on each row.
- Record a completion date, URL, and platform-specific cut per platform (TikTok, YouTube, Instagram, Facebook, LinkedIn, X, Threads, Reddit, Pinterest). Pinterest is listed last. These values stay on this device. They are shaped to map later to columns named like `TikTok Completed On`, `TikTok URL`, and `TikTok Cut`. Those columns are not on the Projects table, and the app does not invent them.

## Screens

**Queue.** Paper background, the Shiftwave wave, a search pill, and chips for In pipeline, Already live, Not posted, Missing link, Overdue, and Missing deadline. Topics are Seniors, Women’s Space, and Events testimonial. The hint under the count is: open a row to edit, drag to prioritize, pick a delivery date on the calendar. Rows show a drag handle, market, project, recorded date, posted, links, a Due calendar, and cut stage.

**Filters.** Status options use the cut names next to the Airtable values. Market, category tags, priority, credibility, posted, missing platform, deadline, and video link sit under the sticky search.

**Project.** The side panel (full screen on a phone, with Back and Close) sets the delivery date on a calendar, category tags, the Airtable status under its cut name, credibility, links, edit type, notes, and per-platform cuts. A link that is not http or https shows as not added.

**Read-only banner.** When no write token is configured, a line above the search says edits stay in this browser. “Clear N local edits” throws those overrides away. With a token, the same line says changes sync to Airtable, and a notice confirms each save.

## Status order

Busy Briefing → Editing Not Started ( already Briefed) → Editing In Progress → Ready for Review → Reviewed - needs edits → Reviewed - Approved → Complete, plus On Hold.

Requester deadlines drive “due today”, “overdue”, and “missing”. Finished statuses (`Complete`, `Reviewed - Approved`) are not treated as overdue or as missing a deadline. On the Sep 21, 2026 snapshot, 48 projects are due that day, 40 active projects have no requester deadline, and the overdue filter is empty — which is what the data says, not a hidden error.
