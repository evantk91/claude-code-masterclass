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
- `components/TextField/{TextField.tsx,TextField.module.css,index.ts}`
- `components/PasswordField/{PasswordField.tsx,PasswordField.module.css,index.ts}`
- `components/SubmitButton/{SubmitButton.tsx,SubmitButton.module.css,index.ts}`
- `components/AuthForm/{AuthForm.tsx,AuthForm.module.css,index.ts}`
- `components/LoginForm/{LoginForm.tsx,index.ts}` — no CSS module; all styling comes from the shell and fields
- `components/SignupForm/{SignupForm.tsx,index.ts}`
- `tests/components/{TextField,PasswordField,SubmitButton,AuthForm,LoginForm,SignupForm}.test.tsx`

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

Six components, each in its own directory with a barrel. `"use client"` is the first line of every one that owns state or an event handler (directives must precede imports); marking them individually keeps the field components usable from any future form rather than only inside a client tree. **`SubmitButton` is the exception** — it has neither, so it stays directive-free and works as a server component anywhere.

The split runs: pages → `LoginForm`/`SignupForm` (state + copy) → `AuthForm` (shell) → `TextField`/`PasswordField`/`SubmitButton` (controls).

**`TextField.tsx`** — generic labelled input. Owns `useId()` internally, so callers never manage ids and `/preview` can render several fields without collisions.
```tsx
type TextFieldProps = {
  label: string
  name: string
  value: string
  onChange: (value: string) => void
  type?: string          // defaults to "text"
  autoComplete?: string
  inputClassName?: string  // extra classes merged onto the input
  adornment?: ReactNode    // rendered inside the relative wrapper, after the input
}
```
`onChange` takes the string value, not the event — callers pass `setEmail` directly. The input always sits inside a `.control` wrapper so an adornment can position against it.

**`PasswordField.tsx`** — wraps `TextField`, owns `useState` for visibility, passes the toggle button as `adornment` and `pr-10` as `inputClassName`. The accessible name is derived (`` `${visible ? "Hide" : "Show"} ${label.toLowerCase()}` ``), which yields "Show password" / "Hide password" for `label="Password"`. Nothing above it knows visibility exists.

**`SubmitButton.tsx`** — `{ children: ReactNode }`, rendering `<button type="submit" className={\`btn ${styles.submit}\`}>`. Children rather than a `label` prop, so an icon can join the text later without a prop change. No state, no handler: the surrounding `<form>` owns submission.

**`AuthForm.tsx`** — presentational shell. Holds no state and renders no raw `<input>`, `<label>` or `<button>`; the fields arrive as `children`.
```tsx
type AuthFormProps = {
  submitLabel: string
  switchPrompt: string
  switchHref: string
  switchLabel: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  children: ReactNode
}
```
It owns the `<form noValidate>`, the card styling, the submit button and the cross-link paragraph.

**`LoginForm.tsx` / `SignupForm.tsx`** — one per page, structurally identical, each stating its own copy inline rather than looking it up:

| | `LoginForm` | `SignupForm` |
|---|---|---|
| `submitLabel` | `"Log In"` | `"Sign Up"` |
| `switchPrompt` | `"Don't have an account?"` | `"Already have an account?"` |
| `switchHref` / `switchLabel` | `/signup` / `"Sign up"` | `/login` / `"Log in"` |
| password `autoComplete` | `"current-password"` | `"new-password"` |

Keeping the copy in JSX *attributes* (not text children) sidesteps `react/no-unescaped-entities` on the apostrophe in "Don't" — that rule only fires on JSX text children.

**State**: controlled inputs — each form holds `useState<string>` for `email` and `password`; visibility state lives inside `PasswordField`; `AuthForm` holds none. The submit handler closes over the values, so the log is exact and tests assert `toHaveBeenCalledWith({ email, password })` with no coercion. Empty-submit falls out naturally as `{ email: "", password: "" }`. (`FormData` would need `String(...)` casts under `strict`.)

**Submit handler** (one per form): `event.preventDefault()`, then a single `console.log({ email, password })`, marked with `// TODO: temporary stub — remove when real auth lands; never log credentials in production`. Nothing else. (`no-console` is not enabled in this ESLint config, so no disable comment is needed.) This is the one genuinely duplicated block, and it disappears when real auth replaces it with two different calls.

**Markup / accessibility** — the queries drive the markup, since tests are role-based:

| Element | Owner | Markup | Test query |
|---|---|---|---|
| Form | `AuthForm` | `<form noValidate onSubmit={...}>` | — |
| Label + input | `TextField` | `<label htmlFor={id}>{label}</label>` + `<input id={id} type={type}>` inside `.control` | `getByRole("textbox", { name: /email/i })` |
| Password input | `PasswordField` → `TextField` | same, with `type={visible ? "text" : "password"}` | `getByLabelText("Password")` — exact string |
| Toggle | `PasswordField` | `<button type="button" aria-label={\`${visible ? "Hide" : "Show"} ${label.toLowerCase()}\`}>` wrapping `<Eye aria-hidden />` / `<EyeOff aria-hidden />` | `getByRole("button", { name: /show password/i })` |
| Submit | `SubmitButton` | `<button type="submit" className={\`btn ${styles.submit}\`}>` | `getByRole("button", { name: "Log In" })` |
| Cross-link | `AuthForm` | `<p>{switchPrompt} <Link href={switchHref}>{switchLabel}</Link></p>` | `getByRole("link", …)` + `toHaveAttribute("href", …)` |

`useId()` lives in `TextField`, one call per field instance — `/preview` renders both forms on one page, so hardcoded ids would collide and mis-associate labels.

Pages stay **server components**; they render `<LoginForm />` / `<SignupForm />` with no props at all, so nothing crosses the boundary. Every barrel `index.ts` stays a plain re-export with no directive.

## Styling

Styles sit with the component that owns the markup. Each module starts with `@reference "../../app/globals.css";`.

**`TextField.module.css`**
- `.field` — `flex flex-col gap-2`
- `.label` — `text-sm font-medium text-heading`
- `.control` — `relative`, the positioning context an adornment anchors to
- `.input` — `w-full min-w-0 rounded-md bg-light px-3 py-2 text-heading`, subtle border, `:focus` border on `--color-primary`. The `w-full min-w-0` pair is what keeps very long values from breaking layout.

**`PasswordField.module.css`**
- `.input` — `pr-10`, merged onto `TextField`'s `.input` via `inputClassName`
- `.toggle` — `absolute right-2 top-1/2 -translate-y-1/2`, `text-body hover:text-primary`

**`SubmitButton.module.css`**
- `.submit` — `w-full text-center mt-2`, combined with the global `.btn` (which is `inline-block`, so `w-full` is what stretches it; only `styles.*` names get hashed, so mixing global and module classes is safe)

**`AuthForm.module.css`** — a centered narrow card, matching the `bg-lighter rounded-xl` idiom already used by `Skeleton.module.css`. Necessary because `.page-content` is `w-6xl min-w-2xl`, far too wide for a form.
- `.form` — `flex flex-col gap-5`, `mx-auto max-w-sm w-full`, `bg-lighter rounded-xl p-8 mt-6`
- `.switchMode` — `text-sm text-center text-body`, nested `a` in `text-primary hover:text-secondary underline`

Styles compose across components because CSS Modules hashes each name independently — `` `${styles.input} ${inputClassName}` `` in `TextField` merges its own `.input` with `PasswordField`'s.

Set `text-center` explicitly on `.submit` and `.switchMode` — `.center-content` sets `text-justify`, which inherits in.

`--color-error` stays unused, per spec.

## Page wiring

Both pages keep their existing `center-content` / `page-content` / `form-title` wrappers and their current headings unchanged. `<LoginForm />` (resp. `<SignupForm />`) goes in as a sibling of the `<h2>` inside `.page-content`.

Also rename the misnamed `SignupPage` function in `app/(public)/login/page.tsx:1` to `LoginPage` — Next resolves pages by default export, the identifier is referenced nowhere else, and we're editing that file anyway. Leave the headings alone.

**Preview page**: keep the `Skeleton` grid untouched, append a stacked section below it with both forms under small `<h3>` labels, using inline Tailwind (`mt-8 flex flex-col gap-8`) as that page already does. Rendering both at once is exactly what exercises the `useId()` decision.

## Tests

One file per component under `tests/components/`, following `tests/components/Navbar.test.tsx` — `@/components/<Name>` alias import, explicit `vitest` imports despite `globals: true`, `// component imports` comment separating RTL from component imports. Test each component at its own level rather than re-testing field internals through `AuthForm`.

Spy pattern (AuthForm only): `vi.spyOn(console, "log").mockImplementation(() => {})` inside the tests that need it, with a single top-level `afterEach(() => { vi.restoreAllMocks() })` to restore the real `console.log`. Interactions via `userEvent.setup()` (default export).

**`TextField.test.tsx`** (5)
1. Label is associated with the input
2. Renders the given value and input type
3. Calls `onChange` with the new value as the user types — pass a `vi.fn()`; since `value` is controlled and never updates, type one character and assert `toHaveBeenCalledWith("a")`
4. Two instances get unique ids so labels do not cross-associate — the `useId()` guarantee
5. Renders an adornment alongside the input

**`PasswordField.test.tsx`** (3)
1. Masked on initial render — `toHaveAttribute("type", "password")`
2. Toggle reveals (`type="text"`, button renamed to "Hide password") then re-masks
3. Toggle is `type="button"`, so it cannot submit a surrounding form

**`SubmitButton.test.tsx`** (3)
1. Renders its children as the button label
2. Is a `type="submit"` button
3. Submits a surrounding `<form>` when clicked — render it inside one with a `vi.fn((event) => event.preventDefault())`

**`AuthForm.test.tsx`** (4) — the shell has no state, so drive it with a stub props object and a throwaway child
1. Renders its children as the form fields
2. Renders the given submit label
3. Renders the cross-link with the given href and label
4. Calls `onSubmit` when the submit button is clicked — `vi.fn((event) => event.preventDefault())`

**`LoginForm.test.tsx`** (8)
1. Renders labelled email + password fields
2. Renders a "Log In" submit button
3. Links across to `/signup`
4. Password masked on initial render
5. Typed password value survives toggling — `toHaveValue(...)`, catches an accidental remount
6. Clicking the toggle does not submit — spy not called
7. Submit logs email + password
8. Empty submit still logs `{ email: "", password: "" }`

**`SignupForm.test.tsx`** (6) — same shape, minus the toggle cases already covered by `PasswordField` and `LoginForm`
1. Renders labelled email + password fields
2. Renders a "Sign Up" submit button
3. Links across to `/login`
4. Password masked on initial render
5. Submit logs email + password
6. Empty submit still logs `{ email: "", password: "" }`

## Gotchas

1. **`type="button"` on the toggle is mandatory** — a bare `<button>` in a form defaults to `type="submit"`, so every toggle click would submit. Guarded by `PasswordField` case 3 and `LoginForm` case 6.
2. **`noValidate` on the `<form>`** — without it, `type="email"` triggers native browser validation, which blocks submit and shows "Please enter an email address", contradicting the spec's "nothing blocks or warns". **jsdom does not implement this, so tests will not catch it** — verify in a real browser.
3. **`<input type="password">` has no ARIA role.** `getByRole("textbox", { name: /password/i })` fails while masked and passes once revealed — always query the password field by label.
4. **`getByLabelText(/password/i)` is ambiguous** — it also matches the toggle's `aria-label="Show password"`. Use the exact string `"Password"`.
5. **One input with a computed `type`.** Two conditionally-rendered inputs, or a `key` tied to visibility, remounts and wipes the value/caret. `PasswordField` toggling `TextField`'s `type` prop is safe — same element position, so React only mutates the attribute.
6. **`TextField` must not own the value.** It stays controlled by its parent; giving it internal state would desync the form's log from what's on screen. Visibility is the opposite case — that belongs *inside* `PasswordField`, since nothing above it cares.
7. **`AuthForm` must stay stateless.** The moment it holds a value it stops being a shell and the two forms start fighting over who owns what.
8. `getByRole("button")` unscoped matches two elements — always pass `name`.
9. Don't assert on lucide's generated svg classnames; the accessible name is the stable contract.
10. Visibility reset across `/login` ↔ `/signup` (spec edge case) happens naturally — they're different components on different routes, so there is no shared instance to leak state. Still worth confirming by hand.
11. **`LoginForm` and `SignupForm` will drift.** That is the point of the split, but it also means a change meant for both (a new field, a layout tweak) has to be made twice unless it belongs in `AuthForm` or the field components. When in doubt, push it down.

## Verification

```bash
npx vitest run
npm run lint
npx tsc --noEmit
npm run dev
```

Then manually check `/login`, `/signup`, and `/preview`:
- Type into both fields, submit, confirm the console log and that the page does not reload.
- Submit empty — confirm it still logs and nothing blocks.
- **Submit a malformed email** (e.g. `abc`) — confirm no native browser validation bubble appears (gotcha 2, not covered by jsdom).
- Toggle visibility mid-typing — confirm the value and caret survive.
- Follow the cross-link both ways and confirm a revealed password resets to masked (gotcha 10, not covered by jsdom).
- On `/preview`, confirm both forms render and their password toggles operate independently.
- Confirm `/login` and `/signup` look identical apart from the button label and cross-link — the split makes visual drift possible in a way the single mode-driven component did not.
