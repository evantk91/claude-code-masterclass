# Spec for Login Firebase Auth Integration

branch: claude/feature/login-firebase-auth
figma_component (if used): none

## Summary
Wire the existing `LoginForm` (`components/LoginForm/`) to real Firebase Authentication, using the `auth` export already initialized in `lib/firebase/config.ts`. On submitting the form with a registered email and matching password, the user is signed in via the Web SDK's email/password sign-in call. On success, the page shows a visible success message confirming the user is logged in. No redirect or navigation change happens on success — the user stays on the login page. Only the Firebase Web SDK (client-side, modular `firebase/*` imports) is used — no Admin SDK, no server actions, no API routes. `SignupForm` and its existing submit behavior are out of scope.

## Functional Requirements
- `LoginForm`'s submit handler signs a user in with the entered email and password using the Web SDK's email/password sign-in call, sourced from the shared `auth` export in `lib/firebase/config.ts`.
- On successful sign-in, a success message is shown on the login page confirming the user is logged in. No redirect or route change happens as part of this feature — the user remains on `/login`.
- If sign-in fails (e.g. no account for that email, wrong password, malformed email), the failure is surfaced to the user on the login page rather than failing silently or only logging to the console.
- The submit control is disabled (or otherwise prevented from re-submitting) while a login attempt is in flight, so a user cannot trigger a second concurrent sign-in from the same form.
- Only Firebase Web SDK modular imports (`firebase/auth`) are used for the sign-in call.
- `SignupForm` is not modified as part of this feature and keeps its current behavior.

## Figma Design Reference (only if referenced)
- Not applicable — no Figma design was referenced for this feature.

## Possible Edge Cases
- No account exists for the entered email.
- The password does not match the account's password.
- The email field is malformed (client-side `noValidate` means the browser won't block this before submit).
- The network request fails or times out partway through the sign-in call.
- The user double-clicks submit or presses Enter twice in quick succession before the first request resolves.
- The user submits again after a successful login (e.g. to confirm re-entry) while already signed in.
- The user navigates away from the login page before the async sign-in flow resolves.

## Acceptance Criteria
- Submitting the login form with a registered email and its correct password signs the user in via Firebase Auth.
- On success, a visible success message appears on the login page confirming the user is logged in.
- On success, no redirect or navigation occurs — the user remains on `/login`.
- Submitting with an unregistered email, or a registered email with the wrong password, surfaces a visible error on the login page and does not show the success message.
- The submit control cannot fire a second sign-in request while one is already in flight.
- No Firebase Admin SDK, server action, or API route is used anywhere in this flow — every call goes through the client-side Web SDK.

## Open Questions
- None — the user confirmed no redirect is needed for this feature; login ends at the success message.

## Testing Guidelines
Create a test file(s) in the ./tests folder for the new feature, and create meaningful tests for the following cases, without going too heavy:
- Submitting valid login details calls Firebase Auth sign-in with the entered email and password.
- On success, a success message is shown on the page.
- On a sign-in failure (e.g. wrong password or no such account), an error is surfaced on the page and no success message is shown.
- The submit control is disabled/prevented from re-firing while a login request is in flight.
