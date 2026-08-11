# Spec for Auth-Based Route Protection

branch: claude/feature/auth-route-protection
figma_component (if used): none

## Summary
Gate each route group by authentication state, using the existing `useUser` hook (backed by `AuthProvider`'s Firebase `onAuthStateChanged` subscription) to read the current user and loading status. Pages under `app/(public)/` are only for unauthenticated visitors; pages under `app/(dashboard)/` are only for authenticated users. Each group's layout is responsible for checking auth state and redirecting a visitor who doesn't belong there, rather than each page implementing its own check. While the auth status is still resolving (Firebase's first `onAuthStateChanged` callback hasn't fired yet), each group layout shows a simple loading state instead of its normal children, so a visitor is never shown a page they don't have access to, or bounced through a flash of the wrong content before the redirect fires. The one page with its own more specific behavior is the root splash route (`/`), which redirects every visitor onward regardless of auth state, and the one page exempt entirely is `/preview`, a dev-only scratch page.

## Functional Requirements
- The `(public)` group layout reads auth state via `useUser` and redirects an authenticated user away from any `(public)` route to `/heists` — the single, fixed redirect target for every such case (no preserving or returning to the page the user was trying to reach).
- The `(dashboard)` group layout reads auth state via `useUser` and redirects an unauthenticated user away from any `(dashboard)` route to `/login`.
- Both group layouts show a simple loading state, in place of their normal children, for as long as `useUser`'s `loading` value is `true` (i.e. before Firebase has reported its first auth-state result).
- Once loading resolves, a visitor who doesn't belong in the current group is redirected before that group's normal children are shown; a visitor who does belong in the current group sees their requested page normally, with no loader lingering after auth state is known.
- Redirects apply to every route within their group — this is enforced once at the group layout, not duplicated per page — with the two explicit exceptions below.
- `/preview` is exempt from the `(public)` group's redirect gate entirely: it never redirects regardless of auth state, since it's a dev-only component preview page (per `CLAUDE.md`) that intentionally renders both signed-in and signed-out component states side by side.
- The root splash route (`/`) redirects every visitor onward rather than ever showing its own content in place: an authenticated visitor is redirected to `/heists` (the same target as any other `(public)` route), and an unauthenticated visitor is redirected to `/login` (unlike other `(public)` routes, which simply remain visible to an unauthenticated visitor).
- A change in auth state while a user is already sitting on a page (e.g. sign-out in another tab, session expiry) does not need to redirect them live. It's sufficient that the correct redirect happens the next time that group's layout re-evaluates auth state, such as on a navigation or a page refresh.
- This feature only changes what each group's layout renders/redirects to based on auth state; it does not change the content of any individual page (aside from `/`, whose content is fully replaced by the redirect-everyone behavior described above).

## Possible Edge Cases
- A visitor's auth state is still loading when they first land on a route — the loader must show instead of either the real page or a premature redirect.
- An authenticated user directly navigates to (or is linked to) a `(public)` route, e.g. `/login` or `/signup`, while already signed in.
- An unauthenticated user directly navigates to (or is linked to) a `(dashboard)` route, e.g. `/heists/create`, without being signed in.
- A user's auth state changes while they're already sitting on a page (e.g. their session expires or they sign out in another tab) — per the Functional Requirements above, this is not required to redirect them live; the next navigation or refresh is sufficient.
- A developer visits `/preview` while signed in or signed out — per the Functional Requirements above, this route never redirects either way.
- Any visitor lands on `/` — per the Functional Requirements above, they are always redirected onward (to `/heists` or `/login`) and never shown the splash content in place.

## Acceptance Criteria
- Visiting any `(public)` route (other than `/` or `/preview`) while authenticated redirects to `/heists`, without that page's normal content ever becoming visible first.
- Visiting any `(dashboard)` route while unauthenticated redirects to `/login`, without that page's normal content ever becoming visible first.
- While auth state is loading, the `(public)` and `(dashboard)` layouts each show a simple loader instead of their children or a redirect.
- Visiting a route that matches the current auth state (e.g. an unauthenticated visitor on `/login`, or an authenticated user on `/heists`) shows that page's normal content once loading resolves, with no redirect and no lingering loader.
- Visiting `/` always redirects once loading resolves — to `/heists` if authenticated, to `/login` if not — and never shows the splash page's own content.
- Visiting `/preview` never redirects, regardless of auth state or loading status.
- The redirect and loading behavior is implemented once per group layout, not duplicated across individual pages within that group.

## Open Questions
None — all questions raised during drafting were resolved and folded into the Functional Requirements above.

## Testing Guidelines
Create a test file(s) in the ./tests folder for the new feature, and create meaningful tests for the following cases, without going too heavy:
- The `(public)` layout redirects to `/heists` when `useUser` reports an authenticated user.
- The `(public)` layout renders its children (no redirect) when `useUser` reports no user and loading has finished.
- The `(dashboard)` layout redirects to `/login` when `useUser` reports no authenticated user.
- The `(dashboard)` layout renders its children (no redirect) when `useUser` reports an authenticated user.
- Both layouts show the loader, and neither their children nor a redirect, while `useUser`'s `loading` is `true`.
- The root splash page redirects to `/heists` when authenticated and to `/login` when unauthenticated, in both cases never rendering its own content.
- `/preview` renders normally (no redirect) both when authenticated and when unauthenticated.
