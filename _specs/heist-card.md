# Spec for heist-card

branch: claude/feature/heist-card
figma_component (if used): HeistCard (node 14:23)

## Summary
Add a `HeistCard` component that renders a single heist as a compact card (title, assignee, assigner, deadline), plus a matching `HeistCardSkeleton` loading placeholder. Wire both into `app/(dashboard)/heists/page.tsx`, replacing the current placeholder `<ul>` lists for the "active" and "assigned" heist modes only, laid out as a 3-column grid. Expired heists are out of scope for this card and keep their existing placeholder rendering. The card's title links to `/heists/[id]`, which remains an unimplemented placeholder route — this spec does not add any content there.

## Functional Requirements
- `HeistCard` is a new component under `components/HeistCard/` (with barrel `index.ts`), taking a single `Heist` (from `types/firestore/heist.ts`) as a prop.
- The card displays:
  - The heist `title`, rendered as a link to `/heists/[id]` (using the heist's `id`).
  - The assignee (`assignedToCodename`) and assigner (`createdByCodename`), each labeled (e.g. "To:" / "By:") per the Figma reference.
  - The `deadline`, formatted as a human-readable date/time.
- `HeistCardSkeleton` is a new component under `components/HeistCardSkeleton/` (with barrel `index.ts`), taking no props, and visually matching `HeistCard`'s dimensions/layout with placeholder (pulsing/shimmer or static block) content instead of real data.
- `app/(dashboard)/heists/page.tsx` (via `HeistsDashboard` or a successor) renders `HeistCard` in a 3-column grid for the `active` and `assigned` heist modes (sourced from `useHeists("active")` / `useHeists("assigned")`), replacing the current `<ul><li>` rendering for those two sections only.
- While a mode's heists are loading, the grid shows `HeistCardSkeleton` placeholders in the same 3-column layout instead of cards.
- The `expired` heists section is left as-is (not converted to cards in this spec).
- Visual styling (colors, spacing, typography, radius) follows the Figma `HeistCard` reference and reuses existing theme tokens/utility classes from `app/globals.css` wherever an exact or near-exact token match exists, per the project's styling conventions.
- `HeistCard`'s title link uses Next.js's `Link` component to navigate to `/heists/[id]` client-side.

## Figma Design Reference
- File/Node: `HeistCard`, node `14:23` — https://www.figma.com/design/JA4z6aI43yC7AoTlznYsnZ/Page-Designs--Copy-?node-id=14-23&m=dev
- Key visual constraints:
  - Card shell: 378×178px, background `#101828` (matches `--color-lighter` / `bg-lighter`), 1px border `#1E2939` (no exact existing token — nearest is `--color-lighter`, but visibly lighter than the fill; use `border-white/10` or confirm a new border token), radius `10px` (between `rounded-lg` and `rounded-xl` — use `rounded-[10px]` or round up to `rounded-xl`), no shadow.
  - Padding ~21px top/sides (`p-5`); ~12px gap between title row and meta block (`gap-3`); ~8px gap between meta rows and between icon/text within a row (`gap-2`).
  - Title: Inter Regular, 16px/24px line-height, tracking -0.31px, white → `font-sans text-base leading-6 text-heading`.
  - Meta labels ("To:", "By:", date): Inter Regular 14px/20px, `#99A1AF` (matches `--color-body` / `text-body`).
  - Assignee handle color `#C27AFF` (matches `--color-primary` / `text-primary`); assigner handle color `#FB64B6` (matches `--color-secondary` / `text-secondary`).
  - Top-right clock icon (~16px, primary purple) — visual match for `Clock8` from `lucide-react`. Two 12px grey icons on the "To:"/"By:" meta rows read as a person glyph (likely `User`); the date row icon reads as a calendar glyph (likely `Calendar`/`CalendarClock`) — icon names are visual matches only, not confirmed component names.
  - The Figma frame shows an "Overdue" badge in `#C27AFF` (primary purple, not the app's `--color-error` token) — see Open Questions; this badge is not part of this spec's scope since active/assigned heists always have a future deadline.
  - The single Figma frame does not expose grid gutter/column spacing — the 3-column grid gap is not specified by Figma and is left to implementation using existing spacing scale.

## Possible Edge Cases
- A heist's `title`, `assignedToCodename`, or `createdByCodename` is very long and needs to truncate/wrap without breaking the fixed card layout.
- A mode has zero heists (e.g. no active heists) — the grid renders empty rather than an empty skeleton or broken layout.
- The heists list is still loading (no data yet) vs. loaded-but-empty — these should be visually distinguishable (skeletons vs. nothing).
- `useHeists` swaps data out from under a rendered grid (e.g. sign-out clears the list) — skeletons or cards should not show stale data.
- Viewport narrower than 3 columns can comfortably fit (responsive collapse to fewer columns).
- A heist's deadline is very close (approaching expiry) vs. far away — no distinct "urgency" visual state is specced here (see Open Questions).

## Acceptance Criteria
- `/heists` renders a 3-column grid of `HeistCard` components for the current user's active heists, sourced from `useHeists("active")`.
- `/heists` renders a 3-column grid of `HeistCard` components for the current user's assigned heists, sourced from `useHeists("assigned")`.
- Each rendered `HeistCard` shows the heist's title (as a link to `/heists/[id]`), assignee codename, assigner codename, and formatted deadline.
- Clicking/activating a card's title link navigates to `/heists/[id]` for that heist's id; that route continues to render its existing placeholder content (no new content added).
- Expired heists are not rendered as `HeistCard`s anywhere (the `expired` section is unchanged by this spec).
- While active/assigned heists are loading, `HeistCardSkeleton` placeholders render in the same 3-column grid layout, matching `HeistCard`'s footprint.
- `HeistCard` and `HeistCardSkeleton` visually reflect the Figma reference (card dimensions, colors, typography, radius) using existing theme tokens where they match.

## Open Questions
- The Figma card shows an "Overdue" badge in primary purple. Since `useHeists("active"/"assigned")` only ever returns heists with a future deadline, should this spec include any status badge/urgency indicator at all, or is the badge purely a Figma artifact from a different (expired/resolved) card variant not built here? Lets not use overdue indicator, lets just show a time left. Overdue cards will populate the expisted heists.
- Should the meta-row icons (person/calendar) be included as specced (best-guess `lucide-react` icon names), or is exact icon matching not required for this pass? Yes, include person and calendar icons.
- Should `HeistsDashboard` be edited in place, or is a new component expected to host the grids? Lets edit HeistsDashboard in place.
- Is a loading state distinguished from "uid not yet resolved" (e.g. auth still loading) in the skeleton logic, or is any empty-with-not-yet-a-real-list state treated as "loading"? Lets treat a loading both as a loading state.

## Testing Guidelines
Create a test file(s) in the ./tests folder for the new feature, and create meaningful tests for the following cases, without going too heavy:
- `HeistCard` renders the heist's title as a link to `/heists/[id]` with the correct id, plus assignee, assigner, and formatted deadline.
- `HeistCardSkeleton` renders placeholder content without throwing and without any real heist data.
- `HeistsDashboard` (or successor) renders one `HeistCard` per item returned by `useHeists("active")` and `useHeists("assigned")`.
- `HeistsDashboard` renders `HeistCardSkeleton` placeholders while the relevant `useHeists` mode has not yet produced data.
- Expired heists from `useHeists("expired")` are not rendered via `HeistCard`.
