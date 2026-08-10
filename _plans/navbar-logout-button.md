# Plan: Navbar Logout Button

Spec: `_specs/navbar-logout-button.md` · Branch: `claude/feature/navbar-logout-button`

## Context

`useUser` and `AuthProvider` shipped in an earlier feature and are already mounted app-wide via `app/providers.tsx`, but **nothing in the app consumes them yet** — the hook has only its own tests. Meanwhile `lib/auth/signUp.ts` gives users a way in, and there is no way out: no sign-out call anywhere in the repo, and `Navbar` renders a fixed heading + "Create New Heist" link regardless of who (if anyone) is signed in.

This feature adds the missing sign-out half and the one piece of UI that triggers it: a Logout button in the dashboard navbar, visible only while somebody is signed in. It's deliberately narrow — no redirect, no route protection, no confirmation dialog. Success is simply that clicking Logout ends the Firebase session, at which point the button unmounts on its own because `useUser` reports `user: null`.

## Architecture

Three pieces, mirroring how signup is already structured:

1. **`lib/auth/signOut.ts`** (new) — thin wrapper over Firebase's modular `signOut(auth)`, using the shared `auth` from `lib/firebase/config.ts`. Keeps the Firebase SDK out of components exactly like `lib/auth/signUp.ts` does, and gives the flow a unit-testable seam. Unlike `signUp`, it does **not** map error codes to friendly copy — the navbar has no error surface (see spec), so rejections propagate untouched.
2. **`components/LogoutButton/`** (new) — a `"use client"` component that owns *both* the click handler and the visibility decision. It calls `useUser()` and returns `null` unless auth has resolved with a user. **This is what keeps `Navbar` a server component**: `Navbar` renders `<LogoutButton />` unconditionally and never touches auth state.
3. **`components/Navbar/`** (change) — wrap the existing `<ul>` and the new button in a flex actions container so the button seats to the left of "Create New Heist" with a 16px gap. No `"use client"`, no new props.

Two details worth stating up front:

- **Naming collision.** Our module exports `signOut` and imports Firebase's `signOut`. Alias the import: `import { signOut as firebaseSignOut } from "firebase/auth"`. The same aliasing is needed in the test file.
- **Gap collapse.** Because `LogoutButton` returns `null` (no DOM node, therefore no flex item), the actions container's `gap-4` simply doesn't apply when signed out — no phantom spacing. This is why the button should *not* be wrapped in an `<li>` by `Navbar`; an empty `<li>` would still be a flex item and would leave a visible 16px gap.

## File Structure

```
lib/
  auth/
    signOut.ts                        # new — firebase sign-out wrapper
    signUp.ts                          # existing — unchanged
  firebase/
    config.ts                           # existing — auth export, unchanged

components/
  LogoutButton/
    LogoutButton.tsx                     # new — client component
    LogoutButton.module.css               # new
    index.ts                               # new — barrel
  Navbar/
    Navbar.tsx                              # changed — renders LogoutButton
    Navbar.module.css                        # changed — .actions

app/
  (public)/preview/page.tsx                   # changed — preview entry

tests/
  lib/auth/signOut.test.ts                     # new
  components/LogoutButton.test.tsx              # new
  components/Navbar.test.tsx                     # changed — mock the child
```

## Files to add / change

**`lib/auth/signOut.ts`** (new)
```ts
import { signOut as firebaseSignOut } from "firebase/auth"

// firebase
import { auth } from "@/lib/firebase/config"

// Deliberately message-free, unlike signUp: the navbar has nowhere to show a
// failure, so the rejection travels untouched to the caller, which logs it.
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
}
```

**`components/LogoutButton/LogoutButton.tsx`** (new)
```tsx
"use client"

import { useState } from "react"

// auth
import useUser from "@/hooks/useUser"
import { signOut } from "@/lib/auth/signOut"

import styles from "./LogoutButton.module.css"

export default function LogoutButton() {
  const { user, loading } = useUser()
  const [isSigningOut, setIsSigningOut] = useState(false)

  // nothing to sign out of — and rendering nothing while loading avoids a
  // button that flashes in and straight back out on a restored session
  if (loading || !user) return null

  async function handleClick() {
    // the button is disabled mid-flight too; this guards a click that skips it
    if (isSigningOut) return

    setIsSigningOut(true)

    try {
      await signOut()
      // left signing out on purpose — a successful sign-out flips the auth
      // listener, which unmounts this component before any reset could matter
    } catch (error) {
      console.error("Sign out failed:", error)
      setIsSigningOut(false)
    }
  }

  return (
    <button type="button" className={styles.logoutBtn} onClick={handleClick} disabled={isSigningOut}>
      Logout
    </button>
  )
}
```

The `catch`-only reset is the same trade `SignupForm` already makes on its success path (`SignupForm.tsx:32`) — no state update on an unmounted component.

**`components/LogoutButton/index.ts`** (new)
```ts
export { default } from "./LogoutButton"
```

**`components/LogoutButton/LogoutButton.module.css`** (new)

Values taken from Figma node `57:18` (`get_design_context`): transparent fill, 1px solid white border, 10px radius, 127×38px, Inter 16px/24px with `-0.3125px` tracking in white — the same type treatment `.createBtn` already uses. Hover and disabled states are repo conventions, not from the design frame.

```css
@reference "../../app/globals.css";

.logoutBtn {
  @apply inline-flex items-center justify-center;
  @apply w-[127px] h-[38px] rounded-[10px];
  @apply border border-white bg-transparent;
  @apply text-base leading-6 tracking-[-0.3125px] text-white;
  @apply transition-colors;
}

.logoutBtn:hover {
  @apply bg-white/10;
}

/* matches SubmitButton's disabled treatment */
.logoutBtn:disabled {
  @apply cursor-not-allowed opacity-60;
}
```

**`components/Navbar/Navbar.tsx`** (change)

Heading block untouched. The `<ul>` and its "Create New Heist" `<li>` keep their exact current markup; only the wrapper is new:

```tsx
import { Clock8, Plus } from "lucide-react"
import Link from "next/link"

// components
import LogoutButton from "@/components/LogoutButton"

import styles from "./Navbar.module.css"

export default function Navbar() {
  return (
    <div className={styles.siteNav}>
      <nav>
        <header>{/* unchanged */}</header>
        <div className={styles.actions}>
          <LogoutButton />
          <ul>
            <li>
              <Link href="/heists/create" className={styles.createBtn}>
                <Plus size={20} strokeWidth={2} />
                Create New Heist
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </div>
  )
}
```

**`components/Navbar/Navbar.module.css`** (change) — add
```css
.actions {
  @apply flex items-center gap-4;
}
```

**`app/(public)/preview/page.tsx`** (change)

Add a `LogoutButton` entry alongside the existing `LoginForm`/`SignupForm` sections, per CLAUDE.md's "add new components here". Note it renders only while signed in — that's the component working correctly, not a broken preview.

## Build order

1. `lib/auth/signOut.ts` + `tests/lib/auth/signOut.test.ts`
2. `components/LogoutButton/*` + `tests/components/LogoutButton.test.tsx`
3. `components/Navbar/*` + `tests/components/Navbar.test.tsx` mock
4. `app/(public)/preview/page.tsx`

## Verification

- `npx vitest run` — new suites pass, no regressions (Navbar included).
- `npx tsc --noEmit` — clean.
- `npm run lint` — no *new* errors. The pre-existing `react/no-unescaped-entities` failure in `app/(dashboard)/heists/page.tsx` is expected and unrelated, per CLAUDE.md.
- Manual, `npm run dev`:
  - Signed out, visit `/heists` → navbar shows only "Create New Heist", no gap artifact where the logout button would be.
  - Sign up or log in, visit `/heists` → "Logout" appears immediately left of "Create New Heist", outlined pill, ~16px gap.
  - Hard-refresh while signed in → button appears once auth resolves; it must not flash in and out.
  - Click Logout → button disappears, page does **not** navigate, URL stays on `/heists`. Confirm the session ended by refreshing: the button stays gone.
  - Offline (DevTools → Network → Offline), click Logout → button re-enables, no visible error, `Sign out failed:` in the console.
- Compare against Figma node `57:18` in the running app.

## Out of scope (confirmed, no changes)

`hooks/useUser/*`, `components/AuthProvider/*`, `lib/auth/AuthContext.ts`, `lib/auth/types.ts`, `lib/auth/signUp.ts`, `app/providers.tsx`, `app/layout.tsx`, `app/(dashboard)/layout.tsx`, `app/(public)/page.tsx` (the splash redirect stays unimplemented), and all form components.
