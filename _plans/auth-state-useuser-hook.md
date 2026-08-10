# Plan: `useUser` auth state hook

## Context

The app has Firebase Auth initialized (`lib/firebase/config.ts` exports `auth`) but nothing in the repo subscribes to it — there's no way for any component to know who's currently signed in. Per `_specs/auth-state-useuser-hook.md`, this feature adds a `useUser` hook that reads that state reactively, with the underlying realtime listener owned by a single `AuthProvider` React Context provider mounted at the app root. It intentionally does not touch sign-in/sign-up/sign-out flows and is not wired into any existing page or component's UI — it ships as an isolated, tested primitive that later features (e.g. the splash-page redirect, Navbar user info) will build on.

**Revision history:**
- Originally planned as a module-level singleton store outside React (`lib/auth`), to sidestep SSR concerns with Firebase's browser-only Auth SDK. Replaced with the Context/Provider approach below, which sidesteps the same SSR concern more naturally: `AuthProvider`'s subscription lives inside a `useEffect`, which Next.js never runs during server rendering — it only fires client-side after mount. No `typeof window` guard or lazy-start logic needed.
- Originally `useUser` returned a bare `User | null` with `null` covering both "loading" and "signed out." Reversed: the hook now returns a typed `AuthContextValue` (`{ user, loading }`) so consumers can distinguish "auth state not yet known" from "confirmed signed out."
- `AuthProvider` briefly moved to a single `app/providers.tsx` file, then moved back under `components/AuthProvider/` (barrel-style, like every other component). `app/providers.tsx` is now a thin `Providers` composition wrapper instead: the root layout mounts only `Providers`, so future app-wide providers get added there rather than in `app/layout.tsx`.

## Architecture

1. **`lib/auth/types.ts`** — the two named types this feature is built around: `User` (normalized Firebase user) and `AuthContextValue` (`{ user, loading }`, the shape both the Context and `useUser` traffic in).
2. **`lib/auth/AuthContext.ts`** — the Context object itself, typed as `React.Context<AuthContextValue | undefined>` and defaulting to `undefined`. No usable default on purpose: `undefined` is the signal that no `AuthProvider` sits above the consumer, which `useUser` turns into a thrown error instead of a component stuck reporting `loading` forever.
3. **`components/AuthProvider/AuthProvider.tsx`** — a `"use client"` component, default-exported + barrelled like every other component. Owns `useState<User | null>(null)` and `useState<boolean>(true)`, subscribes to `onAuthStateChanged(auth, ...)` in a `useEffect` with an empty dependency array (subscribe once on mount, unsubscribe on unmount), normalizes each Firebase `User | null` into this app's `User | null`, flips `loading` to `false` on the first callback invocation, and renders `<AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>`.
4. **`app/providers.tsx`** — a `Providers` composition wrapper that renders `<AuthProvider>{children}</AuthProvider>`. Deliberately directive-free: each provider it composes declares its own `"use client"`, so the wrapper itself stays a server component. This is where future app-wide providers get added.
5. **`hooks/useUser/useUser.ts`** — a thin `"use client"` hook: `return useContext(AuthContext)`. No subscription logic of its own — it just reads whatever `AuthProvider` currently has in Context. Default-exported + barrelled via `hooks/useUser/index.ts`.
6. **`app/layout.tsx`** — wrap `{children}` in `<Providers>` (imported from `@/app/providers`) inside `<body>`. This is the one existing file this feature touches, and it's pure plumbing, not UI that reads the auth value — no visible behavior change.

This gives exactly one `onAuthStateChanged` subscription per app session (owned by the single `AuthProvider` instance at the root), with every `useUser()` call anywhere in the tree reading the same Context value.

## File Structure

```
lib/
  auth/
    types.ts              # User, AuthContextValue (new)
    AuthContext.ts         # createContext<AuthContextValue | undefined> (new)
  firebase/
    config.ts               # existing — auth, db exports (unchanged)

components/
  AuthProvider/
    AuthProvider.tsx        # new — owns the onAuthStateChanged subscription
    index.ts                 # new — barrel: export { default } from "./AuthProvider"

hooks/
  useUser/
    useUser.ts                # new — useContext(AuthContext)
    index.ts                   # new — barrel: export { default } from "./useUser"

app/
  layout.tsx                    # changed — wraps children in <Providers>
  providers.tsx                  # new — Providers, composes app-wide providers

tests/
  components/
    AuthProvider.test.tsx       # new
  hooks/
    useUser.test.tsx              # new
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
- `AuthContextValue` is the shape both `AuthContext` and `useUser`'s return value carry. `loading: true` means "Firebase hasn't reported its first result yet" — it only ever goes `true → false`, once, for the life of the session; it does not flip back to `true` on later sign-in/sign-out events. `user: null` means "no signed-in user," independent of `loading` (so `{ user: null, loading: true }` and `{ user: null, loading: false }` are both valid and distinguishable states, unlike the earlier null-only design).

```ts
// lib/auth/AuthContext.ts — undefined means "no AuthProvider above me"
export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// hooks/useUser/useUser.ts — consumers get a non-optional value, or a clear error
export default function useUser(): AuthContextValue {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error("useUser must be used within an AuthProvider")
  }

  return context
}
```

Throwing keeps `useUser`'s return type non-optional, so no consumer has to null-check the context itself — and a missing provider surfaces immediately instead of as a component that silently never leaves `loading`.

## Files to add / change

**`lib/auth/types.ts`** (new) — see Type Shapes above.

**`lib/auth/AuthContext.ts`** (new)
```ts
import { createContext } from "react"
import type { AuthContextValue } from "./types"

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
```

**`components/AuthProvider/AuthProvider.tsx`** (new)
```tsx
"use client"

import { useEffect, useState, type ReactNode } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase/config"
import { AuthContext } from "@/lib/auth/AuthContext"
import type { User, AuthContextValue } from "@/lib/auth/types"

type AuthProviderProps = {
  children: ReactNode
}

export default function AuthProvider({ children }: AuthProviderProps) {
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
```

**`components/AuthProvider/index.ts`** (new, barrel)
```ts
export { default } from "./AuthProvider"
```

**`app/providers.tsx`** (new) — the composition point for app-wide providers:
```tsx
import type { ReactNode } from "react"

import AuthProvider from "@/components/AuthProvider"

type ProvidersProps = {
  children: ReactNode
}

export default function Providers({ children }: ProvidersProps) {
  return <AuthProvider>{children}</AuthProvider>
}
```

**`hooks/useUser/useUser.ts`** (new)
```ts
"use client"

import { useContext } from "react"
import { AuthContext } from "@/lib/auth/AuthContext"
import type { AuthContextValue } from "@/lib/auth/types"

export default function useUser(): AuthContextValue {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error("useUser must be used within an AuthProvider")
  }

  return context
}
```

**`hooks/useUser/index.ts`** (new, barrel)
```ts
export { default } from "./useUser"
```

**`app/layout.tsx`** (change) — wrap children:
```tsx
import Providers from "@/app/providers"
...
<body>
  <Providers>{children}</Providers>
</body>
```

## Tests

Establishes this repo's first `vi.mock()` convention (existing tests only use `vi.spyOn(console, "log")`). Both test files mock `firebase/auth`'s `onAuthStateChanged` and `@/lib/firebase/config`'s `auth`, capture the callback registered with `onAuthStateChanged`, and invoke it manually (wrapped in `act`) to simulate sign-in/out.

**`tests/components/AuthProvider.test.tsx`** (new):
- renders `children` normally (provider is transparent to the tree).
- `onAuthStateChanged` is called exactly once on mount.
- a consumer reading `AuthContext` sees `{ user: null, loading: true }` before any auth event fires.
- a consumer reading `AuthContext` sees `{ user: null, loading: false }` after the captured callback fires with no user.
- a consumer reading `AuthContext` sees `{ user: { uid, email, displayName }, loading: false }` after the captured callback fires with a signed-in user, and updates again (staying `loading: false`) if it fires a second time with a different user.
- unmounting `AuthProvider` calls the unsubscribe function returned by `onAuthStateChanged`.

**`tests/hooks/useUser.test.tsx`** (new):
- throws `"useUser must be used within an AuthProvider"` when rendered with no provider above it.
- rendered via `renderHook(() => useUser(), { wrapper: AuthProvider })`: returns `{ user: null, loading: true }` before any auth event.
- returns `{ user: null, loading: false }` once the captured callback fires with no user.
- returns `{ user: { uid, email, displayName }, loading: false }` once the captured callback fires with a signed-in user.
- updates again when the callback fires a second time with a different value, without remounting.
- two components/hook instances under the same `AuthProvider` both reflect one fired change (shared Context value, not per-hook state).

No changes needed to `tests/` for `app/layout.tsx` — CLAUDE.md's route-group layout tests aren't an existing pattern in this repo, and the layout change itself is trivial plumbing covered indirectly by the provider/hook tests above.

## Build order

1. `lib/auth/types.ts`
2. `lib/auth/AuthContext.ts`
3. `components/AuthProvider/AuthProvider.tsx` + `components/AuthProvider/index.ts`
4. `tests/components/AuthProvider.test.tsx` — prove the provider in isolation
5. `hooks/useUser/useUser.ts` + `hooks/useUser/index.ts`
6. `tests/hooks/useUser.test.tsx`
7. `app/providers.tsx` + `app/layout.tsx` — compose and mount

## Verification

- `npx tsc --noEmit` — confirms typing and `@/*` alias resolution for all new/changed files.
- `npx vitest run tests/components/AuthProvider.test.tsx tests/hooks/useUser.test.tsx`, then a full `npx vitest run` to confirm the new `vi.mock()` usage doesn't bleed into other test files.
- `npm run lint` — style check (no-semicolon/double-quote, unused imports). Note: lint is already failing on a pre-existing, unrelated `react/no-unescaped-entities` error in `app/(dashboard)/heists/page.tsx` — not something this change touches or should fix.
- Manual sanity: start `npm run dev`, confirm the app still renders normally at `/`, `/login`, `/signup`, `/heists` with `AuthProvider` mounted (no visible change expected, just confirms it doesn't break the tree or throw during SSR/hydration).
