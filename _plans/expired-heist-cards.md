# Plan: Expired Heist Cards

## Context

`_specs/expired-heist-cards.md` specs a card treatment for expired (resolved) heists on `/heists`. `HeistsDashboard`'s `expired-heists` section currently renders a bare `<ul><li>{heist.title}</li></ul>` placeholder — no link, no status, no loading state — left that way deliberately by the earlier `heist-card` spec, which scoped the vertical `HeistCard`/`HeistCardSkeleton` grid to active/assigned heists only.

The Figma node the user linked for this feature (14:251) turned out to be a **horizontal row** layout with a green "SUCCESS" badge, not the vertical grid card — confirmed against the data model (`Heist.finalStatus: "success" | "failure" | null`; `useHeists("expired")` returns resolved-and-past-deadline heists). The user confirmed (via AskUserQuestion during spec drafting): build the row layout as its own thing, and infer a failure-badge treatment (mirroring the success badge, swapped to the app's existing `--color-error` token) since Figma only shows the success state.

Two Explore/Plan subagents already did full reconnaissance of the codebase (sibling `HeistCard`/`HeistCardSkeleton` source, CSS module conventions, `app/globals.css` tokens, test conventions, and the exact `HeistsDashboard.tsx`/`HeistsDashboard.test.tsx` blocks to change). This plan reflects their verified findings.

## Approach

### New: `lib/heists/formatDeadline.ts`
No absolute-date formatter exists in the repo yet (only `formatTimeLeft.ts`, which is relative). Add a pure, named-export function `formatDeadline(deadline: Date): string` producing `"Dec 3, 02:30 PM"`-style output via `toLocaleDateString`/`toLocaleTimeString` (locale hardcoded to `"en-US"` for determinism). No "now" dependency, so no fake timers needed anywhere it's used. Test at `tests/lib/heists/formatDeadline.test.ts`, mirroring `tests/lib/heists/formatTimeLeft.test.ts`'s style — construct fixture dates via local-time components (`new Date(2026, 11, 3, 14, 30)`), not `Z`-suffixed ISO strings, since no `TZ` is pinned in `vitest.config.mts` or `package.json` and `toLocaleTimeString` resolves in the runner's local timezone.

### New: `components/ExpiredHeistCard/`
`ExpiredHeistCard.tsx` (+ `.module.css` + barrel `index.ts`), taking `{ heist: Heist }`. A horizontal row, structurally modeled on `HeistCard.tsx` but rearranged per the Figma row layout:
- Header: leading status icon (`CheckCircle2` for `finalStatus === "success"`, `XCircle` otherwise, both from `lucide-react`) + title (`Link` to `/heists/${heist.id}`, `truncate` — single line, not `HeistCard`'s `line-clamp-2`, since the row's fixed height leaves no room for wrapping), right-aligned cluster with the deadline (`Calendar` icon + `formatDeadline(heist.deadline)`) and a status badge pill (`"SUCCESS"`/`"FAILURE"`, `success`/`error` token colors).
- Meta block: identical To:/By: rows to `HeistCard` (`User` icon, primary/secondary codename colors) — this pairing must stay visually consistent between the two components.
- Status derivation: a single `isSuccess = heist.finalStatus === "success"` boolean drives icon, icon color, badge class, and badge label — no switch/exhaustiveness handling needed (spec explicitly says a third state isn't required).
- CSS: `@reference "../../app/globals.css"` first line; row shell `bg-lighter/50 border-white/5 rounded-[10px]` (both values are documented inferences — `rgba(16,24,40,0.5)` maps cleanly to `bg-lighter/50`, but `rgba(30,41,57,0.5)` has no exact token, so `border-white/5` is a halved-opacity guess off `HeistCard`'s own `border-white/10` precedent); badge pill modeled on `SplashHero.module.css`'s `.eyebrow` class (`rounded-[4px] border px-2 py-0.5 text-xs uppercase tracking-[0.6px]`, `success`/`error` variants). No `clsx`/`cn` exists in the repo — combine classes with template strings, matching `HeistCardSkeleton.tsx`'s existing pattern.

Test at `tests/components/ExpiredHeistCard.test.tsx`, mirroring `HeistCard.test.tsx` (title-link href, assignee/assigner text) minus the fake-timer setup (not needed — no relative time), plus two fixtures (`finalStatus: "success"` / `"failure"`) asserting the correct badge text, and a deadline assertion computed by calling the real `formatDeadline` rather than hardcoding a duplicate string.

### New: `components/ExpiredHeistCardSkeleton/`
`ExpiredHeistCardSkeleton.tsx` (+ `.module.css` + barrel), no props, mirroring `ExpiredHeistCard`'s DOM shape 1:1 the way `HeistCardSkeleton` mirrors `HeistCard` — `bg-body/15` placeholder blocks in place of icon/title/deadline/badge/meta text, `animate-pulse` on the row. Test at `tests/components/ExpiredHeistCardSkeleton.test.tsx`, a direct copy of `HeistCardSkeleton.test.tsx`'s single test (no link/button role present).

### Edit: `components/HeistsDashboard/HeistsDashboard.tsx`
Change `const expiredHeists = useHeists("expired").heists` to `const expired = useHeists("expired")` (matching the `active`/`assigned` pattern of keeping both `heists` and `loading`). Add a new layout constant `EXPIRED_STACK_CLASSES = "flex flex-col gap-3"` (a vertical stack, not `HEIST_GRID_CLASSES`'s grid — these are full-width rows, not grid cells). Replace the `expired-heists` block's `<ul><li>` with the same loading-ternary shape already used for `active`/`assigned`, reusing the existing `SKELETON_COUNT = 3` constant:
```
expired.loading
  ? Array.from({ length: SKELETON_COUNT }, (_, i) => <ExpiredHeistCardSkeleton key={i} />)
  : expired.heists.map((heist) => <ExpiredHeistCard key={heist.id} heist={heist} />)
```

### Edit: `tests/components/HeistsDashboard.test.tsx`
Add `vi.mock` entries for `@/components/ExpiredHeistCard` and `@/components/ExpiredHeistCardSkeleton` (same shallow `data-testid` pattern as the existing `HeistCard`/`HeistCardSkeleton` mocks — no `finalStatus` needed on the fixture helper, since the mock ignores extra props, matching the file's existing shallow-mocking convention). Update the two expired-section assertions that currently check the placeholder `<ul><li>` text to instead check for the new mock's testid. Keep the existing "expired heists never render as `HeistCard`" negative assertion (still valid — now proven by mock identity rather than absence of any row). Add one new test for the expired-loading branch, mirroring the existing active/assigned loading test.

## Sequencing
1. `lib/heists/formatDeadline.ts` + its test (no dependents needed to build/verify it standalone)
2. `components/ExpiredHeistCard/` + its test (depends only on `formatDeadline`)
3. `components/ExpiredHeistCardSkeleton/` + its test (no dependencies; sanity-check dimensions against step 2)
4. `HeistsDashboard.tsx` edit + `HeistsDashboard.test.tsx` edit together (integration point; keep source and test in lockstep so the suite isn't red mid-change)

Each step leaves the app in a working, buildable state.

## Verification
- `npx vitest run tests/lib/heists/formatDeadline.test.ts tests/components/ExpiredHeistCard.test.tsx tests/components/ExpiredHeistCardSkeleton.test.tsx tests/components/HeistsDashboard.test.tsx` — targeted pass first.
- `npm test -- --run` (full suite) to confirm no regressions elsewhere.
- `npx tsc --noEmit` (no typecheck script exists per CLAUDE.md).
- `npm run dev`, visit `/heists` signed in with seeded expired heists (check `scripts/seedHeists.ts` for how to seed success/failure fixtures) — visually confirm the row layout, badge colors, skeleton-to-loaded transition, and that clicking a title navigates to the still-placeholder `/heists/[id]`.
- Note: `npm run lint` has a known pre-existing failure in `app/(dashboard)/heists/page.tsx` unrelated to this work (per CLAUDE.md) — don't attribute it to these changes.

## Known judgment calls (not blocking, flag if asked)
- Failure badge styling and `border-white/5` are inferences, not pulled from Figma (spec says so explicitly).
- Badge padding (`px-2 py-0.5`) is an eyeballed value — no exact Figma spacing was captured for it.
