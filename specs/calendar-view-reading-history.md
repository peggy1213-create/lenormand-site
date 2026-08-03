# Feature Spec: Calendar View of Reading History

Status: Implemented (v1) — see [HistoryView.tsx](../src/components/HistoryView.tsx), [HistoryCalendar.tsx](../src/components/HistoryCalendar.tsx)
Owner: TBD
Related: [[future]] Pattern View (not yet specced — see "Relationship to Pattern View" below)

## Purpose

- Give saved reading history a calendar view, as a second lens on `/history` alongside the existing list view.
- Function as **journaling infrastructure**: the calendar should read as a quiet record of a personal practice, not a habit-tracking or analytics surface.
- Lay groundwork for a future **Pattern View** feature (cross-card / cross-time pattern surfacing across saved readings). This spec does not design Pattern View, but the calendar's data access patterns and day-grouping logic should be reusable by it later — see below.

## Background / current state

Reading history today (`src/lib/storage.ts`, `src/components/HistoryList.tsx`) is a flat, reverse-chronological list backed by `localStorage`. Each `Reading` has:

```ts
type Reading = {
  id: string;
  createdAt: string; // ISO
  spread: SpreadId;
  question?: string;
  cards: { cardId: number; position: number }[];
  notes?: string;
  lang: Locale;
};
```

`createdAt` is an ISO timestamp written at draw time; "today" is evaluated in the browser's local timezone elsewhere in the codebase (see `isSameLocalDay` / `hasDrawnDailyToday` in `storage.ts`). The calendar view should follow the same convention: **group readings into calendar days using local time**, not UTC, for consistency with the existing daily-draw lock logic.

No new data model is required. `createdAt` is sufficient to bucket readings by day, month, and year entirely client-side from the existing `getHistory()` array. Confirm during implementation that `getHistory()` performance is acceptable at `MAX_READINGS` (500) — grouping 500 ISO strings into a day map is trivial, so no indexing or pagination is expected to be needed.

## Scope — in

1. **Month view (default of the calendar mode).** Standard month grid, current month on load, prev/next navigation. Weeks start per locale convention (or a fixed convention — flag as open question below).
2. **Year view toggle.** GitHub-contributions-style grid (weeks-as-columns or months-as-rows layout, TBD in visual design) showing the whole year at a glance, but **without intensity heat-mapping** — every day with a reading looks the same regardless of how many readings occurred that day. This is a presence grid, not a frequency grid.
3. **Day cell mark when readings exist.** Exact visual TBD — see "Day cell mark options" below for 2–3 proposals to choose from.
4. **Tap/click a day → opens that day's reading(s).** Interaction should feel like opening a page in a journal, not expanding an accordion row. Multiple readings on the same day show as **a small stack** (visually implying depth/multiple entries) rather than a list or count badge.
5. **Empty state copy.** Deliberately quiet — see drafts below.
6. **List view stays the default view of `/history`.** Calendar is an additional, opt-in view (e.g. a view toggle at the top of the page), not a replacement.
7. **Data model check only** — confirm `createdAt` is sufficient (it is; see above). No schema changes in scope.

## Scope — out (explicit non-goals)

- No heat-map / intensity shading based on reading frequency per day.
- No streak surfacing of any kind ("X days in a row", current streak, longest streak, streak-at-risk warnings, etc.) — anywhere in the UI, including tooltips and empty states.
- No notifications or reminders (push, email, in-app nudge) tied to the calendar.
- No 農民曆 (Chinese almanac) or 宜/忌 (auspicious/inauspicious day) framing on any day cell.
- No weather, moon phase, or other ambient/environmental data overlays.
- No social sharing of the calendar (no share button, no export-as-image, no public calendar link).

These are treated as hard boundaries for this spec, not just deprioritized — if a later feature wants any of the above, it needs its own spec and its own product decision, not a quiet addition to this one.

## Relationship to Pattern View (future)

Pattern View is not designed yet, but this feature should not foreclose it. Two things worth keeping in mind during implementation, without building for them now:

- The day-bucketing utility this feature needs (`Reading[] → Map<dateKey, Reading[]>`, local-time-aware) is exactly the kind of grouping a future pattern feature (e.g. "which cards tend to appear together across time," "reading frequency by month") would also need. Write it as a small, standalone, exported function in `src/lib/` rather than inlining it in a component, so it can be reused rather than reimplemented.
- Nothing in the calendar UI should use language that implies analysis or insight ("your patterns," "trends," "insights") — that vocabulary is reserved for the future feature. The calendar's job is *presence and access* (did I read that day, let me open it), not *interpretation*.

## Day cell mark — options to evaluate

All options must satisfy: readable at small grid sizes (year view cells are necessarily tiny), calm/non-gamified, distinguishable from "no reading" without being loud, and legible in both the light and dark theme (site uses `--ink-900`, `--gold-400`/`--gold-500`, `--surface-card`, `--border-hair` etc. as CSS variables — see `Header.module.css` / `HistoryList.module.css` for current usage).

1. **Dot.** A single small filled dot (e.g. using `--gold-400`) centered or bottom-anchored in the day cell. Same dot regardless of reading count — simplest option, closest to a "mark," lowest risk of reading as a heat-map once color is added.
2. **Card-back glyph.** A tiny stylized card-back mark (echoing `public/cards/back.webp` / the deck motif already used elsewhere on the site, e.g. `HomeDeckTeaser`) instead of a generic dot — more on-brand/thematic, but needs to stay legible at ~20px cell size in year view; may need a simplified SVG rather than the photographic card-back asset.
3. **Filled cell corner / underline.** A subtle filled triangle in one corner of the cell, or a thin underline beneath the date number, using a muted tone (`--border-hair` or `--gold-400` at reduced opacity). Least visually assertive option; recedes more into the grid, which may suit the "quiet journal" purpose but risks being missed at a glance.

Recommendation for design review: start with **option 1 (dot)** as the default for both month and year view — it's the most legible at year-view scale and the least likely to accidentally read as intensity once someone eyeballs the grid. Option 2 is worth prototyping if the dot feels too generic, but should be timeboxed given the small-size legibility risk.

**Decision: option 3 (corner fold)** was chosen for the v1 implementation — a small gold triangle in the bottom-right corner of the day cell, echoing a dog-eared journal page, scaled down (but kept as a triangle, not simplified to a dot) at year-view cell size.

## Interaction: opening a day

- Clicking/tapping a day cell with reading(s) opens that day's reading(s) inline in the journal context (not a route change to a new page) — mirrors the existing expand-in-place pattern used by `HistoryList`'s row expansion (`open` state → cards row → note editor).
- Single reading: opens directly to that reading's expanded view (same content as a list-view row: spread name, cards, question, notes, replay/copy/delete actions).
- Multiple readings same day: render as a **small stack** (e.g. 2–3 slightly offset/overlapping card-like tiles, similar in spirit to a stack of journal pages) that the user can tap through or fan out, rather than a plain list. Exact stack interaction (tap to cycle vs. tap to fan out vs. tap opens a day-detail panel listing all of them) is left to design/prototyping — the constraint is that it should not look like a notification badge or count chip, which would drift toward gamification.
- Days with no readings are inert (no click affordance, no hover state implying an action) — clicking an empty day should do nothing, not open a "draw a reading" prompt. (Keeps the calendar purely reflective; the CTA to start a reading already exists elsewhere, e.g. the list view's empty state.)

## Empty state copy (drafts)

Constraints per scope: quiet, no streak language, no gamification, no guilt/pressure ("you haven't logged in a while"), consistent with the existing history empty-state voice (`history.empty`: "No readings yet. Draw your first spread to start your history." / 尚無抽牌紀錄。抽一次牌陣即可開始累積紀錄。).

**Whole-calendar empty state** (no readings at all yet, calendar view selected):

- EN: *"Nothing recorded yet. Your readings will appear here as you go."*
- zh-TW: *「尚無紀錄。往後的抽牌會依日期顯示在這裡。」*

**Empty month** (some history exists elsewhere, but the currently-viewed month has nothing):

- EN: *"No readings this month."*
- zh-TW: *「這個月尚無抽牌紀錄。」*

**Empty day** (user opens/hovers a day with no reading — only needed if the interaction model surfaces any text at all; per the no-affordance rule above, this may not be needed):

- EN: *(no copy — day is inert, no tooltip)*
- zh-TW: *(同上，無文字)*

Open question for whoever finalizes strings: should "Nothing recorded yet" avoid the word "yet" (implies an expectation of future action, mild gamification-adjacent framing)? Alternative: *"Nothing recorded."* / *「尚無紀錄。」* — flagging as a judgment call, not resolving it here.

## Experimental sub-feature: faint 節氣 (solar term) labels

Scope note: this is explicitly a **prototype-and-evaluate item, not a committed deliverable** of this spec. It should not block or gate the rest of the calendar view shipping.

- Idea: on days that fall on one of the 24 節氣 (solar terms), show a faint, small label (the term's name, e.g. 立春, 穀雨) in or near the day cell — decorative/contextual, not actionable.
- Explicitly **not** 農民曆 or 宜/忌 framing (already excluded in scope-out) — this is a seasonal/calendrical marker, not an auspiciousness judgment. The distinction matters: 節氣 are fixed astronomical dates, not divinatory guidance, so this doesn't contradict the "no almanac framing" boundary — but the visual treatment needs to stay understated enough that it doesn't read as almanac content by association.
- Needs a solar-term date dataset (dates shift slightly year to year based on the solar calendar — cannot be hardcoded as fixed month/day pairs across all years without a lookup table or calculation, likely a small static table for the supported year range is simplest).
- Evaluate: does it clutter small year-view cells? Is it relevant/legible to EN-locale users, or should it be zh-TW-only? Does "faint" hold up in dark theme? These should be answered by prototyping, not decided in this spec.
- If it doesn't earn its place after prototyping, cut it — it's explicitly optional.

## Open questions

- Week start convention (Sunday vs. Monday) — locale-dependent or fixed?
- Year view layout: GitHub-style weeks-as-columns (53 columns × 7 rows) vs. months-as-rows grid — which reads better at the site's typical viewport widths, especially mobile?
- Should the calendar and list views share a URL/query param (e.g. `/history?view=calendar`) so the choice is linkable/refresh-persistent, or is component-local state sufficient (matching `HistoryList`'s current lack of URL state)?
- Does the month/year toggle need its own translation strings namespace (`history.calendar.*`) — recommend yes, nested under the existing `history` namespace in `messages/en.json` / `messages/zh-TW.json` to match current convention.
