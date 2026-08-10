# Plan: Login Firebase Auth Integration

Spec: `_specs/login-firebase-auth.md` · Branch: `claude/feature/login-firebase-auth` (already checked out)

## Context

`LoginForm` is currently a stub — it `console.log`s `{ email, password }` on submit and does nothing else. The sibling `SignupForm` feature was already wired to real Firebase Auth (account creation), and this feature mirrors that same shape for sign-in: call Firebase, show success/error state, guard against double-submit. The one behavioral difference from signup is that login does **not** redirect — the user stays on `/login` and sees a success message instead, per the spec's explicit "no redirect needed" requirement.

Because signup already established every pattern this needs (error-mapping helper, controlled-form state machine, disabled-while-submitting, test mocking approach), this plan is almost entirely "do the same thing signup did, minus the redirect, plus a success message."

## Changes

### 1. `lib/auth/signIn.ts` (new)

Mirror `lib/auth/signUp.ts`'s shape (try/catch around the Firebase call, `error.code` → friendly message lookup, generic fallback, re-throw as `new Error(message, { cause })`), minus the post-auth profile/Firestore phase — login has no second step.

```ts
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase/config"

const SIGN_IN_FALLBACK_MESSAGE =
  "We couldn't log you in. Please check your details and try again."

// Modern Firebase Auth projects (email enumeration protection on, the
// default) collapse "no such user" and "wrong password" into one
// auth/invalid-credential code. Legacy per-case codes are kept as a
// fallback in case that protection is ever off for this project.
const SIGN_IN_ERROR_MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "That email or password doesn't match our records.",
  "auth/user-not-found": "That email or password doesn't match our records.",
  "auth/wrong-password": "That email or password doesn't match our records.",
  "auth/invalid-email": "That doesn't look like a valid email address.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
}

function messageForSignInError(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error ? String(error.code) : undefined

  return (code && SIGN_IN_ERROR_MESSAGES[code]) || SIGN_IN_FALLBACK_MESSAGE
}

export async function signIn(email: string, password: string): Promise<void> {
  try {
    await signInWithEmailAndPassword(auth, email, password)
  } catch (cause) {
    throw new Error(messageForSignInError(cause), { cause })
  }
}
```

A successful sign-in needs no explicit follow-up: `AuthProvider`'s existing `onAuthStateChanged` subscription (backing `hooks/useUser`) picks up the new session automatically.

### 2. `components/AuthForm/AuthForm.tsx` + `AuthForm.module.css` (additive)

Add a `success?: string | null` prop, rendered the same way `error` is but with `role="status"` (not `alert` — it's not urgent) and a new `.success` class:

```tsx
type AuthFormProps = {
  // ...unchanged
  error?: string | null
  success?: string | null
  submitting?: boolean
  children: ReactNode
}
```

```tsx
{error && <p className={styles.error} role="alert">{error}</p>}
{success && <p className={styles.success} role="status">{success}</p>}
```

```css
.success {
  @apply text-center text-sm text-success;
}
```

`app/globals.css` already defines `--color-success` (currently unused), so `text-success` is already a valid Tailwind utility. This is 100% additive — `SignupForm` never passes `success`, so its rendering is unaffected.

### 3. `components/LoginForm/LoginForm.tsx` (rewrite handler)

Same state/handler shape as `SignupForm`, adapted for "no redirect, stay on page":

```tsx
"use client"

import { useState, type FormEvent } from "react"

// components
import AuthForm from "@/components/AuthForm"
import TextField from "@/components/TextField"
import PasswordField from "@/components/PasswordField"

// auth
import { signIn } from "@/lib/auth/signIn"

const SUCCESS_MESSAGE = "You're logged in."

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isSubmitting) return

    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      await signIn(email, password)
      setSuccess(SUCCESS_MESSAGE)
      setIsSubmitting(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
      setIsSubmitting(false)
    }
  }

  return (
    <AuthForm
      submitLabel="Log In"
      switchPrompt="Don't have an account?"
      switchHref="/signup"
      switchLabel="Sign up"
      onSubmit={handleSubmit}
      error={error}
      success={success}
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
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
      />
    </AuthForm>
  )
}
```

Judgment calls, made explicit:
- **Re-enable the submit button after success** (`setIsSubmitting(false)`). Signup leaves it disabled because the page is navigating away; login stays put, so leaving it disabled forever would strand the user. This also covers the spec's edge case of the user submitting again while already signed in.
- **Don't clear the email/password fields on success.** No existing pattern to copy (signup never stays on the page long enough for this to matter). Clearing a successfully-submitted pair reads more like "it reset" than "it worked." Easy one-line change later if a reviewer wants clear-on-success instead.
- Both `error` and `success` are reset at the start of every submit, so a stale message from a prior attempt never lingers next to a new one.
- Success copy (`"You're logged in."`) is a placeholder — the spec doesn't specify exact wording.

### 4. `tests/components/LoginForm.test.tsx` (rewrite auth-related cases)

Mirror `tests/components/SignupForm.test.tsx`'s structure (`vi.hoisted` mock, `deferred()` helper for in-flight state, `fireEvent.submit` for the double-submit guard). Key difference: **no `next/navigation` mock** — `LoginForm` never imports `useRouter`.

Keep as-is (unrelated to auth):
- `renders labelled email and password fields`
- `renders a Log In submit button`
- `links across to the signup page`
- `masks the password field on initial render`
- `preserves the typed password when toggling visibility`

Update:
- `does not submit when the visibility toggle is clicked` — currently spies on `console.log`; switch to asserting the new `signIn` mock was not called (there's no `console.log` left in `LoginForm` after the rewrite).

Remove:
- `logs the entered email and password on submit`
- `still logs when both fields are empty`

Add:
```ts
const { signIn } = vi.hoisted(() => ({ signIn: vi.fn() }))
vi.mock("@/lib/auth/signIn", () => ({ signIn }))
```
- `beforeEach`: `vi.resetAllMocks(); signIn.mockResolvedValue(undefined)`
- `"signs the user in with what they typed"` — types email/password, submits, asserts `signIn` called with `(email, password)`.
- `"shows a success message and stays on the page"` — successful sign-in → `await screen.findByRole("status")` has success text, **and** the email textbox is still present (positive proof of "still on the login form," since there's no router mock to assert against here the way signup asserts `push` was/wasn't called).
- `"shows why login failed and shows no success message"` — `signIn.mockRejectedValue(...)`, assert `await screen.findByRole("alert")` has the message, and `queryByRole("status")` is absent.
- `"lets the user try again after a failure"` — after a rejected sign-in, submit button re-enables.
- `"re-enables the submit button after a successful login"` — the one behavioral divergence from signup (which leaves it disabled), so it gets its own explicit test.
- `"disables the submit button while logging in"` — `deferred()` pattern.
- `"ignores a second submit while one is already in flight"` — `deferred()` + `fireEvent.submit`, assert `signIn` called exactly once.

### 5. `tests/components/AuthForm.test.tsx` (add two cases)

Mirror the existing error-prop pair:
```ts
it("shows the success message it is given", () => {
  render(<AuthForm {...shellProps} success="You're logged in.">{null}</AuthForm>)
  expect(screen.getByRole("status")).toHaveTextContent("You're logged in.")
})

it("shows no success message by default", () => {
  render(<AuthForm {...shellProps}>{null}</AuthForm>)
  expect(screen.queryByRole("status")).not.toBeInTheDocument()
})
```

## Sequencing

1. `lib/auth/signIn.ts` — standalone, no dependents.
2. `AuthForm.tsx` + `AuthForm.module.css` — additive; confirm `SignupForm`'s existing tests still pass unchanged.
3. `AuthForm.test.tsx` — add the two new success-prop cases.
4. `LoginForm.tsx` — rewrite handler (depends on 1 and 2).
5. `LoginForm.test.tsx` — full rewrite of auth-related cases (depends on 4).

## Verification

- `npx vitest run tests/components/LoginForm.test.tsx tests/components/AuthForm.test.tsx tests/components/SignupForm.test.tsx` — confirm new/updated tests pass and signup's suite is untouched by the `AuthForm` change.
- `npx tsc --noEmit` — no typecheck script exists per CLAUDE.md, run this directly.
- `npm run dev`, then manually exercise `/login`: submit with a real registered test account (correct password) and confirm the success message appears with no navigation; submit with a wrong password and confirm the error message appears; confirm the button disables during submission and a rapid double-click/Enter doesn't fire two sign-in calls.
- `npm run lint` — note the pre-existing unrelated failure in `app/(dashboard)/heists/page.tsx` called out in CLAUDE.md; don't attribute it to this change.
