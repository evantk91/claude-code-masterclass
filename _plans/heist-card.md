# Plan: Heist Card Component

## Context

`_specs/heist-card.md` and `_design/heist-card.md` (extracted from Figma node `14:23`) are both already written and finalized — the spec's Open Questions have been answered directly by the user in the spec file. This plan turns those into concrete file changes: a `HeistCard` component and matching `HeistCardSkeleton`, wired into `HeistsDashboard`'s active/assigned sections as a 3-column grid, replacing the current placeholder `<ul><li>{heist.title}</li></ul>` rendering for those two sections only. Expired heists are untouched.

One deviation from the design brief's code scaffold: the user decided against an absolute formatted date (and against Figma's "Overdue" badge, which is moot since active/assigned heists never have a past deadline) — the deadline row instead shows relative **"time left"** (e.g. "6h left", "45m left"), computed statically at render time (no live ticking countdown, no new interval-based hook — confirmed with the user as the simpler of two options).

Implementing this also surfaces and fixes a real gap in `useHeists`: it currently returns the same empty array both while genuinely loading and when a mode is legitimately empty, so there's no way today to show skeletons only during real loading. The fix reuses the hook's existing staleness-guard state rather than adding new state.

## 1. `useHeists` — expose loading state

`hooks/useHeists/useHeists.ts` already tracks `result.key !== key` as "nothing stamped with the current query has arrived yet" (used today to fall back to `NO_HEISTS`). That's already a loading signal — surface it instead of only using it internally:

```ts
type UseHeistsResult = {
  heists: Heist[]
  loading: boolean
}

export default function useHeists(mode: HeistMode): UseHeistsResult {
  // ...unchanged internals...
  const loading = result.key !== key
  return { heists: loading ? NO_HEISTS : result.heists, loading }
}
```

This is a breaking return-shape change, but `useHeists` has exactly one production caller (`HeistsDashboard`) and one test file, both updated below. It also fixes the spec's "stale data after sign-out" edge case for free: on sign-out `key` changes but no listener reopens, so `loading` flips back to `true` and `heists` reverts to empty automatically.

## 2. New files

**`lib/heists/formatTimeLeft.ts`** — pure formatter, one function per file (matches `lib/heists/createHeist.ts` convention, no barrel in this folder). Calls `new Date()` internally rather than taking `now` as a param (tests use `vi.setSystemTime`, same as `createHeist.test.ts`):

```ts
export function formatTimeLeft(deadline: Date): string {
  const msLeft = deadline.getTime() - new Date().getTime()
  if (msLeft <= 0) return "Deadline passed"

  const hoursLeft = Math.floor(msLeft / (60 * 60 * 1000))
  if (hoursLeft >= 1) return `${hoursLeft}h left`

  const minutesLeft = Math.max(1, Math.floor(msLeft / (60 * 1000)))
  return `${minutesLeft}m left`
}
```

Realistic range is 0–48h (`HEIST_WINDOW_MS`), so hours/minutes granularity covers it; `msLeft <= 0` is defensive only, since `useHeists("active"/"assigned")` never hands back a past deadline.

**`components/HeistCard/HeistCard.tsx`, `HeistCard.module.css`, `index.ts`** — adopt the design brief's scaffold (`_design/heist-card.md` §11) as-is: title link with `line-clamp-2`/hover/focus-visible states, `Clock8` decorative icon top-right, `User` icons on the To:/By: rows (primary/secondary accent colors on the handles), `Calendar` icon on the deadline row, all CSS-module classes and theme token usage (`bg-lighter`, `text-heading`, `text-body`, `text-primary`, `text-secondary`, `border-white/10`, `rounded-[10px]`) exactly as specified there. The one change: drop the brief's local `formatDeadline` and import `formatTimeLeft` from `@/lib/heists/formatTimeLeft` instead, rendering it in the deadline row in place of the absolute date string. No `"use client"` needed — no hooks/handlers.

**`components/HeistCardSkeleton/HeistCardSkeleton.tsx`, `.module.css`, `index.ts`** — copy the design brief's scaffold (§11) verbatim; it's data-independent and unaffected by the time-left change.

## 3. Edit `components/HeistsDashboard/HeistsDashboard.tsx`

`HeistsDashboard` currently has no CSS module (styled by global utility classes only), so the grid stays inline Tailwind rather than introducing a new module, pulled into one shared constant:

```tsx
"use client"

// heists
import useHeists from "@/hooks/useHeists"

// components
import HeistCard from "@/components/HeistCard"
import HeistCardSkeleton from "@/components/HeistCardSkeleton"

const SKELETON_COUNT = 3
const HEIST_GRID_CLASSES = "grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3"

export default function HeistsDashboard() {
  const active = useHeists("active")
  const assigned = useHeists("assigned")
  const expiredHeists = useHeists("expired").heists

  return (
    <div className="page-content">
      <div className="active-heists">
        <h2>Your Active Heists</h2>
        <div className={HEIST_GRID_CLASSES}>
          {active.loading
            ? Array.from({ length: SKELETON_COUNT }, (_, index) => <HeistCardSkeleton key={index} />)
            : active.heists.map((heist) => <HeistCard key={heist.id} heist={heist} />)}
        </div>
      </div>
      <div className="assigned-heists">
        <h2>Heists You've Assigned</h2>
        <div className={HEIST_GRID_CLASSES}>
          {assigned.loading
            ? Array.from({ length: SKELETON_COUNT }, (_, index) => <HeistCardSkeleton key={index} />)
            : assigned.heists.map((heist) => <HeistCard key={heist.id} heist={heist} />)}
        </div>
      </div>
      <div className="expired-heists">
        <h2>All Expired Heists</h2>
        <ul>
          {expiredHeists.map((heist) => (
            <li key={heist.id}>{heist.title}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
```

Expired section is structurally untouched — only the `.heists` unwrap changes since `useHeists` now returns an object.

## 4. Tests

- **`tests/lib/heists/formatTimeLeft.test.ts`** (new, fake-timer setup mirroring `createHeist.test.ts`): ~47h out → `"47h left"`; exactly 1h out → `"1h left"` (not `"60m left"`); ~45min out → `"45m left"`; a few seconds out → `"1m left"` (never `"0m left"`); past/now → `"Deadline passed"`.
- **`tests/components/HeistCard.test.tsx`** (new, per design brief §12): title renders as a link (`getByRole("link", { name: heist.title })`) with `href` = `/heists/${heist.id}`; renders `@assignedToCodename` and `@createdByCodename`; renders the time-left text for a controlled deadline via `vi.setSystemTime`. Does not assert grid/skeleton composition.
- **`tests/components/HeistCardSkeleton.test.tsx`** (new): renders without throwing, no props, no interactive elements/real heist text.
- **`tests/hooks/useHeists.test.tsx`** (update for new return shape): every `result.current` array read becomes `result.current.heists`; add assertions that `loading` is `true` before the first `emitSnapshot` and `false` after; the signed-out case asserts `{ heists: [], loading: true }`; the sign-out/switch-user cases also assert `loading` flips back to `true` after `rerender()`.
- **`tests/components/HeistsDashboard.test.tsx`** (update): mock `HeistCard`/`HeistCardSkeleton` as identifiable stubs (`data-testid`) rather than re-testing their internals (matches `Navbar.test.tsx` mocking `LogoutButton`); update the `useHeists` mock to return `{ heists, loading }`. Assert: cards render one-per-heist in the correct section when `loading: false`; skeletons render (count = `SKELETON_COUNT`) when `loading: true`; neither cards nor skeletons render when genuinely empty (`{ heists: [], loading: false }`) — this is the case the new shape exists to distinguish; expired heists still render via the untouched `<ul><li>`, never via the `HeistCard` stub.

## 5. `app/(public)/preview/page.tsx`

Add imports for `HeistCard`, `HeistCardSkeleton`, and the `Heist` type; add a sample `Heist` object (6h-out deadline so the card shows a real "6h left"); add a preview section rendering `<HeistCard heist={sampleHeist} />` and `<HeistCardSkeleton />` side by side in the same grid classes used in `HeistsDashboard`, alongside the page's existing component-preview entries.

## Verification

- `npx vitest run tests/lib/heists/formatTimeLeft.test.ts tests/components/HeistCard.test.tsx tests/components/HeistCardSkeleton.test.tsx tests/hooks/useHeists.test.tsx tests/components/HeistsDashboard.test.tsx`
- `npx tsc --noEmit`
- `npm run dev`, visit `/preview` to visually check `HeistCard`/`HeistCardSkeleton` against the Figma reference, then visit `/heists` signed in to confirm the 3-column grid renders real active/assigned heists (or skeletons while loading) and that `/heists/:id` still loads its placeholder when a card's title is clicked.
- Note: `npm run lint` is expected to still fail on the pre-existing unrelated `react/no-unescaped-entities` error in `app/(dashboard)/heists/page.tsx` (per `CLAUDE.md`) — not a regression from this change.
