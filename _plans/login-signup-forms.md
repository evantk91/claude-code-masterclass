# Plan for login-signup-forms

spec: `_specs/login-signup-forms.md`
branch: `claude/feature/login-signup-forms`

## Context

`/login` and `/signup` currently render a heading and nothing else — no form at all. This implements the spec at `_specs/login-signup-forms.md`: a single shared, mode-driven form component used by both pages, with an email field, a password field with a show/hide toggle, and a submit button whose label follows the mode.

There is no auth backend and none is in scope. Submitting logs the credentials to the console and does nothing else — no network request, no redirect, no session. This is deliberately a UI-only slice so the visual and interaction layer can be reviewed ahead of real auth.

Per the spec's resolved questions: **no validation** (not even `required`), no confirm-password field, no loading/disabled state, no error display, no Figma to match.

This will be the **first client component and first hook usage in the repo** — every existing component is a server component.

## Files

**Create**
- `components/AuthForm/AuthForm.tsx`
- `components/AuthForm/AuthForm.module.css`
- `components/AuthForm/index.ts`
- `tests/components/AuthForm.test.tsx`

**Modify**
- `app/(public)/login/page.tsx`
- `app/(public)/signup/page.tsx`
- `app/(public)/preview/page.tsx`

No dependency, config, or `globals.css` changes. `lucide-react@0.556.0` (ships `Eye`/`EyeOff`) and `@testing-library/user-event@14.6.1` are already installed.

## Conventions to match

From `components/Navbar/` and `components/Skeleton/`:
- No semicolons, double quotes, 2-space indent, default-exported function components.
- Barrel is exactly `export { default } from "./AuthForm"` — the repo has zero named exports.
- CSS module line 1 is `@reference "../../app/globals.css";` then a blank line, camelCase selectors, `@apply` only.
- Multiple module classes compose via template literal, as in `Skeleton.tsx:9` — `` className={`${styles.input} ${styles.passwordInput}`} ``.

## Component design

**`AuthForm.tsx`** — `"use client"` as the very first line, above all imports (directives must precede imports).

Types declared locally, not exported:
```tsx
type AuthMode = "login" | "signup"
type AuthFormProps = { mode: AuthMode }
```

All mode-varying content goes in one module-scope lookup table — this is the concrete mechanism for the spec's "one place to change form behaviour":
```tsx
const modeConfig: Record<AuthMode, {
  submitLabel: string
  switchHref: string
  switchPrompt: string
  switchLabel: string
}>
```
- login → `"Log In"`, `/signup`, `"Don't have an account?"`, `"Sign up"`
- signup → `"Sign Up"`, `/login`, `"Already have an account?"`, `"Log in"`

Keeping copy in JS strings also sidesteps `react/no-unescaped-entities` on the apostrophe in "Don't" (that rule only fires on JSX text children).

**State**: controlled inputs — `useState<string>` for `email` and `password`, `useState<boolean>` for `showPassword`. The submit handler closes over the values, so the log is exact and tests assert `toHaveBeenCalledWith({ email, password })` with no coercion. Empty-submit falls out naturally as `{ email: "", password: "" }`. (`FormData` would need `String(...)` casts under `strict`.)

**Submit handler**: `event.preventDefault()`, then a single `console.log({ email, password })`, marked with `// TODO: temporary stub — remove when real auth lands; never log credentials in production`. Nothing else. (`no-console` is not enabled in this ESLint config, so no disable comment is needed.)

**Markup / accessibility** — the queries drive the markup, since tests are role-based:

| Element | Markup | Test query |
|---|---|---|
| Form | `<form noValidate onSubmit={...}>` | — |
| Email | `<label htmlFor={emailId}>Email</label>` + `<input id={emailId} type="email">` | `getByRole("textbox", { name: /email/i })` |
| Password | `<label htmlFor={passwordId}>Password</label>` + `<input id={passwordId} type={showPassword ? "text" : "password"}>` | `getByLabelText("Password")` — exact string |
| Toggle | `<button type="button" aria-label={showPassword ? "Hide password" : "Show password"}>` wrapping `<Eye aria-hidden />` / `<EyeOff aria-hidden />` | `getByRole("button", { name: /show password/i })` |
| Submit | `<button type="submit" className={\`btn ${styles.submit}\`}>` | `getByRole("button", { name: "Log In" })` |
| Cross-link | `<p>{switchPrompt} <Link href={switchHref}>{switchLabel}</Link></p>` | `getByRole("link", …)` + `toHaveAttribute("href", …)` |

Use `useId()` for the input ids (`` const emailId = `${id}-email` ``) — `/preview` renders two `AuthForm`s on one page, so hardcoded ids would collide and mis-associate labels.

Pages stay **server components**; they pass only a string literal, which crosses the boundary fine. The barrel `index.ts` stays a plain re-export with no directive.

## Styling

`AuthForm.module.css` — a centered narrow card, matching the `bg-lighter rounded-xl` idiom already used by `Skeleton.module.css`. Necessary because `.page-content` is `w-6xl min-w-2xl`, far too wide for a form.

- `.form` — `flex flex-col gap-5`, `mx-auto max-w-sm w-full`, `bg-lighter rounded-xl p-8 mt-6`
- `.field` — `flex flex-col gap-2`
- `.label` — `text-sm font-medium text-heading`
- `.input` — `w-full min-w-0 rounded-md bg-light px-3 py-2 text-heading`, subtle border, focus ring on `--color-primary`. The `w-full min-w-0` pair is what keeps very long values from breaking layout.
- `.passwordField` — `relative`, positioning context for the toggle
- `.passwordInput` — `pr-10`, composed alongside `.input`
- `.toggle` — `absolute right-2 top-1/2 -translate-y-1/2`, `text-body hover:text-primary`, focus-visible ring
- `.submit` — `w-full text-center mt-2`, combined with the global `.btn` (which is `inline-block`, so `w-full` is what stretches it; only `styles.*` names get hashed, so mixing global and module classes is safe)
- `.switchMode` — `text-sm text-center text-body`, nested `a` in `text-primary hover:text-secondary underline`

Set `text-center` explicitly on `.submit` and `.switchMode` — `.center-content` sets `text-justify`, which inherits in.

`--color-error` stays unused, per spec.

## Page wiring

Both pages keep their existing `center-content` / `page-content` / `form-title` wrappers and their current headings unchanged. `<AuthForm mode="login" />` (resp. `"signup"`) goes in as a sibling of the `<h2>` inside `.page-content`.

Also rename the misnamed `SignupPage` function in `app/(public)/login/page.tsx:1` to `LoginPage` — Next resolves pages by default export, the identifier is referenced nowhere else, and we're editing that file anyway. Leave the headings alone.

**Preview page**: keep the `Skeleton` grid untouched, append a stacked section below it with both modes under small `<h3>` labels, using inline Tailwind (`mt-8 flex flex-col gap-8`) as that page already does. Rendering both at once is exactly what exercises the `useId()` decision.

## Tests

`tests/components/AuthForm.test.tsx`, following `tests/components/Navbar.test.tsx` — `@/components/AuthForm` alias import, explicit `vitest` imports despite `globals: true`, `// component imports` comment separating RTL from component imports.

Spy pattern: `vi.spyOn(console, "log").mockImplementation(() => {})` inside the tests that need it, with a single top-level `afterEach(() => { vi.restoreAllMocks() })` to restore the real `console.log`. Interactions via `userEvent.setup()` (default export).

Cases:
1–2. Renders labelled email + password fields, in each mode
3–4. Correct submit label per mode ("Log In" / "Sign Up")
5–6. Correct cross-link href per mode (`/signup` from login, `/login` from signup)
7. Password masked on initial render — `toHaveAttribute("type", "password")`
8. Toggle reveals (`type="text"`, button renamed to "Hide password") then re-masks
9. Typed password value survives toggling — `toHaveValue(...)`, catches an accidental remount
10. Clicking the toggle does not submit — spy not called
11. Submit logs email + password
12. Empty submit still logs `{ email: "", password: "" }`

## Gotchas

1. **`type="button"` on the toggle is mandatory** — a bare `<button>` in a form defaults to `type="submit"`, so every toggle click would submit. Case 10 guards this.
2. **`noValidate` on the `<form>`** — without it, `type="email"` triggers native browser validation, which blocks submit and shows "Please enter an email address", contradicting the spec's "nothing blocks or warns". **jsdom does not implement this, so tests will not catch it** — verify in a real browser.
3. **`<input type="password">` has no ARIA role.** `getByRole("textbox", { name: /password/i })` fails while masked and passes once revealed — always query the password field by label.
4. **`getByLabelText(/password/i)` is ambiguous** — it also matches the toggle's `aria-label="Show password"`. Use the exact string `"Password"`.
5. **One input with a computed `type`.** Two conditionally-rendered inputs, or a `key` tied to `showPassword`, remounts and wipes the value/caret.
6. `getByRole("button")` unscoped matches two elements — always pass `name`.
7. Don't assert on lucide's generated svg classnames; the accessible name is the stable contract.
8. Visibility reset across `/login` ↔ `/signup` (spec edge case) should happen naturally via unmount — verify by hand. If it ever persists, the fix is `key={mode}` at the call site, not a `useEffect`.

## Verification

```bash
npx vitest run tests/components/AuthForm.test.tsx
npm run lint
npx tsc --noEmit
npm run dev
```

Then manually check `/login`, `/signup`, and `/preview`:
- Type into both fields, submit, confirm the console log and that the page does not reload.
- Submit empty — confirm it still logs and nothing blocks.
- **Submit a malformed email** (e.g. `abc`) — confirm no native browser validation bubble appears (gotcha 2, not covered by jsdom).
- Toggle visibility mid-typing — confirm the value and caret survive.
- Follow the cross-link both ways and confirm a revealed password resets to masked (gotcha 8, not covered by jsdom).
- On `/preview`, confirm both cards render and their password toggles operate independently.
