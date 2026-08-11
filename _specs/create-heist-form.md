# Spec for create-heist-form

branch: claude/feature/create-heist-form
figma_component (if used): none

## Summary
Replace the placeholder heading at `app/(dashboard)/heists/create/page.tsx` with a working form that lets a signed-in user create a new heist. Submitting the form writes a new document to the `heists` collection in Firestore and then redirects the user to `/heists`. The user assigning the heist picks a target from the list of registered players (fetched from the `users` collection), so the heist can be handed off to a specific coworker.

## Functional Requirements
- The create-heist page renders a form with user-editable fields for the heist's title, description, and the coworker it's assigned to.
- The "assign to" field is populated from the `users` collection, showing each user's codename while resolving to their uid for storage.
- On submit, the form builds a document matching the `CreateHeistInput` interface:
  - `title`, `description` — from form input.
  - `createdBy`, `createdByCodename` — the currently signed-in user's uid and codename, not user-editable.
  - `assignedTo`, `assignedToCodename` — the uid and codename of the selected assignee.
  - `createdAt` — set programmatically (server timestamp), not exposed as a form field.
  - `deadline` — computed programmatically as 48 hours after `createdAt`, not exposed as a form field.
  - `finalStatus` — set programmatically to `null`, not exposed as a form field.
- Submitting a valid form creates a new document in the Firestore `heists` collection.
- After the document is successfully created, the user is redirected to `/heists`.
- The form follows the project's existing form composition pattern (page → form component → shared shell/controls) and reuses shared styling tokens/utility classes rather than introducing new ad hoc styles.

## Figma Design Reference (only if referenced)
- N/A — no Figma reference provided.

## Possible Edge Cases
- The `users` collection is empty or fails to load (no one to assign the heist to).
- The signed-in user's own codename/uid isn't yet available when the page loads.
- The form is submitted with missing/empty required fields (title, description, assignee).
- The Firestore write fails (network error, permissions error).
- A user assigns a heist to themselves.
- Very long title/description input.

## Acceptance Criteria
- Visiting `/heists/create` while signed in shows a form with fields for title, description, and assignee (no fields for createdAt, deadline, createdBy, or finalStatus).
- The assignee field lists users by codename, sourced from the `users` collection.
- Submitting the form with valid input creates one new document in the `heists` collection whose shape matches `CreateHeistInput`, with `createdAt`, `deadline`, and `finalStatus` populated programmatically rather than from form state.
- After a successful submit, the browser navigates to `/heists`.
- Submitting with missing required fields does not create a document and surfaces feedback to the user instead.
- A failed Firestore write does not navigate away from the create page and surfaces feedback to the user instead.

## Open Questions
- Should a user be allowed to assign a heist to themselves, or should they be excluded from their own assignee list? No a user should not be allowed to assign a heist to themselves.
- Are there length/content constraints on title and description beyond "required"? No length constraints.
- Should the assignee list exclude any users, or include everyone in the `users` collection? Include everyone except the currently logged in user.
- Is there an existing loading/error UI convention (e.g. from the auth forms) that fetching the users list should reuse, or is a new pattern expected here? Lets use the exisiting Loader component if possible.

## Testing Guidelines
Create a test file(s) in the ./tests folder for the new feature, and create meaningful tests for the following cases, without going too heavy:
- Renders the expected form fields (title, description, assignee) and no fields for the programmatically-set values.
- Populates the assignee options from the `users` collection.
- On valid submit, calls the Firestore write with a document matching `CreateHeistInput`'s shape, including a programmatically-set `createdAt`/`deadline`/`finalStatus`.
- On successful submit, redirects to `/heists`.
- Blocks submission and shows feedback when required fields are missing.
- Shows feedback and does not redirect when the Firestore write fails.
