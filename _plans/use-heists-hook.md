# Plan: `useHeists` hook + heists dashboard wiring

spec: _specs/use-heists-hook.md
branch: claude/feature/use-heists-hook

## Context

`app/(dashboard)/heists/page.tsx` currently renders three static, dataless section headings ("Your Active Heists," "Heists You've Assigned," "All Expired Heists"). The spec at `_specs/use-heists-hook.md` calls for a real-time `useHeists` hook that subscribes to the `heists` Firestore collection and returns one of three filtered result sets, so the dashboard can finally show live heist titles under each heading.

Query strategy (confirmed with the user): **hybrid**, not full server-side compound queries. For `"active"`/`"assigned"`, use a single Firestore equality `where()` clause (`assignedTo`/`createdBy` — auto-indexed, no setup) and filter the deadline condition in JS after each snapshot. For `"expired"` (not user-scoped), subscribe to the whole collection with no `where()` at all and filter both deadline and `finalStatus` in JS. This mirrors the existing precedent in `lib/users/listAssignableUsers.ts` (client-side filtering "since the crew is small") and means **no changes are needed to `firestore.indexes.json` or `firestore.rules`**.

No real-time query precedent (`onSnapshot`/`query`/`where`) exists anywhere in this codebase yet — this hook introduces the pattern from scratch, so the plan leans on the closest analogues: `hooks/useUser` (real-time subscription hook shape) and `lib/users/listAssignableUsers.ts` (manual converter mapping, avoiding `.withConverter()` due to a documented TS generics friction with `Partial` types).

## Implementation steps

**1. `types/firestore/heist.ts`** — add, near the existing `HeistOutcome` type:
```
export type HeistMode = "active" | "assigned" | "expired"
```
Shared by the hook and its tests as one source of truth for the literal union.

**2. `hooks/useHeists/useHeists.ts`** (new) — `"use client"`, default export, signature `useHeists(mode: HeistMode): Heist[]`.
- `const { user } = useUser()` (from `@/hooks/useUser`) — deliberately no separate `loading` branch; while auth resolves, `user` is `null`, which already collapses into the "no signed-in user" path for the two user-scoped modes.
- `useState<Heist[]>([])` for the returned array.
- One `useEffect`, deps `[mode, user?.uid]`:
  - Guard: `if (mode !== "expired" && !user) { setHeists([]); return }` — no subscription is created at all when there's no uid to filter on.
  - Build the query per mode (step 3), subscribe with `onSnapshot`, map `snapshot.docs` through `heistConverter.fromFirestore` (imported from `@/types/firestore`, same manual-mapping pattern as `listAssignableUsers.ts` — skip `.withConverter()`), filter by mode, `setHeists(...)`.
  - Return the `onSnapshot` unsubscribe function as cleanup (same shape as `AuthProvider`'s `return onAuthStateChanged(...)`).
- `now` computed once per snapshot callback invocation (not per-doc), so every doc in a given snapshot is judged against the same instant.
- Two module-scope helpers, reused by every mode so the strict-inequality rule lives in one place:
  - `isFutureDeadline(deadline, now) => deadline.getTime() > now.getTime()`
  - `isPastDeadline(deadline, now) => deadline.getTime() < now.getTime()`
  - Both strict, so a deadline exactly equal to `now` counts as neither — satisfies the spec's "exactly now is not yet expired" edge case symmetrically.

**3. Per-mode query construction** (inside `useHeists.ts`):
- `"active"`: `query(collection(db, COLLECTIONS.HEISTS), where("assignedTo", "==", user!.uid))` → filter `isFutureDeadline`.
- `"assigned"`: `query(collection(db, COLLECTIONS.HEISTS), where("createdBy", "==", user!.uid))` → filter `isFutureDeadline`.
- `"expired"`: `onSnapshot(collection(db, COLLECTIONS.HEISTS), ...)` directly — no `query()`/`where()` — filter `isPastDeadline(...) && heist.finalStatus !== null`. Not gated on `user`.

**4. `hooks/useHeists/index.ts`** (new) — `export { default } from "./useHeists"`, exact `useUser` barrel pattern.

**5. `components/HeistsDashboard/HeistsDashboard.tsx`** (new) — `"use client"`, default export, no props. Owns all three hook calls (`useHeists("active")`, `useHeists("assigned")`, `useHeists("expired")`) and the rendering currently inline in `page.tsx`. Keeps the same `.page-content` wrapper and the three `<div>`/`<h2>` blocks (same classNames/text, byte-for-byte — including the "Heists You've Assigned" apostrophe). Under each heading, add a `<ul>` of `<li key={heist.id}>{heist.title}</li>`. This follows the same client/server split already used for `CreateHeistForm` (client component owns state/hooks; the server page just renders it) — keeps `page.tsx` a server component per CLAUDE.md's client/server boundary rule.
  - Note: the pre-existing `react/no-unescaped-entities` lint failure (documented in CLAUDE.md as unrelated to any current work) will physically move to this new file along with the JSX. Not a regression — don't fix it as part of this feature.

**6. `components/HeistsDashboard/index.ts`** (new) — `export { default } from "./HeistsDashboard"`.

**7. `app/(dashboard)/heists/page.tsx`** (edit) — replace the three static blocks with `import HeistsDashboard from "@/components/HeistsDashboard"` and `return <HeistsDashboard />`. Stays a server component, no `"use client"` added.

**8. `tests/hooks/useHeists.test.tsx`** (new) — mocks `firebase/firestore` (`onSnapshot`, `collection`, `query`, `where` via `vi.hoisted`) and `@/lib/firebase/config` (`{ auth: {}, db: {} }`), same shape as `tests/lib/heists/createHeist.test.ts`. Mocks `@/hooks/useUser` directly (`vi.mock("@/hooks/useUser", () => ({ default: useUser }))`, controlled per test via `useUser.mockReturnValue(...)`) — same pattern already used in `tests/components/CreateHeistForm.test.tsx`, simpler than wrapping in `AuthProvider`. A helper mirroring `useUser.test.tsx`'s `emitAuthState` drives the mocked `onSnapshot` callback with fake `{ docs }` snapshots (docs shaped with `data()` returning fields plus `{ toDate: () => date }` for `createdAt`/`deadline`, matching what `heistConverter.fromFirestore` expects). Use `vi.useFakeTimers()`/`vi.setSystemTime()` to pin "now" for boundary tests. Cases:
  1. `"active"` — `where` called with `("assignedTo", "==", uid)`; future-deadline doc kept, past-deadline doc dropped.
  2. `"assigned"` — `where` called with `("createdBy", "==", uid)`.
  3. `"expired"` — `query`/`where` never called (only `collection` + `onSnapshot` on the bare ref); mix of past/future deadlines and null/non-null `finalStatus` → only past+non-null kept.
  4. No signed-in user — `"active"`/`"assigned"` return `[]`, `onSnapshot` never called.
  5. Deadline exactly equal to pinned "now" — excluded from all relevant modes (strict inequality).
  6. Unmount calls the mocked unsubscribe function.

**9. `tests/components/HeistsDashboard.test.tsx`** (new) — mocks `@/hooks/useHeists` directly (same pattern as `CreateHeistForm.test.tsx` mocking its dependencies), returning distinct fixture arrays per mode. Asserts each heading has exactly its own titles rendered under it (no cross-contamination) and that an empty array renders the heading with no list items.

## Order of implementation
1. `types/firestore/heist.ts` — add `HeistMode`.
2. `hooks/useHeists/useHeists.ts` + `index.ts`.
3. `tests/hooks/useHeists.test.tsx` — verify the hook in isolation first.
4. `components/HeistsDashboard/HeistsDashboard.tsx` + `index.ts`.
5. `tests/components/HeistsDashboard.test.tsx`.
6. `app/(dashboard)/heists/page.tsx` — swap in `<HeistsDashboard />`.

## Verification
- `npx vitest run tests/hooks/useHeists.test.tsx tests/components/HeistsDashboard.test.tsx`
- `npx tsc --noEmit`
- `npm run lint` — expect it to still fail, but only on the apostrophe warning now relocated to `HeistsDashboard.tsx`; confirm no *new* lint errors appear elsewhere.
- Manually run `npm run dev`, sign in, and visit `/heists` to confirm titles render live under the correct headings and update when a heist document changes in Firestore.
- No changes to `firestore.indexes.json` or `firestore.rules` — confirm neither file is touched.
