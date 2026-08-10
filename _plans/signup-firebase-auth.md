# Plan: Signup Firebase Auth Integration

## Context

`SignupForm` currently just `console.log`s the entered email/password on submit — a placeholder stub, per `_specs/signup-firebase-auth.md`. This feature wires it to real Firebase Authentication using the already-initialized `auth`/`db` exports in `lib/firebase/config.ts`. On success it also assigns the new user a randomly generated "codename" display name (one word from each of three distinct word lists, PascalCase-joined), records that codename in a Firestore `users` collection keyed by uid (without ever writing the user's email), and sends them into the app at `/heists`. On failure it shows an inline error instead of failing silently. `LoginForm` is explicitly out of scope and keeps its current stub.

All open questions from the spec are resolved: Firestore doc ID = the user's `uid`; redirect target = `/heists` (confirmed unguarded — `app/(dashboard)/layout.tsx` just renders `<Navbar/>` + children, no auth-gate logic); word lists are an open set, chosen here; errors render as an inline message under the form's fields, above the submit button.

## Architecture

1. **`lib/codename/generateCodename.ts`** — pure word-list generator, no Firebase dependency. Three disjoint, pre-capitalized word-list consts plus a function that picks one word from each and concatenates them. Takes an injectable random source (default `Math.random`) so tests can force deterministic output.
2. **`lib/auth/signUp.ts`** — orchestrates the Firebase flow: create the Auth account, generate a codename, set it as `displayName`, write the Firestore doc. Mirrors the existing pattern of keeping Firebase logic in `lib/` rather than inside components (see `components/AuthProvider` + `lib/auth/AuthContext.ts`). Throws a plain `Error` with a phase-aware message on failure so the component doesn't need to know *why* it failed, just what to show. For account-creation failures specifically, a small lookup table maps Firebase's known error `.code`s (`auth/email-already-in-use`, `auth/weak-password`, `auth/invalid-email`) to specific, user-facing messages, falling back to a generic message for any other/unrecognized code — not a full error-taxonomy system, just the three codes asked for plus a safe default.
3. **`components/SignupForm/SignupForm.tsx`** — gains `isSubmitting`/`error` state and calls `signUp`. On success, `useRouter().push("/heists")` (first use of `next/navigation` in this codebase). On failure, shows the thrown error's message and re-enables the form.
4. **`components/AuthForm/AuthForm.tsx`** — gains optional `error` and `submitting` props (still stateless — parent-owned values passed through) to render an inline alert and disable the submit button. `LoginForm` doesn't pass these props, so its behavior is unchanged.
5. **`components/SubmitButton/SubmitButton.tsx`** — gains a `disabled` prop, threaded to the native `<button disabled>` attribute. Stays directive-free.

This keeps Firebase orchestration and the codename algorithm independently unit-testable (no component mounting required), and keeps `AuthForm`/`SubmitButton` as thin, reusable, stateless pieces per CLAUDE.md's form-composition rules.

## File Structure

```
lib/
  codename/
    generateCodename.ts     # new — word lists + generator
  auth/
    signUp.ts                # new — Firebase orchestration
    types.ts                  # existing — unchanged
    AuthContext.ts             # existing — unchanged
  firebase/
    config.ts                   # existing — auth, db exports, unchanged

components/
  SignupForm/
    SignupForm.tsx               # changed — real submit flow
  AuthForm/
    AuthForm.tsx                  # changed — error + submitting props
    AuthForm.module.css            # changed — .error class
  SubmitButton/
    SubmitButton.tsx                 # changed — disabled prop
    SubmitButton.module.css           # changed — :disabled styling

tests/
  lib/
    codename/
      generateCodename.test.ts        # new
    auth/
      signUp.test.ts                   # new
  components/
    SignupForm.test.tsx                 # changed
    AuthForm.test.tsx                    # changed
    SubmitButton.test.tsx                 # changed
```

## Files to add / change

**`lib/codename/generateCodename.ts`** (new)
```ts
type RandomSource = () => number

// Pre-capitalized; PascalCase concatenation is just a join, no runtime capitalize() needed.
export const STEALTH_ADJECTIVES = [
  "Silent", "Sly", "Swift", "Covert", "Cunning", "Shadowy", "Sneaky", "Elusive", "Masked", "Nimble",
] as const

export const HEIST_NOUNS = [
  "Shadow", "Midnight", "Phantom", "Vault", "Whisper", "Smoke", "Mirage", "Echo", "Twilight", "Heist",
] as const

export const AGENT_ANIMALS = [
  "Fox", "Wolf", "Raven", "Viper", "Falcon", "Panther", "Cobra", "Jackal", "Hawk", "Lynx",
] as const

function pick(list: readonly string[], random: RandomSource): string {
  return list[Math.floor(random() * list.length)]
}

export function generateCodename(random: RandomSource = Math.random): string {
  return pick(STEALTH_ADJECTIVES, random) + pick(HEIST_NOUNS, random) + pick(AGENT_ANIMALS, random)
}
```

**`lib/auth/signUp.ts`** (new)
```ts
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"

import { auth, db } from "@/lib/firebase/config"
import { generateCodename } from "@/lib/codename/generateCodename"

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/email-already-in-use": "That email is already registered. Try logging in instead.",
  "auth/weak-password": "Your password must be at least 6 characters.",
  "auth/invalid-email": "That doesn't look like a valid email address.",
}

function messageForCreationError(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : undefined
  return (code && AUTH_ERROR_MESSAGES[code]) ?? "We couldn't create your account. Please check your details and try again."
}

export async function signUp(email: string, password: string): Promise<void> {
  let user

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    user = credential.user
  } catch (cause) {
    throw new Error(messageForCreationError(cause), { cause })
  }

  const codename = generateCodename()

  try {
    await updateProfile(user, { displayName: codename })
    await setDoc(doc(db, "users", user.uid), { id: user.uid, codename })
  } catch (cause) {
    throw new Error(
      "Your account was created, but we couldn't finish setting up your profile. Please try again or contact support.",
      { cause }
    )
  }
}
```
Known accepted limitation: if a user retries after this second failure mode, the retry fails at account creation ("email already in use") and shows the first message instead of a partial-failure-specific one. Not fixed in this pass — no rollback/retry system is being built for this.

**`components/SignupForm/SignupForm.tsx`** (change)
```tsx
"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"

// components
import AuthForm from "@/components/AuthForm"
import TextField from "@/components/TextField"
import PasswordField from "@/components/PasswordField"

// auth
import { signUp } from "@/lib/auth/signUp"

export default function SignupForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    try {
      await signUp(email, password)
      router.push("/heists") // isSubmitting intentionally left true — page is navigating away
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
      setIsSubmitting(false)
    }
  }

  return (
    <AuthForm
      submitLabel="Sign Up"
      switchPrompt="Already have an account?"
      switchHref="/login"
      switchLabel="Log in"
      onSubmit={handleSubmit}
      error={error}
      submitting={isSubmitting}
    >
      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={setEmail}
      />

      <PasswordField
        label="Password"
        name="password"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
      />
    </AuthForm>
  )
}
```

**`components/AuthForm/AuthForm.tsx`** (change) — add `error`/`submitting` props, render alert before `SubmitButton`, pass `submitting` through as `disabled`:
```tsx
type AuthFormProps = {
  submitLabel: string
  switchPrompt: string
  switchHref: string
  switchLabel: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  error?: string | null
  submitting?: boolean
  children: ReactNode
}

export default function AuthForm({
  submitLabel,
  switchPrompt,
  switchHref,
  switchLabel,
  onSubmit,
  error,
  submitting,
  children,
}: AuthFormProps) {
  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {children}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <SubmitButton disabled={submitting}>{submitLabel}</SubmitButton>

      <p className={styles.switchMode}>
        {switchPrompt} <Link href={switchHref}>{switchLabel}</Link>
      </p>
    </form>
  )
}
```

**`components/AuthForm/AuthForm.module.css`** (change) — add:
```css
.error {
  @apply text-center text-sm text-error;
}
```

**`components/SubmitButton/SubmitButton.tsx`** (change):
```tsx
type SubmitButtonProps = {
  children: ReactNode
  disabled?: boolean
}

export default function SubmitButton({ children, disabled = false }: SubmitButtonProps) {
  return (
    <button type="submit" className={`btn ${styles.submit}`} disabled={disabled}>{children}</button>
  )
}
```

**`components/SubmitButton/SubmitButton.module.css`** (change) — add:
```css
.submit:disabled {
  @apply cursor-not-allowed opacity-60;
}
```

## Tests

Follows the existing Firebase-mock convention from `tests/hooks/useUser.test.tsx` / `tests/components/AuthProvider.test.tsx` (`vi.hoisted` + `vi.mock("firebase/auth", ...)`), extended to also cover `updateProfile`, `firebase/firestore`'s `doc`/`setDoc`, and `@/lib/firebase/config` returning `{ auth: {}, db: {} }`.

**`tests/lib/codename/generateCodename.test.ts`** (new):
- injected random source returning `0` → first word of each list, concatenated, no separator.
- injected random source returning just under `1` (e.g. `0.999999`) → last word of each list.
- no random source passed → falls back to `Math.random` (spy it, assert same shape as the `0` case).
- the three exported word lists are pairwise disjoint (`Set` intersections empty).
- each exported list has at least 8 entries.

**`tests/lib/auth/signUp.test.ts`** (new) — mock `firebase/auth`, `firebase/firestore`, `@/lib/firebase/config`, `@/lib/codename/generateCodename`:
- calls `createUserWithEmailAndPassword(auth, email, password)`.
- calls `updateProfile(user, { displayName: <generated codename> })`.
- calls `doc(db, "users", uid)` and `setDoc(docRef, { id: uid, codename })`; asserts the payload has no `email` key.
- resolves (no throw) when all three Firebase calls succeed.
- rejects with "That email is already registered..." when `createUserWithEmailAndPassword` rejects with `{ code: "auth/email-already-in-use" }`.
- rejects with the weak-password message when the rejection has `{ code: "auth/weak-password" }`.
- rejects with the invalid-email message when the rejection has `{ code: "auth/invalid-email" }`.
- rejects with the generic fallback message when the rejection has an unrecognized or missing `code`.
- in every account-creation failure case, `updateProfile`/`setDoc` are never called.
- rejects with the partial-failure message and never calls `setDoc` when `updateProfile` rejects (proves sequential ordering).
- rejects with the partial-failure message when `setDoc` rejects after `updateProfile` succeeded.

**`tests/components/SignupForm.test.tsx`** (change) — keep the 4 existing field/button/link/mask tests untouched; mock `@/lib/auth/signUp` and `next/navigation`'s `useRouter`; replace the 2 `console.log` tests with:
- submit calls `signUp` with the entered email and password.
- on `signUp` resolving, `router.push("/heists")` is called.
- on `signUp` rejecting, the error message renders (query by `role("alert")`) and `push` is never called.
- the submit button is disabled while a request is in flight (use a manually-resolvable/deferred promise from the `signUp` mock to assert mid-flight state before resolving).
- a second submit while one is already in flight does not call `signUp` again.

**`tests/components/AuthForm.test.tsx`** (change) — add:
- renders the error message (`role("alert")`) when an `error` prop is given.
- renders no alert when `error` is omitted or `null`.
- disables the submit button when `submitting` is `true`.
- leaves the submit button enabled when `submitting` is omitted or `false`.

**`tests/components/SubmitButton.test.tsx`** (change) — add:
- enabled by default when no `disabled` prop is passed.
- disabled (`toBeDisabled()`) when `disabled` is `true`.
- a disabled button does not trigger the surrounding form's submit handler when clicked.

## Build order

1. `lib/codename/generateCodename.ts` + `tests/lib/codename/generateCodename.test.ts`
2. `lib/auth/signUp.ts` + `tests/lib/auth/signUp.test.ts`
3. `components/SubmitButton/SubmitButton.tsx` + `.module.css` + `tests/components/SubmitButton.test.tsx`
4. `components/AuthForm/AuthForm.tsx` + `.module.css` + `tests/components/AuthForm.test.tsx`
5. `components/SignupForm/SignupForm.tsx` + `tests/components/SignupForm.test.tsx`

## Verification

- `npx vitest run` — all new and modified test files pass, no regressions elsewhere.
- `npx tsc --noEmit` — no type errors (no dedicated typecheck script exists).
- `npm run lint` — confirm no new lint errors (the pre-existing `heists/page.tsx` apostrophe failure is unrelated and expected, per CLAUDE.md).
- Manual: `npm run dev`, visit `/signup`, submit with a fresh email/password → redirected to `/heists`; confirm via Firebase console (or the `mcp__firebase__firestore_get_document` tool) that `users/<uid>` exists with `{ id, codename }` and no `email` field, and that the Auth user's `displayName` is set. Retry with the same email → inline error appears under the fields, submit button re-enables, no redirect.

## Out of scope (confirmed, no changes)
`components/LoginForm/*`, `lib/auth/types.ts`, `lib/auth/AuthContext.ts`, `hooks/useUser/*`, `app/(public)/signup/page.tsx`, `app/(dashboard)/heists/page.tsx`, `app/(dashboard)/layout.tsx`.
