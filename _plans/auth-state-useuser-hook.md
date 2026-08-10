# Plan: `useUser` auth state hook

## Context

The app has Firebase Auth initialized (`lib/firebase/config.ts` exports `auth`) but nothing in the repo subscribes to it — there's no way for any component to know who's currently signed in. Per `_specs/auth-state-useuser-hook.md`, this feature adds a `useUser` hook that reads that state reactively, with the underlying realtime listener owned by a single `UserProvider` React Context provider mounted at the app root. It intentionally does not touch sign-in/sign-up/sign-out flows and is not wired into any existing page or component's UI — it ships as an isolated, tested primitive that later features (e.g. the splash-page redirect, Navbar user info) will build on.

**Revision history:**
- Originally planned as a module-level singleton store outside React (`lib/auth`), to sidestep SSR concerns with Firebase's browser-only Auth SDK. Replaced with the Context/Provider approach below, which sidesteps the same SSR concern more naturally: `UserProvider`'s subscription lives inside a `useEffect`, which Next.js never runs during server rendering — it only fires client-side after mount. No `typeof window` guard or lazy-start logic needed.
- Originally `useUser` returned a bare `User | null` with `null` covering both "loading" and "signed out." Reversed: the hook now returns a typed `AuthContextValue` (`{ user, loading }`) so consumers can distinguish "auth state not yet known" from "confirmed signed out."
- Originally `UserProvider` was planned under `components/UserProvider/` (barrel-style, like every other component). Moved to a single `app/providers.tsx` file instead — it's a client-boundary wrapper for the server-component root layout, not a reusable UI component, so it doesn't need the `components/` directory-per-unit + barrel treatment.

## Architecture

1. **`lib/auth/types.ts`** — the two named types this feature is built around: `User` (normalized Firebase user) and `AuthContextValue` (`{ user, loading }`, the shape both the Context and `useUser` traffic in).
2. **`lib/auth/UserContext.ts`** — the Context object itself, typed as `React.Context<AuthContextValue>`, defaulting to `{ user: null, loading: true }`.
3. **`app/providers.tsx`** — a `"use client"` component, default-exported, single file (no directory/barrel — it's a client-boundary wrapper for the root layout, not a `components/`-style reusable unit). Owns `useState<User | null>(null)` and `useState<boolean>(true)`, subscribes to `onAuthStateChanged(auth, ...)` in a `useEffect` with an empty dependency array (subscribe once on mount, unsubscribe on unmount), normalizes each Firebase `User | null` into this app's `User | null`, flips `loading` to `false` on the first callback invocation, and renders `<UserContext.Provider value={{ user, loading }}>{children}</UserContext.Provider>`.
4. **`hooks/useUser/useUser.ts`** — a thin `"use client"` hook: `return useContext(UserContext)`. No subscription logic of its own — it just reads whatever `UserProvider` currently has in Context. Default-exported + barrelled via `hooks/useUser/index.ts`.
5. **`app/layout.tsx`** — wrap `{children}` in `<UserProvider>` (imported from `@/app/providers`) inside `<body>`. This is the one existing file this feature touches, and it's pure plumbing (mounting the provider), not UI that reads the auth value — no visible behavior change.

This gives exactly one `onAuthStateChanged` subscription per app session (owned by the single `UserProvider` instance at the root), with every `useUser()` call anywhere in the tree reading the same Context value.

## File Structure

```
lib/
  auth/
    types.ts              # User, AuthContextValue (new)
    UserContext.ts         # createContext<AuthContextValue> (new)
  firebase/
    config.ts               # existing — auth, db exports (unchanged)

hooks/
  useUser/
    useUser.ts                # new — useContext(UserContext)
    index.ts                   # new — barrel: export { default } from "./useUser"

app/
  layout.tsx                    # changed — wraps children in <UserProvider>
  providers.tsx                  # new — UserProvider, owns the onAuthStateChanged subscription

tests/
  app/
    providers.test.tsx          # new
  hooks/
    useUser.test.ts               # new
```

## Type Shapes

```ts
// lib/auth/types.ts

export type User = {
  uid: string
  email: string | null
  displayName: string | null
}

export type AuthContextValue = {
  user: User | null
  loading: boolean
}
```

- `User` is a normalized projection of Firebase's `User` object — only the three fields this app currently needs, never the raw Firebase SDK type.
- `AuthContextValue` is the shape both `UserContext` and `useUser`'s return value carry. `loading: true` means "Firebase hasn't reported its first result yet" — it only ever goes `true → false`, once, for the life of the session; it does not flip back to `true` on later sign-in/sign-out events. `user: null` means "no signed-in user," independent of `loading` (so `{ user: null, loading: true }` and `{ user: null, loading: false }` are both valid and distinguishable states, unlike the earlier null-only design).

```ts
// lib/auth/UserContext.ts
export const UserContext = createContext<AuthContextValue>({ user: null, loading: true })

// hooks/useUser/useUser.ts
export default function useUser(): AuthContextValue {
  return useContext(UserContext)
}
```

## Files to add / change

**`lib/auth/types.ts`** (new) — see Type Shapes above.

**`lib/auth/UserContext.ts`** (new)
```ts
import { createContext } from "react"
import type { AuthContextValue } from "./types"

export const UserContext = createContext<AuthContextValue>({ user: null, loading: true })
```

**`app/providers.tsx`** (new)
```tsx
"use client"

import { useEffect, useState, type ReactNode } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase/config"
import { UserContext } from "@/lib/auth/UserContext"
import type { User, AuthContextValue } from "@/lib/auth/types"

type UserProviderProps = {
  children: ReactNode
}

export default function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(
        firebaseUser
          ? { uid: firebaseUser.uid, email: firebaseUser.email, displayName: firebaseUser.displayName }
          : null
      )
      setLoading(false)
    })
  }, [])

  const value: AuthContextValue = { user, loading }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}
```

**`hooks/useUser/useUser.ts`** (new)
```ts
"use client"

import { useContext } from "react"
import { UserContext } from "@/lib/auth/UserContext"
import type { AuthContextValue } from "@/lib/auth/types"

export default function useUser(): AuthContextValue {
  return useContext(UserContext)
}
```

**`hooks/useUser/index.ts`** (new, barrel)
```ts
export { default } from "./useUser"
```

**`app/layout.tsx`** (change) — wrap children:
```tsx
import UserProvider from "@/app/providers"
...
<body>
  <UserProvider>{children}</UserProvider>
</body>
```

## Tests

Establishes this repo's first `vi.mock()` convention (existing tests only use `vi.spyOn(console, "log")`). Both test files mock `firebase/auth`'s `onAuthStateChanged` and `@/lib/firebase/config`'s `auth`, capture the callback registered with `onAuthStateChanged`, and invoke it manually (wrapped in `act`) to simulate sign-in/out.

**`tests/app/providers.test.tsx`** (new):
- renders `children` normally (provider is transparent to the tree).
- `onAuthStateChanged` is called exactly once on mount.
- a consumer reading `UserContext` sees `{ user: null, loading: true }` before any auth event fires.
- a consumer reading `UserContext` sees `{ user: null, loading: false }` after the captured callback fires with no user.
- a consumer reading `UserContext` sees `{ user: { uid, email, displayName }, loading: false }` after the captured callback fires with a signed-in user, and updates again (staying `loading: false`) if it fires a second time with a different user.
- unmounting `UserProvider` calls the unsubscribe function returned by `onAuthStateChanged`.

**`tests/hooks/useUser.test.ts`** (new):
- rendered via `renderHook(() => useUser(), { wrapper: UserProvider })`: returns `{ user: null, loading: true }` before any auth event.
- returns `{ user: null, loading: false }` once the captured callback fires with no user.
- returns `{ user: { uid, email, displayName }, loading: false }` once the captured callback fires with a signed-in user.
- updates again when the callback fires a second time with a different value, without remounting.
- two components/hook instances under the same `UserProvider` both reflect one fired change (shared Context value, not per-hook state).

No changes needed to `tests/` for `app/layout.tsx` — CLAUDE.md's route-group layout tests aren't an existing pattern in this repo, and the layout change itself is trivial plumbing covered indirectly by the provider/hook tests above.

## Build order

1. `lib/auth/types.ts`
2. `lib/auth/UserContext.ts`
3. `app/providers.tsx`
4. `tests/app/providers.test.tsx` — prove the provider in isolation
5. `hooks/useUser/useUser.ts` + `hooks/useUser/index.ts`
6. `tests/hooks/useUser.test.ts`
7. `app/layout.tsx` — mount `UserProvider`

## Verification

- `npx tsc --noEmit` — confirms typing and `@/*` alias resolution for all new/changed files.
- `npx vitest run tests/app/providers.test.tsx tests/hooks/useUser.test.ts`, then a full `npx vitest run` to confirm the new `vi.mock()` usage doesn't bleed into other test files.
- `npm run lint` — style check (no-semicolon/double-quote, unused imports). Note: lint is already failing on a pre-existing, unrelated `react/no-unescaped-entities` error in `app/(dashboard)/heists/page.tsx` — not something this change touches or should fix.
- Manual sanity: start `npm run dev`, confirm the app still renders normally at `/`, `/login`, `/signup`, `/heists` with `UserProvider` mounted (no visible change expected, just confirms it doesn't break the tree or throw during SSR/hydration).
