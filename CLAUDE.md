# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.



## Project

Pocket Heist — a Next.js starter project for the Claude Code Masterclass. It's an office-mischief "heist" tracker (create/assign/track playful tasks between coworkers). Most routes are currently unimplemented placeholders (skeleton headings only) — this is scaffolding, not a finished app.

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

There is no dedicated typecheck script; use `npx tsc --noEmit` if you need to check types directly.

## Architecture

**Next.js App Router with route groups splitting two shells:**
- `app/(public)/` — unauthenticated routes (`/`, `/login`, `/signup`, `/preview`). Layout wraps children in `<main className="public">` with no nav.
- `app/(dashboard)/` — authenticated routes (`/heists`, `/heists/create`, `/heists/[id]`). Layout renders `<Navbar />` + `<main>`.
- Both route groups share the root `app/layout.tsx`, which sets metadata and imports `globals.css`.
- `app/(public)/page.tsx` (the `/` splash page) is intended to redirect based on auth state: logged in → `/heists`, logged out → `/login`. That redirect logic is not yet implemented.
- `app/(public)/preview/page.tsx` is a scratch page for previewing newly built UI components in isolation — not part of the user-facing app.

**Styling**: Tailwind v4 via `@tailwindcss/postcss`, configured entirely in `app/globals.css` using `@theme` (no `tailwind.config.js`). Custom theme tokens (`--color-primary`, `--color-dark`, etc.) and a small set of shared utility classes (`.page-content`, `.center-content`, `.form-title`) are defined there — reuse these instead of re-deriving layout styles per page. Component-scoped styles use CSS Modules (e.g. `components/Navbar/Navbar.module.css`) with `@reference "../../app/globals.css"` at the top so `@apply` can access the theme tokens.

**Components**: Each component lives in its own directory under `components/` with a barrel `index.ts` re-exporting the default (e.g. `components/Navbar/index.ts` → `export { default } from "./Navbar"`), so imports elsewhere use `@/components/Navbar` rather than reaching into the file directly. The `@/*` path alias maps to the repo root (see `tsconfig.json`).

**Testing**: Vitest + jsdom + React Testing Library. Config in `vitest.config.mts` (uses `vite-tsconfig-paths` so `@/` imports resolve in tests, and `vitest.setup.ts` loads `@testing-library/jest-dom/vitest` matchers). Tests live under `tests/`, mirroring the source path being tested (e.g. `components/Navbar` → `tests/components/Navbar.test.tsx`), not colocated with source.

**Icons**: `lucide-react` is the icon library in use (see the `Clock8` logo mark used in both the Navbar and the splash page).
