# Spec for use-heists-hook

branch: claude/feature/use-heists-hook
figma_component (if used): none

## Summary
A `useHeists` hook gives dashboard pages a live, always-current view of heist documents from Firestore, filtered to one of three named result sets, without any component having to know how those filters are built. It replaces the placeholder headings on the heists dashboard with real data broken out by "your active heists," "heists you've assigned," and "expired heists."

## Functional Requirements
- `useHeists` accepts a single required argument, one of three string literals: `"active"`, `"assigned"`, or `"expired"`.
- The hook subscribes to real-time updates from the `heists` Firestore collection (not a one-time fetch) and keeps its returned data in sync for as long as the calling component is mounted.
- The hook returns an array of heist objects, using the same shape already defined for heist documents elsewhere in the app.
- When called with `"active"`: returns heists where `assignedTo` is the current signed-in user's uid, and `deadline` is in the future (has not passed).
- When called with `"assigned"`: returns heists where `createdBy` is the current signed-in user's uid, and `deadline` is in the future (has not passed).
- When called with `"expired"`: returns heists where `deadline` is in the past, and `finalStatus` is not null. This set is not filtered by the current user — it includes matching heists regardless of who created or was assigned them.
- The hook determines the current user itself (consistent with how the rest of the app accesses the signed-in user) rather than requiring the caller to pass a uid.
- If there is no signed-in user, `"active"` and `"assigned"` return an empty array rather than erroring (they depend on a uid; `"expired"` does not).
- The heists dashboard page (`app/(dashboard)/heists/page.tsx`) calls `useHeists` three times, once per mode, and renders only the `title` of each heist in the matching result set — one list under each of the three existing section headings ("Your Active Heists," "Heists You've Assigned," "All Expired Heists"). No other heist fields are displayed on this page as part of this feature.
- Each rendered title needs a stable React key; the heist's existing `id` field is used for that.

## Possible Edge Cases
- No signed-in user yet (auth still resolving) — `"active"`/`"assigned"` should not throw or flash incorrect data; they should behave as "no results" until a user is known.
- A result set with zero matching heists — the section renders with no titles (no error state, no placeholder copy required beyond the existing heading).
- A heist whose `deadline` is exactly "now" — treated as not yet expired only if strictly in the future; this is an edge the query comparison needs to be consistent about across all three modes.
- Switching modes/arguments on an already-mounted hook instance is out of scope — each of the three call sites on the page uses a fixed, unchanging argument.
- Firestore composite indexes: querying by `assignedTo`/`createdBy` plus a `deadline` inequality, or by `deadline` plus `finalStatus`, may require indexes to be declared; this is a build/deploy concern, not a UI behavior concern.

## Acceptance Criteria
- Calling `useHeists("active")` returns only non-expired heists assigned to the current user, and updates live if a matching document is added, changed, or removed in Firestore.
- Calling `useHeists("assigned")` returns only non-expired heists created by the current user, and updates live under the same conditions.
- Calling `useHeists("expired")` returns only heists whose deadline has passed and whose `finalStatus` is not null, for any user, and updates live under the same conditions.
- The three result sets are mutually exclusive in practice for a given user/heist (a heist appears in at most one of the three lists at a time), because the filters are deadline- and status-disjoint.
- The heists dashboard page shows only heist titles, grouped under their existing section headings, sourced from the three hook calls.
- No unrelated fields, styling, or navigation are added to the heists dashboard page as part of this feature.

## Open Questions
- None — see Functional Requirements for the resolved behavior on unauthenticated access, mode-switching, and field scope.

## Testing Guidelines
Create a test file(s) in the ./tests folder for the new feature, and create meaningful tests for the following cases, without going too heavy:
- `useHeists("active")` returns heists assigned to the current user with a future deadline, and excludes ones with a past deadline or assigned to someone else.
- `useHeists("assigned")` returns heists created by the current user with a future deadline, and excludes ones with a past deadline or created by someone else.
- `useHeists("expired")` returns heists with a past deadline and non-null `finalStatus`, and excludes ones that are still active or still have a null `finalStatus`, regardless of user.
- With no signed-in user, `useHeists("active")` and `useHeists("assigned")` return an empty array rather than throwing.
- The heists dashboard page renders titles from each of the three hook results under the correct heading.
