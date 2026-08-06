# Spec for login-signup-forms

branch: claude/feature/login-signup-forms
figma_component (if used): n/a

## Summary

The `/login` and `/signup` pages currently render only a heading and no form. This feature adds the actual authentication forms to both pages.

Both pages need the same three controls — an email field, a password field with a show/hide toggle, and a submit button — differing only in wording (the submit button reads "Log In" on `/login` and "Sign Up" on `/signup`) and in which page they link across to. Because the two forms are near-identical, they should be built as a single shared, reusable form component driven by a mode ("login" or "signup"), rather than as two separately maintained forms.

No authentication backend exists yet and none is in scope here. On submit, the form logs the entered email and password to the browser console and does nothing else — no network request, no redirect, no session. This is deliberately a UI-only slice so the visual and interaction layer can be built and reviewed ahead of real auth.

"Easily switch between the two forms" is interpreted here in two senses, both of which are in scope:
1. **For the user** — each form shows a link to the other page ("Don't have an account? Sign up" / "Already have an account? Log in"), so a visitor can move between login and signup without editing the URL.
2. **For the developer** — the shared component swaps its entire login/signup presentation off a single mode value, so there is one place to change form behaviour.

## Functional Requirements

- A single reusable authentication form component lives under `components/` in its own directory with a barrel `index.ts`, following the existing component convention (see `components/Navbar`).
- The component accepts a mode indicating whether it renders the login or the signup variant.
- The form renders an email input, labelled and typed as an email field.
- The form renders a password input, labelled, masked by default.
- The password field has a show/hide toggle rendered as an icon button using `lucide-react` (the project's icon library), toggling the password between masked and plain text.
- The toggle icon reflects current state — one icon when the password is hidden, a different one when it is visible.
- The form renders a single submit button whose label depends on mode: "Log In" for login, "Sign Up" for signup.
- On submit, the form prevents the default browser page-reload submission and logs the current email and password values to the console. Nothing else happens.
- No client-side validation. Fields are not marked `required`, empty values do not block submission, and invalid email formats are not surfaced to the user. The `--color-error` token stays unused by this feature.
- No confirm-password field on the signup form. Both modes render exactly two inputs.
- No loading, disabled, or success/error state on the submit button. The button is always enabled and submission is synchronous.
- No Figma reference. Styling is free-form within the existing theme tokens and shared utility classes in `app/globals.css`.
- The form renders a cross-link to the opposite page: `/signup` from the login form, `/login` from the signup form, using Next.js `Link`.
- `/login` renders the component in login mode; `/signup` renders it in signup mode. Both pages keep their existing headings and `center-content` / `page-content` / `form-title` layout wrappers.
- Styling uses a CSS Module scoped to the component, with `@reference "../../app/globals.css"` at the top so `@apply` can reach the theme tokens — matching how `Navbar.module.css` is written.
- Existing shared utilities and theme tokens from `app/globals.css` are reused rather than re-derived: the `.btn` class for the submit button, and the `--color-*` tokens (`primary`, `light`, `lighter`, `body`, `error`) for field and text styling.
- The component is added to `/preview` so it can be viewed in isolation alongside the existing `Skeleton` examples.

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
- Both pages are driven by the same shared component, with no duplicated form markup between them.
- The cross-links navigate between `/login` and `/signup` correctly.
- The component renders on `/preview`.
- `npm run lint` passes and `npx tsc --noEmit` reports no type errors.

## Open Questions

None outstanding — all resolved and folded into Functional Requirements above:

- Client-side validation — **out of scope.** No blocking on empty fields.
- Invalid email format surfaced to the user — **no.**
- Confirm-password field on signup — **no.**
- Loading/disabled state on submit — **no.**
- Figma design to match — **no.** Free-form within existing theme tokens.

## Testing Guidelines

Create a test file at `tests/components/<ComponentName>.test.tsx`, mirroring the source path per the project convention. Create meaningful tests for the following cases, without going too heavy:

- Renders email and password fields in both login and signup modes.
- Renders the correct submit button label for each mode ("Log In" vs "Sign Up").
- Renders the correct cross-link href for each mode (`/signup` from login, `/login` from signup).
- The password field is masked on initial render.
- Clicking the visibility toggle switches the password field to plain text, and clicking again re-masks it.
- Submitting the form calls `console.log` with the entered email and password — spy on `console.log` and restore it afterwards.
- Submitting with both fields empty still calls `console.log` and is not blocked.
