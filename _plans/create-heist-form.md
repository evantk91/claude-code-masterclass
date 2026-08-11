# Plan: Create Heist Form

Spec: `_specs/create-heist-form.md` · Branch: `claude/feature/create-heist-form`

## Context

`app/(dashboard)/heists/create/page.tsx` is currently a placeholder heading. This plan implements the real form: a signed-in user fills in a title, description, and picks a coworker to assign the heist to; submitting writes a `heists` document to Firestore and redirects to `/heists`. The assignee list comes from the `users` collection, which today has no read path anywhere in the codebase (its only reader/writer is the single `setDoc` in `lib/auth/signUp.ts`) — this feature adds the first read from it.

Spec decisions already locked in: no self-assignment, no length limits on title/description, assignee list = everyone except the current user, use the existing `Loader` for the initial users fetch, and description is a multi-line field (new `TextAreaField`, not a reused `TextField`).

## Layering

```
app/(dashboard)/heists/create/page.tsx (server)
  → CreateHeistForm (client — owns state, fetch, submit)
    → Loader (existing — full-view gate while assignees load)
    → FormCard (new — stateless shell, sibling to AuthForm)
      → TextField (existing — title)
      → TextAreaField (new — description)
      → SelectField (new — assignee)
      → SubmitButton (existing)
```

This mirrors the existing auth-form layering (`page → LoginForm/SignupForm → AuthForm → controls`) rather than reusing it directly.

**Why a new `FormCard` instead of reusing `AuthForm`:** `AuthForm` (`components/AuthForm/AuthForm.tsx`) requires `switchPrompt`/`switchHref`/`switchLabel` and always renders a cross-link paragraph — there's no "switch mode" concept for creating a heist and nothing to link to. Rather than stretching an already-shipped, fully-tested auth-specific component to serve an unrelated flow, `FormCard` is a small sibling shell with the same `.form`/`.error`/`.success` structure minus the switch-link. Its CSS module duplicates ~15 lines from `AuthForm.module.css`, which is consistent with CLAUDE.md's "styles live with the component that owns the markup."

## New/changed files

**`types/firestore/user.ts`** (new)
- `UserProfile { id: string; codename: string }` — matches the doc shape already written by `lib/auth/signUp.ts:47` (`{ id: user.uid, codename }`).
- `userProfileConverter` following the exact `heistConverter` pattern (`toFirestore: (data) => data`, `fromFirestore` spreads snapshot data + id).
- Named `UserProfile`, not `User`: the firestore-schemas skill's convention would say `User`, but `lib/auth/types.ts` already exports a `User` type (`{ uid, email, displayName }`, the Firebase-Auth-derived shape from `useUser()`) — and `CreateHeistForm` needs both types in the same file. `UserProfile` avoids the collision.
- No `CreateUserProfileInput`/`UpdateUserProfileInput` — nothing writes/updates through this type yet; `signUp.ts`'s inline write stays as-is and is out of scope.

**`types/firestore/index.ts`** (edit)
- Add `export * from "./user"`.
- Add `USERS: "users"` to `COLLECTIONS` (currently only has `HEISTS`).

**`lib/users/listAssignableUsers.ts`** (new)
- `listAssignableUsers(excludeUid: string): Promise<UserProfile[]>` — `getDocs(collection(db, COLLECTIONS.USERS).withConverter(userProfileConverter))`, filters out `excludeUid`, sorts by codename.
- Fetches the whole collection rather than a `where` inequality query — simplest given the collection is expected to be small, and keeps "exclude self" as plain testable JS.
- Errors wrapped per the `lib/auth/signUp.ts` convention: try/catch, re-throw `new Error("We couldn't load your teammates. Please try again.", { cause })`.
- New `lib/users/` domain folder, mirroring how `lib/auth/` holds one file per operation.

**`lib/heists/createHeist.ts`** (new)
- `createHeist(params): Promise<void>` where `params` is title/description/createdBy/createdByCodename/assignedTo/assignedToCodename.
- Builds the full `CreateHeistInput`: `createdAt: serverTimestamp()`, `deadline: heistDeadlineFrom(new Date())` (client-side `Date`, per the existing comment in `types/firestore/heist.ts` — only a Cloud Function could derive it from the resolved server timestamp), `finalStatus: null`.
- Writes via plain `addDoc(collection(db, COLLECTIONS.HEISTS), input)` — **not** `.withConverter(heistConverter)`, since `heistConverter.toFirestore` is typed against `Partial<Heist>` (`createdAt`/`deadline` as `Date`), which isn't assignable from `CreateHeistInput`'s `FieldValue` `createdAt`. `CreateHeistInput` already matches the write shape 1:1 without a converter.
- Same try/catch/friendly-Error convention: `"We couldn't create that heist. Please try again."`.

**`components/FormCard/`** (new: `FormCard.tsx`, `FormCard.module.css`, `index.ts`)
- Stateless, props: `submitLabel, onSubmit, error?, success?, submitting?, children`. Same render structure as `AuthForm` minus the switch-link.

**`components/TextAreaField/`** (new: `TextAreaField.tsx`, `TextAreaField.module.css`, `index.ts`)
- Mirrors `TextField.tsx` exactly (`"use client"`, `useId()`, `.field > label + .control > textarea`), props: `label, name, value, onChange, rows?` (default 4). Reuses `TextField.module.css`'s class names/tokens, adding `resize-y` for the textarea.

**`components/SelectField/`** (new: `SelectField.tsx`, `SelectField.module.css`, `index.ts`)
- Generic control (not assignee-specific), same wrapper/label/control shape as `TextField`. Props: `label, name, value, onChange, options: { value, label }[], placeholder?`. Renders a disabled placeholder `<option>` first. `CreateHeistForm` owns mapping `UserProfile[]` → options and resolving the selected uid back to a codename — `SelectField` knows nothing about heists or users, matching "TextField stays controlled by its parent."

**`components/CreateHeistForm/`** (new: `CreateHeistForm.tsx`, `index.ts`)
- `"use client"`, owns all state (title, description, assignedTo, assignees list, usersLoading, usersError, isSubmitting, error).
- `const { user } = useUser()` — treated as non-null without a guard clause, since `app/(dashboard)/layout.tsx` already wraps every dashboard route in `<AuthGuard>`, which itself blocks on `<Loader/>` until `user` is guaranteed present.
- On mount (effect keyed on `user.uid`): calls `listAssignableUsers(user.uid)`, populates `assignees` or `usersError`, guarded against a race with a `cancelled` flag on cleanup.
- While `usersLoading`: renders `<Loader />` only (full-view, same as `AuthGuard`'s use). If `usersError`: renders a standalone `role="alert"` paragraph instead of the form — no one to assign to, so no form is useful.
- Otherwise renders `FormCard` wrapping `TextField` (title), `TextAreaField` (description), `SelectField` (assignee, options from `assignees`, placeholder text differs if the list is empty).
- Submit: trims title/description, resolves the selected `UserProfile` by id; if any of title/description/assignee is missing, sets `error` to `"Title, description, and an assignee are all required."` and returns without writing. Otherwise sets `isSubmitting`, calls `createHeist({ ...trimmed fields, createdBy: user.uid, createdByCodename: user.displayName ?? "", assignedTo: assignee.id, assignedToCodename: assignee.codename })`, and on success `router.push("/heists")` (submitting deliberately left `true`, matching `SignupForm`'s "the page is on its way out" comment). On failure: `setError`, `setIsSubmitting(false)`.

**`app/(dashboard)/heists/create/page.tsx`** (edit)
- Stays a server component, no `"use client"`. Same shape as `app/(public)/signup/page.tsx`: `center-content > page-content > h2.form-title + <CreateHeistForm />`.

## Loading & error handling summary

- **Initial users fetch**: full-view `<Loader />`, same convention as `AuthGuard`/`PublicGuard`.
- **Submit-time pending**: no inline spinner convention exists anywhere in the repo — follows `SignupForm`'s pattern of disabling `SubmitButton` via `submitting` alone.
- **Users-fetch failure**: `role="alert"` message in place of the form.
- **Write failure**: `role="alert"` message inside `FormCard`, button re-enabled, no navigation.
- **Missing fields**: same `role="alert"` path, blocked before any write.

## Tests to add

- `tests/types/firestore/user.test.ts` — `userProfileConverter.fromFirestore`/`toFirestore`, mirroring `tests/types/firestore/heist.test.ts`.
- `tests/lib/users/listAssignableUsers.test.ts` — mocks `firebase/firestore`/`@/lib/firebase/config` via `vi.hoisted`, asserts self-exclusion, sort order, and the friendly-error wrap on an SDK throw.
- `tests/lib/heists/createHeist.test.ts` — mocks `addDoc`/`collection`/`serverTimestamp`, asserts the written object matches `CreateHeistInput`'s shape (including `deadline` ≈ 48h out and `finalStatus: null`), and the friendly-error wrap on an SDK throw.
- `tests/components/FormCard.test.tsx` — mirrors `tests/components/AuthForm.test.tsx` minus switch-link assertions.
- `tests/components/TextAreaField.test.tsx` — mirrors `tests/components/TextField.test.tsx`.
- `tests/components/SelectField.test.tsx` — label association, renders options, `onChange` via `userEvent.selectOptions`.
- `tests/components/CreateHeistForm.test.tsx` — mocks `@/hooks/useUser` the same way `tests/components/AuthGuard.test.tsx` does (`vi.mock("@/hooks/useUser", () => ({ default: useUser }))`), plus `@/lib/heists/createHeist`, `@/lib/users/listAssignableUsers`, and `next/navigation`. Covers: loader while fetching, form renders with no fields for the programmatic values, assignee options exclude the current user, valid submit calls `createHeist` with the right shape and redirects to `/heists`, missing-field submit blocks and shows the alert without writing, a rejected write shows the alert without redirecting and re-enables the button.

## Verification

1. `npm run dev`, sign in, visit `/heists/create` — confirm the loader shows briefly then the form renders with title/description/assignee fields (assignee options populated from real `users` docs, excluding self).
2. Submit with a field missing — confirm the alert shows and no Firestore doc is created (check the Firebase console/emulator).
3. Submit a valid form — confirm a new `heists` doc appears with the correct field shape (`createdAt` a Timestamp, `deadline` ~48h later, `finalStatus: null`) and the browser navigates to `/heists`.
4. `npx vitest run tests/components/CreateHeistForm.test.tsx tests/components/FormCard.test.tsx tests/components/TextAreaField.test.tsx tests/components/SelectField.test.tsx tests/lib/heists/createHeist.test.ts tests/lib/users/listAssignableUsers.test.ts tests/types/firestore/user.test.ts`
5. `npx tsc --noEmit` (no typecheck script exists) and `npm run lint` (expect the pre-existing, unrelated `heists/page.tsx` apostrophe failure only).
