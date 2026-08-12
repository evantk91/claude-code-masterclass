# Design Brief: HeistCard

| | |
|---|---|
| **Figma** | https://www.figma.com/design/JA4z6aI43yC7AoTlznYsnZ/Page-Designs--Copy-?node-id=14-23&m=dev |
| **Node** | `14:23` — HeistCard |
| **Extracted** | 2026-08-12 |
| **Slug** | `heist-card` |
| **Related spec** | `_specs/heist-card.md` |

## 1. Intent

A compact card summarizing one heist — title, who it's assigned to, who assigned it,
and its deadline — for the 3-column grid on `/heists`. The signature element is the
paired "To:"/"By:" rows, each rendered in its own accent color (primary for the
assignee, secondary for the assigner): that color-coding is what lets someone scan the
grid and tell at a glance whether a card is theirs to do or theirs to have handed off,
and it must not get flattened into a single neutral "meta" color during implementation.

## 2. Anatomy

    HeistCard
    ├── Header row                 — flex row, space-between
    │   ├── Title (link)           — heist.title, links to /heists/[id]
    │   └── Clock icon             — decorative, top-right, primary stroke
    └── Meta block                 — flex column, 3 rows
        ├── To: row                — icon + "To:" label + assignee handle (primary)
        ├── By: row                — icon + "By:" label + assigner handle (secondary)
        └── Deadline row           — icon + formatted date
                                      (Figma also shows an inline "Overdue" badge here —
                                      out of scope, see §13 and the spec's scope note)

## 3. Colour

| Figma | Value | Project token | Usage |
|---|---|---|---|
| `bg-[#101828]` | `#101828` | `bg-lighter` | card background — exact match |
| `border-[#1e2939]` | `#1E2939` | no exact match | card border — see Deviations |
| `text-white` | `#FFFFFF` | `text-heading` | title text — exact match |
| `text-[#99a1af]` | `#99A1AF` | `text-body` | meta labels + deadline text — exact match |
| `text-[#c27aff]` | `#C27AFF` | `text-primary` | assignee handle, clock icon stroke — exact match |
| `text-[#fb64b6]` | `#FB64B6` | `text-secondary` | assigner handle — exact match |

New tokens required: none. The card border (`#1E2939`) has no matching `@theme` token —
`--color-lighter` (`#101828`) is the closest defined color but is visibly darker than
the border. Approximate with `border-white/10` (an opacity modifier over the existing
palette, not a new token) rather than hardcoding the hex. If this border shows up on
other cards during the project, it's worth promoting to a real `--color-border` token
at that point rather than here.

## 4. Typography

| Element | Figma | Project classes |
|---|---|---|
| Title | Inter Regular, 16px/24px, tracking -0.31px, white | `font-sans text-base leading-6 text-heading` |
| Meta label (`To:`, `By:`, date) | Inter Regular, 14px/20px, tracking -0.15px, `#99A1AF` | `font-sans text-sm text-body` |
| Assignee handle | Inter Regular, 14px/20px, `#C27AFF` | `font-sans text-sm text-primary` |
| Assigner handle | Inter Regular, 14px/20px, `#FB64B6` | `font-sans text-sm text-secondary` |

Title box is 245×48px at 24px line-height — exactly two lines before clipping, so the
title should be capped with `line-clamp-2` rather than allowed to grow the card.

## 5. Layout & spacing

| Region | Figma | Project classes |
|---|---|---|
| Card root | 378×178px, flex column, ~21px pad top/sides, ~1px bottom (absorbed by border), 12px gap between header and meta block | `flex flex-col gap-3 p-5` |
| Header row | flex row, title left, 16px clock icon right, space-between | `flex items-start justify-between gap-2` |
| Meta block | flex column, ~8px gap between rows | `flex flex-col gap-2` |
| Meta row | flex row, items-center, ~8px gap between 12px icon and text | `flex items-center gap-2` |

Rounding notes: Figma's 20.833px padding rounds down to Tailwind's `p-5` (20px); the
7.995px/11.999px inter-row gaps round to `gap-2` (8px)/`size-3` (12px) respectively.

Shared utilities that apply: none directly on the card itself. The 3-column grid that
hosts `HeistCard` lives in the consuming page (`HeistsDashboard` or its successor per
the spec), not in this component — see §10 for the grid gap, which Figma doesn't
specify since this node is a single card in isolation.

## 6. Shape & effects

| Property | Figma | Project classes |
|---|---|---|
| Radius | 10px | `rounded-[10px]` (arbitrary — falls between `rounded-lg` 8px and `rounded-xl` 12px) |
| Border | 1px solid `#1E2939` | `border border-white/10` (approximation, see §3) |
| Shadow | none | none |
| Gradient | none | none |

## 7. Icons

| Figma icon | Lucide equivalent | Match | Notes |
|---|---|---|---|
| Top-right clock (~16px, primary stroke) | `Clock8` | exact | Same mark already used as the app logo (Navbar, splash page) per `CLAUDE.md`; purely decorative here, `aria-hidden` |
| To:/By: row icon (~12px, grey) | `User` | visual only | Figma exposes only raw vector paths, not a named icon component — glyph reads as a person outline |
| Deadline row icon (~12px, grey) | `Calendar` | visual only | Same caveat; glyph reads as a calendar outline |

## 8. Imagery & assets

None. Every graphic in this node is an icon glyph, all of which are recreated with
`lucide-react` components rather than downloaded — no raster or bespoke-vector assets
to export.

## 9. States

| State | In design | Behaviour |
|---|---|---|
| default | yes | as extracted above |
| title hover | no | inferred: `text-primary` on hover |
| title focus-visible | no | inferred: `ring-2 ring-primary ring-offset-2 ring-offset-lighter` (the project has no existing focus-ring convention on link text to copy, so this mirrors the button/input ring pattern) |
| loading | not on this node, but a matching `HeistCardSkeleton` is in scope per spec | mirrors `HeistCard`'s box (same padding/gaps/radius) with `animate-pulse` placeholder lines, following the existing `components/Skeleton` pattern (`bg-body/15` bars) |
| empty (mode has zero heists) | no | out of this component's scope — the grid renders nothing, per the spec's edge cases |
| overdue badge | yes, shown in Figma (`text-primary`) | **out of scope** per `_specs/heist-card.md` — `useHeists("active"/"assigned")` only returns heists with a future deadline, so no card built here ever needs it. Flagged in §13 in case a future "expired"/resolved card variant reuses this shell. |
| long title / long handle | no | inferred: `line-clamp-2` on the title (matches the 2-line Figma box), `truncate` on the handle spans so a long codename doesn't break the fixed-width meta row |

## 10. Responsive

Figma shows a single fixed-width card (378px) with no surrounding grid frame, so the
3-column gutter is not extracted fact — it's proposed here for the consuming page:

- `grid-cols-1` below `sm`
- `grid-cols-2` at `sm`
- `grid-cols-3` at `md` and up
- `gap-6` between cards (inference — no gutter value exists in the Figma source)

## 11. Implementation

Files to add:

- `components/HeistCard/HeistCard.tsx`
- `components/HeistCard/HeistCard.module.css`
- `components/HeistCard/index.ts`
- `components/HeistCardSkeleton/HeistCardSkeleton.tsx`
- `components/HeistCardSkeleton/HeistCardSkeleton.module.css`
- `components/HeistCardSkeleton/index.ts`

Note: Firestore codenames are stored bare (e.g. `SilentShadowFox`, per
`lib/codename/generateCodename.ts`) — the `@` prefix shown in Figma is presentational
and is added in the component, not stored on the `Heist` document.

**`components/HeistCard/HeistCard.tsx`**

```tsx
import Link from "next/link"
import { Clock8, User, Calendar } from "lucide-react"
import styles from "./HeistCard.module.css"

// types
import type { Heist } from "@/types/firestore/heist"

type HeistCardProps = {
  heist: Heist
}

// matches the "Dec 5, 05:00 PM" style shown in the Figma reference
function formatDeadline(deadline: Date): string {
  const date = deadline.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  const time = deadline.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  return `${date}, ${time}`
}

export default function HeistCard({ heist }: HeistCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <Link href={`/heists/${heist.id}`} className={styles.title}>
          {heist.title}
        </Link>
        <Clock8 className={styles.clockIcon} aria-hidden="true" />
      </div>
      <div className={styles.meta}>
        <div className={styles.metaRow}>
          <User className={styles.metaIcon} aria-hidden="true" />
          <span className={styles.metaLabel}>To:</span>
          <span className={styles.assignee}>@{heist.assignedToCodename}</span>
        </div>
        <div className={styles.metaRow}>
          <User className={styles.metaIcon} aria-hidden="true" />
          <span className={styles.metaLabel}>By:</span>
          <span className={styles.assigner}>@{heist.createdByCodename}</span>
        </div>
        <div className={styles.metaRow}>
          <Calendar className={styles.metaIcon} aria-hidden="true" />
          <span className={styles.metaLabel}>{formatDeadline(heist.deadline)}</span>
        </div>
      </div>
    </div>
  )
}
```

**`components/HeistCard/HeistCard.module.css`**

```css
@reference "../../app/globals.css";

.card {
  @apply flex flex-col gap-3 rounded-[10px] border border-white/10 bg-lighter p-5;
}

.header {
  @apply flex items-start justify-between gap-2;
}

.title {
  @apply line-clamp-2 font-sans text-base leading-6 text-heading;
}

.title:hover {
  @apply text-primary;
}

.title:focus-visible {
  @apply rounded-sm outline-none ring-2 ring-primary ring-offset-2 ring-offset-lighter;
}

.clockIcon {
  @apply size-4 shrink-0 text-primary;
}

.meta {
  @apply flex flex-col gap-2;
}

.metaRow {
  @apply flex items-center gap-2 text-sm;
}

.metaIcon {
  @apply size-3 shrink-0 text-body;
}

.metaLabel {
  @apply text-body;
}

.assignee {
  @apply truncate text-primary;
}

.assigner {
  @apply truncate text-secondary;
}
```

**`components/HeistCard/index.ts`**

```ts
export { default } from "./HeistCard"
```

**`components/HeistCardSkeleton/HeistCardSkeleton.tsx`**

```tsx
import styles from "./HeistCardSkeleton.module.css"

// mirrors HeistCard's box while a heist list is loading — no props, since it
// never has real data to reflect
export default function HeistCardSkeleton() {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleLines}>
          <div className={styles.line} />
          <div className={`${styles.line} ${styles.lineShort}`} />
        </div>
        <div className={styles.clock} />
      </div>
      <div className={styles.meta}>
        <div className={styles.metaRow}>
          <div className={styles.metaIcon} />
          <div className={`${styles.line} ${styles.lineMeta}`} />
        </div>
        <div className={styles.metaRow}>
          <div className={styles.metaIcon} />
          <div className={`${styles.line} ${styles.lineMeta}`} />
        </div>
        <div className={styles.metaRow}>
          <div className={styles.metaIcon} />
          <div className={`${styles.line} ${styles.lineMetaWide}`} />
        </div>
      </div>
    </div>
  )
}
```

**`components/HeistCardSkeleton/HeistCardSkeleton.module.css`**

```css
@reference "../../app/globals.css";

.card {
  @apply flex animate-pulse flex-col gap-3 rounded-[10px] border border-white/10 bg-lighter p-5;
}

.header {
  @apply flex items-start justify-between gap-2;
}

.titleLines {
  @apply flex flex-1 flex-col gap-2;
}

.clock {
  @apply size-4 shrink-0 rounded-full bg-body/15;
}

.meta {
  @apply flex flex-col gap-2;
}

.metaRow {
  @apply flex items-center gap-2;
}

.metaIcon {
  @apply size-3 shrink-0 rounded-full bg-body/15;
}

.line {
  @apply h-4 rounded-md bg-body/15;
}

.lineShort {
  @apply w-3/5;
}

.lineMeta {
  @apply h-3.5 w-32;
}

.lineMetaWide {
  @apply h-3.5 w-40;
}
```

**`components/HeistCardSkeleton/index.ts`**

```ts
export { default } from "./HeistCardSkeleton"
```

Register both on `app/(public)/preview/page.tsx` alongside the existing entries — add
imports for `HeistCard` and `HeistCardSkeleton`, and a preview block passing a sample
`Heist` object to `HeistCard` (mirroring how `CreateHeistForm`'s section is commented
to explain its data dependency) plus a bare `<HeistCardSkeleton />`.

## 12. Testing

At `tests/components/HeistCard.test.tsx`:

- Renders the heist's title as a link (`getByRole("link", { name: heist.title })`)
  whose `href` is `/heists/${heist.id}`.
- Renders the assignee and assigner handles with the `@` prefix
  (`getByText("@" + heist.assignedToCodename)` / same for `createdByCodename`).
- Renders the formatted deadline text.

At `tests/components/HeistCardSkeleton.test.tsx`:

- Renders without throwing and without any `Heist` prop (it takes none).
- Does not render any real heist data (nothing to assert by name — just confirm it
  mounts and exposes no interactive elements).

Neither test should re-verify grid composition (which mode renders which cards, or
skeleton-vs-card switching on loading state) — that belongs to the `HeistsDashboard`
(or successor) test per the spec's own testing guidelines, not to `HeistCard`'s own
test.

## 13. Deviations & gaps

| # | Item | Issue | Recommendation |
|---|---|---|---|
| 1 | Card border `#1E2939` | No exact or near `@theme` token match | Approximate with `border-white/10`; promote to a real `--color-border` token if this pattern recurs elsewhere |
| 2 | "Overdue" badge color | Figma renders it in `#C27AFF` (primary/purple) rather than `--color-error`, which is what "overdue" would semantically suggest | Out of scope for this component per the spec (active/assigned heists always have a future deadline) — flagged here in case a future expired/resolved card variant reuses this shell and needs the badge |
| 3 | Meta row icons (person/calendar) | Figma exposes only raw SVG vector paths, not named icon components, so `User`/`Calendar` are visual matches, not confirmed | Fine to ship as best-guess per the spec's Open Questions; swap later if design flags a mismatch |
| 4 | Grid gutter / column count | This Figma node is a single card with no surrounding grid frame, so the 3-column layout's gap is not extracted fact | Proposed `gap-6` with a `1 → 2 → 3` column responsive ramp, marked as inference in §10 |
| 5 | Card radius `10px` | Doesn't land on a named Tailwind step | Used arbitrary `rounded-[10px]` rather than rounding to `rounded-lg`/`rounded-xl` and losing precision |
| 6 | Hover/focus-visible/loading states | Not shown anywhere in the Figma source | Inferred conventional treatments in §9 — worth a design pass if the app wants a distinct visual language for these |
| 7 | Codename `@` prefix | Figma shows `@SecretSauceAgent`, but `Heist.assignedToCodename`/`createdByCodename` are stored bare per `generateCodename.ts` | `@` is added in the component, confirmed not a data concern |
| 8 | Deadline string format | Figma shows one sample string ("Dec 5, 05:00 PM") with no explicit format spec | Inferred an `Intl`-backed `toLocaleDateString`/`toLocaleTimeString` pairing that reproduces the sample; confirm locale/format assumptions hold for all deadlines, not just this one |
