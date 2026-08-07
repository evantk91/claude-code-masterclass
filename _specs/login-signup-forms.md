# Spec for login-signup-forms

branch: claude/feature/login-signup-forms
figma_component (if used): n/a

## Summary

The `/login` and `/signup` pages currently render only a heading and no form. This feature adds the actual authentication forms to both pages.

Both pages need the same three controls — an email field, a password field with a show/hide toggle, and a submit button — differing only in wording (the submit button reads "Log In" on `/login` and "Sign Up" on `/signup`) and in which page they link across to.

Each page renders its own form component — `LoginForm` on `/login`, `SignupForm` on `/signup` — so each reads top-to-bottom with its own copy and no mode branching. They avoid duplication by sharing the pieces underneath: a presentational `AuthForm` shell that owns the card, submit button and cross-link, and the reusable `TextField` / `PasswordField` inputs. No form markup is written twice.

No authentication backend exists yet and none is in scope here. On submit, the form logs the entered email and password to the browser console and does nothing else — no network request, no redirect, no session. This is deliberately a UI-only slice so the visual and interaction layer can be built and reviewed ahead of real auth.

"Easily switch between the two forms" is interpreted here in two senses, both of which are in scope:
1. **For the user** — each form shows a link to the other page ("Don't have an account? Sign up" / "Already have an account? Log in"), so a visitor can move between login and signup without editing the URL.
2. **For the developer** — the shared `AuthForm` shell and field components mean a change to form layout, styling or field behaviour lands in one place and applies to both.

## Functional Requirements

- The feature is composed of six components, each in its own directory under `components/` with a barrel `index.ts`, following the existing component convention (see `components/Navbar`):
  - **`TextField`** — a generic labelled text input. Owns the field/label/input styling, generates a unique input id per instance so several fields can coexist on one page, and accepts an optional adornment rendered alongside the input.
  - **`PasswordField`** — wraps `TextField`, owns the masked/revealed state, and supplies the show/hide toggle as that adornment. Nothing above it needs to know about visibility.
  - **`SubmitButton`** — a full-width `type="submit"` button taking its label as children, combining the global `.btn` utility with the width/spacing it needs inside a form.
  - **`AuthForm`** — a presentational shell holding no state. Takes the cross-link copy and href, a submit label, a submit handler, and the fields as children; renders the card, the `SubmitButton` and the cross-link.
  - **`LoginForm`** — owns the email and password values and the submit handler, and supplies the login wording to `AuthForm`.
  - **`SignupForm`** — the same for signup.
- `TextField` and `PasswordField` are deliberately generic rather than auth-specific, so later forms (e.g. Create Heist) can reuse them.
- There is no mode prop and no login/signup branching anywhere. Each form states its own copy directly.
- The form renders an email input, labelled and typed as an email field.
- The form renders a password input, labelled, masked by default.
- The password field has a show/hide toggle rendered as an icon button using `lucide-react` (the project's icon library), toggling the password between masked and plain text.
- The toggle icon reflects current state — one icon when the password is hidden, a different one when it is visible.
- Each form renders a single submit button: "Log In" for `LoginForm`, "Sign Up" for `SignupForm`.
- On submit, the form prevents the default browser page-reload submission and logs the current email and password values to the console. Nothing else happens.
- No client-side validation. Fields are not marked `required`, empty values do not block submission, and invalid email formats are not surfaced to the user. The `--color-error` token stays unused by this feature.
- No confirm-password field on the signup form. Both forms render exactly two inputs.
- No loading, disabled, or success/error state on the submit button. The button is always enabled and submission is synchronous.
- No Figma reference. Styling is free-form within the existing theme tokens and shared utility classes in `app/globals.css`.
- Each form renders a cross-link to the opposite page: `/signup` from `LoginForm`, `/login` from `SignupForm`, using Next.js `Link`.
- `/login` renders `LoginForm`; `/signup` renders `SignupForm`. Both pages keep their existing headings and `center-content` / `page-content` / `form-title` layout wrappers, and both stay server components.
- Each component with styling of its own has a CSS Module, with `@reference "../../app/globals.css"` at the top so `@apply` can reach the theme tokens — matching how `Navbar.module.css` is written. Styles sit with the component that owns the markup: field/label/input in `TextField`, toggle in `PasswordField`, button width in `SubmitButton`, card and cross-link in `AuthForm`. `LoginForm` and `SignupForm` have no module of their own — they contribute no markup to style.
- Existing shared utilities and theme tokens from `app/globals.css` are reused rather than re-derived: the `.btn` class for the submit button, and the `--color-*` tokens (`primary`, `light`, `lighter`, `body`, `error`) for field and text styling.
- `LoginForm` and `SignupForm` are both added to `/preview` so they can be viewed in isolation alongside the existing `Skeleton` examples.

## Possible Edge Cases

- Submitting with one or both fields empty logs whatever is present, including empty strings. This is intentional — submission is never blocked.
- Password visibility state should reset to hidden when navigating between `/login` and `/signup`, not persist a revealed password across pages.
- The show/hide toggle sits inside the form and must not itself trigger form submission.
- Toggling visibility should not clear the field, move the caret to the start, or lose the user's typed value.
- Very long email or password values should not break the field or page layout.
- Autofill from a password manager should populate both fields correctly and should not fight the masked/visible state.
- Rapid repeated clicking of the visibility toggle should stay in sync and not end up showing an icon that contradicts the field state.
- Logging a plaintext password to the console is acceptable only because this is a temporary stub; it should be visibly marked in the code as something to remove once real auth lands.

## Acceptance Criteria

- Visiting `/login` shows a heading, an email field, a password field, a visibility toggle, a "Log In" button, and a link to `/signup`.
- Visiting `/signup` shows a heading, an email field, a password field, a visibility toggle, a "Sign Up" button, and a link to `/login`.
- Typing into both fields and submitting logs the entered email and password to the console.
- Submitting with empty fields still logs — nothing blocks or warns.
- Submitting does not reload the page, navigate away, or issue a network request.
- The password field is masked on first render.
- Clicking the visibility toggle reveals the password as plain text; clicking again re-masks it. The typed value is preserved through both.
- The toggle icon changes to match the current visibility state.
- `LoginForm` and `SignupForm` share the `AuthForm` shell, the field components and `SubmitButton` — no `<form>`, `<input>`, `<label>`, `<button>` or card styling is written twice.
- Neither form contains a mode prop or login/signup conditional; each states its own copy directly.
- The cross-links navigate between `/login` and `/signup` correctly.
- Both forms render on `/preview`, and their password toggles operate independently.
- `npm run lint` passes and `npx tsc --noEmit` reports no type errors.

## Open Questions

None outstanding — all resolved and folded into Functional Requirements above:

- Client-side validation — **out of scope.** No blocking on empty fields.
- Invalid email format surfaced to the user — **no.**
- Confirm-password field on signup — **no.**
- Loading/disabled state on submit — **no.**
- Figma design to match — **no.** Free-form within existing theme tokens.

## Testing Guidelines

Create a test file per component at `tests/components/<ComponentName>.test.tsx`, mirroring the source path per the project convention. Test each component at its own level — don't re-test field internals through `AuthForm`. Create meaningful tests for the following cases, without going too heavy:

**`TextField`**
- The label is associated with the input.
- Renders the given value and input type.
- Calls `onChange` with the new value as the user types.
- Two instances on one page get unique ids, so labels do not cross-associate.
- Renders an adornment alongside the input.

**`PasswordField`**
- Masked on initial render.
- Clicking the toggle reveals the value as plain text; clicking again re-masks it.
- The toggle is a `type="button"`, so it cannot submit a surrounding form.

**`SubmitButton`**
- Renders its children as the button label.
- Is a `type="submit"` button.
- Submits the surrounding form when clicked.

**`AuthForm`** (the shell — no state, so test it with stub props)
- Renders its children as the form fields.
- Renders the given submit label.
- Renders the cross-link with the given href and label.
- Calls `onSubmit` when the submit button is clicked.

**`LoginForm`** and **`SignupForm`**
- Renders labelled email and password fields.
- Renders the correct submit button label ("Log In" / "Sign Up").
- Links across to the opposite page (`/signup` from login, `/login` from signup).
- The password field is masked on initial render, and the typed value survives toggling.
- Clicking the visibility toggle does not submit the form.
- Submitting calls `console.log` with the entered email and password — spy on `console.log` and restore it afterwards.
- Submitting with both fields empty still calls `console.log` and is not blocked.
