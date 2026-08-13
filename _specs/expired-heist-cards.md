# Spec for expired-heist-cards

branch: claude/feature/expired-heist-cards
figma_component (if used): Expired Heist Row (node 14:251)

## Summary
Add a card treatment for expired heists — heists whose `finalStatus` has resolved (`success` or `failure`) and whose deadline has passed — and wire it into the `expired-heists` section of `/heists`, replacing the current plain `<ul><li>{heist.title}</li></ul>` placeholder. Unlike the existing `HeistCard` (a vertical card in a 3-column grid, built for active/assigned heists), the expired treatment follows a distinct horizontal row layout per the linked Figma reference, carrying a status badge that reflects whether the heist was pulled off or blown. A matching skeleton placeholder mirrors this row layout while `useHeists("expired")` is loading. The row's title links to `/heists/[id]`, which remains an unimplemented placeholder route — this spec does not add any content there.

## Functional Requirements
- A new `ExpiredHeistCard` component under `components/ExpiredHeistCard/` (with barrel `index.ts`), taking a single `Heist` (from `types/firestore/heist.ts`) as a prop.
- `ExpiredHeistCard` renders as a horizontal row (not the vertical card grid used by `HeistCard`), per the Figma reference below. This is a deliberate departure from "same layout as active/assigned" — the Figma design for expired heists is row-based, and this spec follows it rather than forcing the 3-column card grid.
- The row displays:
  - A leading status icon reflecting `finalStatus`: a green check for `"success"`, an error-colored icon for `"failure"`.
  - The heist `title`, rendered as a link to `/heists/[id]` (using the heist's `id`).
  - A status badge (pill), positioned in the row's header alongside the deadline: `"SUCCESS"` styled in the app's existing success token for `finalStatus === "success"`; a `"FAILURE"` badge styled in the app's existing error token for `finalStatus === "failure"` (this failure styling is inferred — see Figma Design Reference — since the linked Figma node only shows the success state).
  - The formatted deadline (the date the heist expired), with a small calendar icon, matching `HeistCard`'s meta-text styling.
  - The assignee (`assignedToCodename`) and assigner (`createdByCodename`), each labeled and color-coded exactly as in `HeistCard` ("To:" in primary, "By:" in secondary) — this pairing is unchanged from the existing card and must stay consistent between the two components.
- A new `ExpiredHeistCardSkeleton` component under `components/ExpiredHeistCardSkeleton/` (with barrel `index.ts`), taking no props, visually matching `ExpiredHeistCard`'s row dimensions/layout with placeholder content instead of real data.
- `HeistsDashboard`'s `expired-heists` section is edited in place: while `useHeists("expired").loading` is true, it renders a stack of `ExpiredHeistCardSkeleton` rows; once loaded, it renders one `ExpiredHeistCard` per expired heist, in the same stacked (single-column, full-width) layout — replacing the current `<ul><li>{heist.title}</li></ul>`.
- If `useHeists("expired")` returns zero heists once loaded, the section renders nothing in the list area (no skeletons, no empty-state row) — matching how the active/assigned grids behave today.
- `ExpiredHeistCard`'s title link uses Next.js's `Link` component to navigate to `/heists/[id]` client-side.
- Visual styling (colors, spacing, typography, radius) follows the Figma `Expired Heist Row` reference and reuses existing theme tokens/utility classes from `app/globals.css` wherever an exact or near-exact token match exists, per the project's styling conventions.

## Figma Design Reference
- File/Node: `Expired Heist Row`, node `14:251` — https://www.figma.com/design/JA4z6aI43yC7AoTlznYsnZ/Page-Designs--Copy-?node-id=14-251&m=dev
- Key visual constraints:
  - Row shell: 771×86px, background `rgba(16,24,40,0.5)` (semi-transparent, vs. `HeistCard`'s solid `bg-lighter`), 1px border `rgba(30,41,57,0.5)`, radius `10px` (same radius as `HeistCard`, use `rounded-[10px]`), no shadow. Padding ~17px, ~8px gap between the header row and the To:/By: row.
  - Header row: leading status icon (circle-check, green, ~16px — visual match for `CheckCircle2` from `lucide-react`) + title, right-aligned against a cluster containing the deadline (small calendar icon + `text-[#99A1AF]`/`text-body`, 14px) and the status badge.
  - Status badge (success state, as shown in Figma): pill with background `rgba(5,223,114,0.05)`, border `rgba(5,223,114,0.2)`, text `#05DF72`, radius `4px`, `12px` uppercase text with `0.6px` letter-spacing, label `"SUCCESS"`. `#05DF72` matches the app's existing `--color-success` token exactly.
  - Failure badge (not shown in Figma — inferred): mirror the success badge's pill shape/typography, swapped to the app's existing `--color-error` (`#FF6467`) token at matching opacities, label `"FAILURE"`, with a leading icon such as `XCircle` from `lucide-react` in place of the check.
  - To:/By: row: identical pattern, icons, and colors to `HeistCard` — assignee handle in `#C27AFF`/`text-primary`, assigner handle in `#FB64B6`/`text-secondary`, 14px Inter Regular, person-icon prefix.
  - No design variables were exposed on this Figma node, and Code Connect lookup was unavailable — token matches above are visual/hex comparisons against `app/globals.css`, not a synced mapping.

## Possible Edge Cases
- A heist's `title`, `assignedToCodename`, or `createdByCodename` is very long and needs to truncate/wrap without breaking the fixed row height.
- Zero expired heists — the section renders an empty list rather than an empty skeleton or broken layout.
- The expired list is still loading (no data yet) vs. loaded-but-empty — these must be visually distinguishable (skeleton rows vs. nothing).
- `useHeists("expired")` swaps data out from under a rendered list (e.g. a heist's status changes, or sign-out affects a concurrently-open active/assigned list) — skeleton rows or real rows should not show stale data.
- Narrow viewports: the row layout (deadline, badge, To:/By: cluster) needs to remain legible rather than overflowing horizontally.
- A `finalStatus` value outside `"success"`/`"failure"` should not occur (the hook only queries `HEIST_OUTCOMES`), so `ExpiredHeistCard` is not required to handle a third badge state.

## Acceptance Criteria
- `/heists`' expired section renders one `ExpiredHeistCard` row per heist returned by `useHeists("expired")`, stacked vertically, full-width.
- Each rendered `ExpiredHeistCard` shows the heist's title (as a link to `/heists/[id]`), a status badge and icon matching its `finalStatus` (success or failure), the formatted deadline, and the assignee/assigner codenames in their established colors.
- Clicking/activating a row's title link navigates to `/heists/[id]` for that heist's id; that route continues to render its existing placeholder content (no new content added by this spec).
- While the expired heists are loading, `ExpiredHeistCardSkeleton` rows render in the same stacked layout, matching `ExpiredHeistCard`'s footprint.
- `ExpiredHeistCard` and `ExpiredHeistCardSkeleton` visually reflect the Figma reference (row dimensions, colors, typography, radius, badge styling) using existing theme tokens where they match; the failure badge follows the inferred styling documented above.
- The current `<ul><li>{heist.title}</li></ul>` placeholder in the `expired-heists` section is removed.

## Open Questions
- None outstanding — layout (horizontal row, distinct from `HeistCard`'s grid) and failure-badge styling (inferred from the success badge plus existing error token) were resolved during spec drafting; see Functional Requirements and Figma Design Reference above.

## Testing Guidelines
Create a test file(s) in the ./tests folder for the new feature, and create meaningful tests for the following cases, without going too heavy:
- `ExpiredHeistCard` renders the heist's title as a link to `/heists/[id]` with the correct id, plus the correct status badge/icon for both `"success"` and `"failure"` outcomes, formatted deadline, assignee, and assigner.
- `ExpiredHeistCardSkeleton` renders placeholder content without throwing and without any real heist data.
- `HeistsDashboard`'s expired section renders `ExpiredHeistCardSkeleton` rows while loading and `ExpiredHeistCard` rows once `useHeists("expired")` resolves, without regressing the existing active/assigned grid tests.
