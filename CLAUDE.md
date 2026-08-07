# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Pocket Heist — a Next.js starter project for the Claude Code Masterclass. It's an office-mischief "heist" tracker (create/assign/track playful tasks between coworkers). Most routes are still unimplemented placeholders (skeleton headings only) — this is scaffolding, not a finished app. The `/login` and `/signup` forms are the one fully built feature.

## Commands

```bash
npm run dev      # start dev server (localhost:3000)
npm run build    # production build
npm run start    # run production build
npm run lint     # eslint
npm test         # vitest (watch mode by default)
```

Run a single test file: `npx vitest run tests/components/Navbar.test.tsx`
Run tests matching a name: `npx vitest run -t "renders the main heading"`

There is no typecheck script; use `npx tsc --noEmit`.

`npm run lint` currently fails on a pre-existing `react/no-unescaped-entities` error in `app/(dashboard)/heists/page.tsx` (the apostrophe in "Heists You've Assigned"). Unrelated to any current work — don't assume your change caused it.

## Spec-driven workflow

Features are specced and planned before they're built, and both artifacts are committed:

- `_specs/<feature-slug>.md` — what to build. Written from `_specs/template.md` by the `/spec` slash command, which also creates a `claude/feature/<slug>` branch. `/spec` aborts if the working tree is dirty.
- `_plans/<feature-slug>.md` — how to build it, paired to the spec by slug.

Plans are saved for later rather than executed immediately at the end of plan mode. When a spec's Open Questions get answered, fold the answers into Functional Requirements as explicit non-goals rather than leaving them as trailing Q&A — silence in a spec reads as permission.

`/commit-message` drafts a commit message from staged changes (emoji + conventional-commit format, present tense, explains *why*).

## Architecture

**Next.js App Router with route groups splitting two shells:**
- `app/(public)/` — unauthenticated routes (`/`, `/login`, `/signup`, `/preview`). Layout wraps children in `<main className="public">` with no nav.
- `app/(dashboard)/` — authenticated routes (`/heists`, `/heists/create`, `/heists/[id]`). Layout renders `<Navbar />` + `<main>`.
- Both route groups share the root `app/layout.tsx`, which sets metadata and imports `globals.css`.
- `app/(public)/page.tsx` (the `/` splash page) is intended to redirect based on auth state: logged in → `/heists`, logged out → `/login`. That redirect logic is not yet implemented.
- `app/(public)/preview/page.tsx` is a scratch page for previewing newly built UI components in isolation — not part of the user-facing app. Add new components here.

**Components**: Each component lives in its own directory under `components/` with a barrel `index.ts` re-exporting the default (`export { default } from "./Navbar"`), so imports use `@/components/Navbar` rather than reaching into the file. There are **no named exports anywhere in the repo**. The `@/*` alias maps to the repo root.

**Form composition** — the auth forms layer deliberately, and the layering is the thing to preserve when editing them:

```
page (server)  →  LoginForm / SignupForm  →  AuthForm  →  TextField / PasswordField / SubmitButton
                  state + copy + submit      shell         controls
```

- `LoginForm` and `SignupForm` own the field values and the submit handler, and state their own wording inline. There is no `mode` prop or login/signup branching anywhere.
- `AuthForm` is a stateless presentational shell — it takes the fields as `children` plus label/href props, and renders the card, submit button and cross-link. Keep it stateless.
- `TextField` stays controlled by its parent and generates its own `useId()`. `PasswordField` wraps it and owns masked/revealed state internally, passing the toggle in as `TextField`'s `adornment`.
- A change meant for both forms belongs in the shell or a control, not copied twice. When in doubt, push it down.
- `<input type="password">` has no ARIA role, so query password fields by label (`getByLabelText("Password")`), never `getByRole("textbox")`.

**Client/server boundary**: pages stay server components. `"use client"` goes only on components that own state or event handlers, as the first line above all imports. `SubmitButton` is deliberately directive-free to show the distinction.

**Styling**: Tailwind v4 via `@tailwindcss/postcss`, configured entirely in `app/globals.css` using `@theme` (no `tailwind.config.js`). Reuse the theme tokens (`--color-primary`, `--color-dark`, `--color-error`, etc.) and the shared utility classes (`.page-content`, `.center-content`, `.form-title`, `.btn`) instead of re-deriving styles per page. Component-scoped styles use CSS Modules with `@reference "../../app/globals.css"` as line 1 so `@apply` can reach the tokens. Styles live with the component that owns the markup; module class names compose across components via template literal (`` `${styles.input} ${inputClassName}` ``).

**Testing**: Vitest + jsdom + React Testing Library, with `@testing-library/user-event` available. Config in `vitest.config.mts` (`vite-tsconfig-paths` resolves `@/` imports; `vitest.setup.ts` loads jest-dom matchers). Tests live under `tests/`, mirroring the source path (`components/Navbar` → `tests/components/Navbar.test.tsx`), never colocated. Import vitest globals explicitly despite `globals: true`, and separate RTL imports from component imports with a `// component imports` comment. Test each component at its own level rather than re-testing a child's internals through its parent. For console assertions: `vi.spyOn(console, "log").mockImplementation(() => {})` with a single top-level `afterEach(() => { vi.restoreAllMocks() })`.

**Code style**: no semicolons, double quotes, 2-space indent, default-exported function components.

**Icons**: `lucide-react` (see the `Clock8` logo mark in the Navbar and splash page).

## Checking Documentation

- **important** When implementing any lib/framework-specific features, ALWAYS check the appropriate lib/framework documentation using the Context7 MCP server before writing any code.
