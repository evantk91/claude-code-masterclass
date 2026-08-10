# Spec for Auth State Hook (useUser)

branch: claude/feature/auth-state-useuser-hook-01
figma_component (if used): none

## Summary
Introduce a `useUser` hook that exposes the current Firebase Auth state — a `User` object plus a `loading` flag — to any page or component in the app, backed by a single realtime listener on Firebase Auth state owned by an `AuthProvider` React Context provider mounted at the app root. This feature is limited to *reading* auth state globally — it does not build or change any sign-in, sign-up, or sign-out flow. The existing `/login` and `/signup` forms and their submit behavior are untouched. Firebase Auth is already initialized (`lib/firebase/config.ts` exports `auth`), but nothing in the repo currently subscribes to it — this feature adds that subscription and a way to consume it.

## Functional Requirements
- A `useUser` hook is importable and usable from any client component or page in either route group (`app/(public)` and `app/(dashboard)`).
- Two named types are defined in a dedicated types module: `User` (a normalized shape with `uid`, `email`, `displayName` — not the raw Firebase `User` instance) and `AuthContextValue` (`{ user: User | null, loading: boolean }`). `useUser` returns `AuthContextValue`, never `undefined` — it throws instead when no provider is present, so consumers never have to guard the context itself.
- `loading` is `true` until Firebase has reported its first auth-state result, then `false` for the rest of the session (it does not flip back to `true` on subsequent sign-in/sign-out events — those are just `user` changing while `loading` stays `false`). `user` is `null` whenever there is no signed-in user, whether or not `loading` has resolved yet. This reverses an earlier decision in this spec to fold "loading" and "signed out" into a single `null` return value with no distinct flag.
- Auth state is observed via a single shared realtime listener (Firebase's auth state change listener) sourced from the existing `auth` export in `lib/firebase/config.ts` — not a separate listener instantiated per hook call/component.
- The listener is owned by an `AuthProvider` React Context provider living under `components/AuthProvider/`, following the repo's existing component conventions (own directory, default export, barrel `index.ts`). It is composed into a `Providers` wrapper in `app/providers.tsx` — a single composition point that the root layout mounts, so future app-wide providers can be added there without touching `app/layout.tsx` again. `AuthProvider` subscribes to Firebase's auth state change listener on mount and provides the current value via Context; `useUser` reads that Context rather than managing any subscription itself. Non-goal: no module-level singleton listener living outside the React tree (e.g. in `lib/`) — the Provider is the single source of truth.
- No sign-in, sign-up, or sign-out UI or logic is added or modified as part of this feature. The `/login` and `/signup` forms keep their current (non-functional, placeholder-submit) behavior.
- `app/layout.tsx` gains a `Providers` wrapper around its children as required infrastructure for this feature — this is a structural/plumbing change, not "consuming" the auth state anywhere. Non-goal: this feature does not add any user-facing UI or logic that reads `useUser`'s value in `Navbar`, the `/` splash page, or any other existing page/component. It ships as an isolated, currently-unconsumed hook (plus its supporting provider) with its own tests only — a repo-wide check confirmed no existing component or page currently reads a "user" concept, so there is nothing to migrate as part of this feature.

## Figma Design Reference (only if referenced)
- Not applicable — no Figma link was provided for this feature.

## Possible Edge Cases
- Page loads/refreshes while Firebase is still restoring a persisted session — the hook reports `{ user: null, loading: true }` until Firebase resolves its first result.
- Firebase reports a signed-in user whose token has since expired or been revoked — the listener should reflect the resulting sign-out (`user` becomes `null`, `loading` stays `false`).
- The hook is called from a component not rendered beneath `AuthProvider` — `useUser` throws `"useUser must be used within an AuthProvider"` rather than silently reporting a permanent loading state. The Context carries no usable default value, so a missing provider is always detectable.
- The hook is called from a server component — this fails as a client-only hook error at build/runtime, rather than silently returning a wrong value.
- Multiple browser tabs open simultaneously — each tab's `AuthProvider` reflects that tab's local Firebase Auth state; cross-tab sync behavior depends on Firebase's own persistence and is not something this feature builds custom logic for.
- `AuthProvider` must subscribe exactly once regardless of re-renders — its effect must not re-subscribe on every render of the root layout.
- `AuthProvider` unmounts (e.g. in tests, or a future scenario where it's remounted) — the underlying Firebase subscription must be cleaned up so it doesn't keep firing updates or leak.

## Acceptance Criteria
- Calling `useUser` from a client component returns an `AuthContextValue` (`{ user, loading }`) reflecting Firebase's real-time reported value.
- Before Firebase reports its first result, the hook returns `{ user: null, loading: true }`.
- Once resolved with no signed-in user, the hook returns `{ user: null, loading: false }`.
- Once resolved with a signed-in user, the hook returns `{ user: { uid, email, displayName }, loading: false }`.
- When Firebase Auth state changes during a session (e.g. a user is signed in or out through some means), every component using `useUser` re-renders with the updated `user` value automatically, with `loading` remaining `false`.
- There is exactly one underlying realtime listener per app session, owned by a single `AuthProvider` instance mounted in `app/layout.tsx`, regardless of how many components call `useUser` simultaneously.
- Calling `useUser` with no `AuthProvider` above it throws `"useUser must be used within an AuthProvider"`.
- `useUser` is not wired into any existing page or component's UI as part of this feature (only the required `AuthProvider` plumbing in `app/layout.tsx`) — it ships with its own tests only.

## Open Questions
None — all open questions from the initial draft have been resolved and folded into Functional Requirements above.

## Testing Guidelines
Create a test file(s) in the ./tests folder for the new feature, and create meaningful tests for the following cases, without going too heavy:
- `useUser`, rendered beneath `AuthProvider`, returns `{ user: null, loading: true }` before Firebase's auth listener reports a result.
- `useUser` returns `{ user: null, loading: false }` when Firebase's auth listener reports no signed-in user.
- `useUser` returns `{ user: { uid, email, displayName }, loading: false }` when Firebase's auth listener reports a signed-in user.
- `useUser`'s returned value updates when the underlying auth state changes after initial mount (the mocked listener fires a second time with a different value), without remounting.
- `AuthProvider` subscribes to Firebase's auth listener exactly once and unsubscribes on unmount.
- `useUser` throws when rendered with no `AuthProvider` above it.
