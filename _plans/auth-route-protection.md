# Plan: Auth-Based Route Protection

Spec: `_specs/auth-route-protection.md` · Branch: `claude/feature/auth-route-protection`

## Context

Neither route group is currently gated — `app/(public)/layout.tsx` and `app/(dashboard)/layout.tsx` are both plain server components that render their children unconditionally. Nothing stops a signed-in user from sitting on `/login`, or a signed-out visitor from loading `/heists/create`. The spec asks for this to be enforced once per group layout via the existing `useUser` hook, with two explicit carve-outs: `/preview` (a dev-only scratch page) is exempt entirely, and `/` (the splash page) always redirects everyone onward rather than ever showing its own content.

There's no existing route-guard pattern in this codebase to extend — the only prior client-side redirect is `SignupForm`'s post-signup `router.push`. This plan introduces that pattern for the first time.

## Changes

### 1. `components/Loader/Loader.tsx` (new)

A minimal, prop-less loading placeholder — deliberately not `components/Skeleton`, which is a card/list-item shaped placeholder used only for its own preview, not an actual loading state anywhere. Reuses the existing `.center-content` utility (already used by the splash/login/signup pages) rather than inventing new layout CSS, plus `lucide-react` (already the icon library used elsewhere) for a simple spin icon. No `"use client"` — purely presentational, same as `SubmitButton`.

```tsx
import { Loader2 } from "lucide-react"

export default function Loader() {
  return (
    <div className="center-content" role="status">
      <Loader2 className="animate-spin" size={32} aria-hidden="true" />
      <span className="sr-only">Loading…</span>
    </div>
  )
}
```

`role="status"` gives tests a stable `getByRole("status")` query.

### 2. `components/PublicGuard/PublicGuard.tsx` (new)

`"use client"`, owns no state but reads `useUser()` + `usePathname()`/`useRouter()` from `next/navigation` and runs a redirect effect. Handles all three `(public)` cases in one place, since the spec requires the gate to live once at the group layout:

```tsx
"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"

// auth
import useUser from "@/hooks/useUser"

// components
import Loader from "@/components/Loader"

type PublicGuardProps = {
  children: React.ReactNode
}

export default function PublicGuard({ children }: PublicGuardProps) {
  const { user, loading } = useUser()
  const pathname = usePathname()
  const router = useRouter()

  const exempt = pathname === "/preview"
  const isSplash = pathname === "/"

  useEffect(() => {
    if (exempt || loading) return
    if (isSplash) router.replace(user ? "/heists" : "/login")
    else if (user) router.replace("/heists")
  }, [exempt, isSplash, loading, user, router])

  if (exempt) return children
  if (loading || isSplash || user) return <Loader />
  return children
}
```

Notes on the logic:
- `/preview` is checked first and short-circuits everything — no loader, no redirect, ever, regardless of loading or auth state. This is what lets `/preview` keep rendering `<LoginForm/>`/`<SignupForm/>`/`<LogoutButton/>` side by side for component-preview purposes.
- `isSplash` (`pathname === "/"`) always resolves to the loader branch once loading is done, because the effect always redirects it — its own page content never has a path to render.
- Route-group parens (`(public)`) don't appear in `usePathname()`'s output, so `/preview` and `/` match directly.

### 3. `components/AuthGuard/AuthGuard.tsx` (new)

Simpler — no path exceptions in the dashboard group.

```tsx
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

// auth
import useUser from "@/hooks/useUser"

// components
import Loader from "@/components/Loader"

type AuthGuardProps = {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (loading || user) return
    router.replace("/login")
  }, [loading, user, router])

  if (loading || !user) return <Loader />
  return children
}
```

**Two separate components, not one parameterized guard.** `PublicGuard` and `AuthGuard` redirect on inverted conditions, to different targets, and `PublicGuard` carries two path-based carve-outs that have no meaning for `AuthGuard`. Collapsing them into one component would need a `mode`-shaped prop plus exemption props only one caller ever uses — worse than the duplication it would save. This isn't in tension with the repo's anti-`mode`-prop stance on `LoginForm`/`SignupForm` (that rule targets components whose logic is identical and only the copy differs); here the redirect logic itself differs. Both guards share only the presentational `Loader`.

**Redirect via `router.replace()`, not `router.push()`.** A guard redirect is correcting an unauthorized visit, not a forward navigation — `replace()` overwrites the current history entry so the back button can't return a visitor to a page they were just bounced from (and can't create a loader↔redirect back-button loop). This is deliberately different from `SignupForm`'s existing `router.push("/heists")`, which is a legitimate forward navigation after a successful action.

### 4. Layout edits

**`app/(dashboard)/layout.tsx` — wrap the whole layout, including `<Navbar/>`:**

```tsx
import Navbar from "@/components/Navbar"
import AuthGuard from "@/components/AuthGuard"

export default function HeistsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthGuard>
      <Navbar />
      <main>{children}</main>
    </AuthGuard>
  )
}
```

`Navbar` doesn't call `useUser` itself — it unconditionally renders dashboard chrome (a "Create New Heist" link) and only `LogoutButton` inside it self-hides while loading/signed-out. If the guard wrapped just `{children}`, an unauthenticated visitor would see a flash of dashboard nav before the redirect fires. Wrapping the whole layout means only `<Loader/>` shows until authorization is confirmed.

**`app/(public)/layout.tsx` — wrap only `{children}`, keep `<main className="public">` outside:**

```tsx
import PublicGuard from "@/components/PublicGuard"

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="public">
      <PublicGuard>{children}</PublicGuard>
    </main>
  )
}
```

`<main className="public">` is a pure styling hook (scopes `.public h1` sizing in `globals.css`) with nothing auth-sensitive in it, so there's no flash concern that would justify moving it inside the guard.

Both layout files stay server components — no `"use client"` on either. The client boundary is the guard component, matching the existing convention that the directive goes only on components owning state/effects.

### 5. `app/(public)/page.tsx` — leave untouched

Once `PublicGuard` is in place, `Home`'s current JSX becomes unreachable in normal use (the splash route always redirects before its children render). Gutting the file is tempting but out of scope for this feature — the spec only asks the layout to change what it renders/redirects to, and no acceptance criterion depends on this file's content (splash behavior is verified against `PublicGuard` with `pathname: "/"`, not against the page component). Leave it as-is; call it out as an optional follow-up cleanup if the team wants dead code removed later.

### 6. Tests

Mocking setup, extending the two established patterns in this repo (`@/hooks/useUser` mocking from `tests/components/LogoutButton.test.tsx`, `next/navigation` mocking from `tests/components/SignupForm.test.tsx`) with `usePathname` added:

```tsx
const { useUser, replace, usePathname } = vi.hoisted(() => ({
  useUser: vi.fn(),
  replace: vi.fn(),
  usePathname: vi.fn(),
}))

vi.mock("@/hooks/useUser", () => ({ default: useUser }))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => usePathname(),
}))
```

**`tests/components/PublicGuard.test.tsx`:**
- loading (any pathname) → shows the loader; children not rendered; `replace` not called
- unauthenticated, non-splash/non-preview path (e.g. `/login`), not loading → renders children; `replace` not called
- authenticated, non-splash/non-preview path (e.g. `/signup`), not loading → shows loader; `replace` called with `"/heists"` (assert via `waitFor`)
- pathname `/`, authenticated, not loading → `replace` called with `"/heists"`; children never rendered
- pathname `/`, unauthenticated, not loading → `replace` called with `"/login"`; children never rendered
- pathname `/`, loading → shows loader; `replace` not called yet
- pathname `/preview`, authenticated → renders children, no loader, `replace` not called
- pathname `/preview`, unauthenticated → renders children, no loader, `replace` not called
- pathname `/preview`, loading → renders children (exempt even while loading)

**`tests/components/AuthGuard.test.tsx`:**
- loading → shows loader; children not rendered; `replace` not called
- authenticated, not loading → renders children; `replace` not called
- unauthenticated, not loading → shows loader; `replace` called with `"/login"` (via `waitFor`)

**`tests/components/Loader.test.tsx`** (small, one smoke test): renders an element with `role="status"`.

No `tests/app/` directory needed — per this repo's "test each component at its own level" convention, the splash-page special case is fully exercised by testing `PublicGuard` with `usePathname` mocked to `"/"`, not by testing the (now-inert) `page.tsx`.

## Sequencing

1. `components/Loader/Loader.tsx` — standalone, no dependents.
2. `components/AuthGuard/AuthGuard.tsx` — depends on `Loader`.
3. `components/PublicGuard/PublicGuard.tsx` — depends on `Loader`.
4. `tests/components/Loader.test.tsx`, `tests/components/AuthGuard.test.tsx`, `tests/components/PublicGuard.test.tsx`.
5. `app/(dashboard)/layout.tsx` and `app/(public)/layout.tsx` edits — depend on 2 and 3.

## Verification

- `npx vitest run tests/components/Loader.test.tsx tests/components/AuthGuard.test.tsx tests/components/PublicGuard.test.tsx` — new suites pass.
- `npx vitest run` — full suite, confirm nothing else regresses (in particular `Navbar`/`LogoutButton` tests, since `Navbar` is now mounted inside `AuthGuard`).
- `npx tsc --noEmit` — clean.
- `npm run dev`, then manually exercise: visit `/` signed out → redirected to `/login`; sign in, visit `/` → redirected to `/heists`; visit `/login` while signed in → redirected to `/heists`; sign out, visit `/heists` → redirected to `/login`; visit `/preview` in both signed-in and signed-out states → renders normally, no redirect either time; confirm a brief loader appears (not a content flash) on first load before Firebase resolves.
- `npm run lint` — note the pre-existing unrelated failure in `app/(dashboard)/heists/page.tsx` (`react/no-unescaped-entities`), not attributable to this change.
