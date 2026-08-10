# Spec for Navbar Logout Button

branch: claude/feature/navbar-logout-button
figma_component (if used): LogoutButton (node 57:18, an instance of `ButtonComponent` with its icon layer hidden)

## Summary
Add a Logout button to the dashboard navbar that signs the current user out of Firebase Auth when clicked, and that is only rendered while somebody is actually signed in. This is the first feature to *consume* the `useUser` hook shipped by the auth-state feature — that hook and its `AuthProvider` already exist and are already mounted at the app root via `app/providers.tsx`, so no new provider plumbing is needed. Signing out is the only behavior in scope: there is deliberately no redirect, no route protection, and no change to what any page renders once `user` becomes `null`. The app already has a sign-up path (`lib/auth/signUp.ts`); this feature adds the mirror-image sign-out path and the single piece of UI that triggers it.

## Functional Requirements
- A sign-out function lives in the `lib/auth/` directory alongside the existing `signUp` module, and wraps Firebase Auth's sign-out call against the shared `auth` instance exported from `lib/firebase/config.ts`. UI components call this module rather than importing the Firebase SDK directly, matching how `SignupForm` calls `signUp`.
- The Logout button is its own component in its own directory under `components/`, following the repo's component conventions (default export, barrel `index.ts`, co-located CSS Module). It is a client component — it owns both the click handler and the auth-state read.
- The button component itself decides whether it renders, by reading `useUser`. This keeps `Navbar` a server component: `Navbar` always renders the button in its markup, and the button returns nothing when there is nobody to sign out. Non-goal: `Navbar` does not become a client component, and no auth state is threaded through it as props.
- Visibility rules, driven by `useUser`'s `{ user, loading }`:
  - `loading: true` → render nothing. The button must not flash in and then disappear while Firebase restores a persisted session, and must not flash for a signed-out visitor.
  - resolved with `user: null` → render nothing.
  - resolved with a `user` → render the button.
- Clicking the button calls the sign-out function. While that call is in flight the button is disabled, so a double-click cannot fire two sign-out calls.
- After a successful sign-out, `AuthProvider`'s existing Firebase listener sets `user` to `null`, which makes the button unmount on its own. The button does not manually hide itself, and does not navigate anywhere. Non-goals for this feature, all deliberate: no redirect to `/login` (or anywhere) after logout, no router refresh, no protection of `/heists*` against being viewed while signed out, no change to the `/` splash page's still-unimplemented auth redirect, and no confirmation dialog before signing out.
- If the sign-out call fails, the button re-enables so the user can retry, and the app stays on the current page with the user still signed in. The navbar has no error-display surface and this feature does not add one — the failure is reported to the console only. Non-goal: no toast, banner, or inline error message in the navbar.
- The button is placed in the navbar's right-hand group, immediately to the left of the existing "Create New Heist" link, and is a real `<button>` (an action, not navigation) labelled "Logout".
- Styling reuses the existing theme tokens and the navbar's own CSS Module conventions rather than introducing new raw color values. The button's own styles live with the button component; only the spacing/layout needed to seat it in the nav belongs in `Navbar.module.css`.
- Nothing about the existing `Navbar` content changes: the heading, logo mark, tagline, and "Create New Heist" link keep their current markup and behavior.

## Figma Design Reference (only if referenced)
- File: Page Designs (Copy) — https://www.figma.com/design/JA4z6aI43yC7AoTlznYsnZ/Page-Designs--Copy-?node-id=57-18&m=dev
- Component name: `LogoutButton` (node `57:18`) — an instance of the same `ButtonComponent` used by "Create New Heist", with the leading icon layer hidden. There is no icon in the logout variant.
- Key visual constraints:
  - Outlined/ghost pill: transparent (navbar-colored) fill with a thin light border, in contrast to the adjacent solid purple→pink gradient "Create New Heist" button.
  - ~127 × 38 px at design width, i.e. slightly shorter than the 40px gradient button next to it; same rounded-pill corner radius family (~10px) as `.createBtn`.
  - Label "Logout" in white, same Inter body size/weight as the "Create New Heist" label, horizontally centered with generous side padding.
  - Sits inside the navbar's right-hand cluster with a small gap between it and the "Create New Heist" button; the whole cluster stays right-aligned against the navbar container.
  - The design frame shows no hover, focus, or disabled state — those are left to match the repo's existing button conventions.

## Possible Edge Cases
- First paint / page refresh while Firebase is still restoring a persisted session — `loading` is `true`, so the button renders nothing rather than briefly appearing or briefly showing a signed-out navbar.
- A signed-out visitor somehow reaching a dashboard route — the navbar renders without a Logout button, and no error is thrown.
- Rapid double-click, or clicking again before the previous sign-out resolves — only one sign-out call is issued.
- The sign-out promise rejects (offline, network failure) — the button re-enables, the user stays signed in, and nothing crashes.
- The component unmounts mid-flight because auth state resolved to `null` from another tab or source — resolving the in-flight call must not produce a state update on an unmounted component.
- Auth state changes from elsewhere (another tab, token revocation) while the dashboard is open — the button appears/disappears purely as a consequence of `useUser`'s value changing, with no extra logic.
- The button is rendered with no `AuthProvider` above it — `useUser` already throws its own explicit error; this feature adds no separate fallback.

## Acceptance Criteria
- With a signed-in user, the dashboard navbar shows a "Logout" button immediately to the left of "Create New Heist".
- With no signed-in user, or while auth state is still loading, no Logout button is present in the navbar at all.
- Clicking Logout calls the sign-out module exactly once and, on success, the button disappears from the navbar without any navigation occurring.
- The button is disabled for the duration of an in-flight sign-out and cannot fire a second call.
- A failed sign-out leaves the user signed in, leaves the button rendered and re-enabled, and shows no user-facing error UI.
- `Navbar` remains a server component with no `"use client"` directive and no auth-related props.
- The rest of the navbar (heading, logo, tagline, "Create New Heist" link) is unchanged, and its existing tests still pass.
- The rendered button visually matches the Figma reference: outlined pill, white "Logout" label, no icon, seated in the right-hand nav cluster.

## Open Questions
- None blocking. Two decisions were made by default rather than specified in the request and are called out explicitly in Functional Requirements above so they can be reversed cheaply: (1) a failed sign-out surfaces to the console only, with no navbar error UI; (2) the button renders nothing — rather than a placeholder or skeleton — while `loading` is `true`. Redirect-after-logout was ruled out by the request itself and is recorded as a non-goal, not an open question.

## Testing Guidelines
Create a test file(s) in the ./tests folder for the new feature, and create meaningful tests for the following cases, without going too heavy:
- The sign-out module calls Firebase Auth's sign-out with the shared `auth` instance, and propagates a rejection rather than swallowing it (mirroring the existing `tests/lib/auth/signUp.test.ts` approach).
- The Logout button renders nothing when auth state is still loading.
- The Logout button renders nothing when auth state has resolved with no signed-in user.
- The Logout button renders with the accessible name "Logout" when a user is signed in.
- Clicking the button invokes the sign-out module once, and a second click during the in-flight call does not invoke it again.
- A rejected sign-out leaves the button rendered and re-enabled, with no error text surfacing in the UI.
- Test the button at its own level with `useUser`/the sign-out module mocked — do not re-test its behavior through `Navbar`. `Navbar`'s existing tests stay as they are.
