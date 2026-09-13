# Affiliated College Portal

Official affiliated-college website and administration system, built to satisfy the
university circular documented in `docs/source`. See `CLAUDE.md` for the full project scope
and non-negotiable rules, and `docs/` for requirements, architecture, database design, the
compliance matrix, and the implementation plan.

**Status:** Phase 1 (project foundation) — tooling, route structure, and shared UI are in
place. No real college content, authentication, or business logic exist yet. Every public
and admin page currently renders a clearly marked placeholder (see `CLAUDE.md` rules 1, 13,
14).

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- Tailwind CSS v4
- PostgreSQL + [Prisma](https://www.prisma.io) ORM (v7, driver-adapter based)
- [Zod](https://zod.dev) for environment variable validation
- [Vitest](https://vitest.dev) + [Testing Library](https://testing-library.com) for unit/component tests
- [Playwright](https://playwright.dev) for end-to-end tests

## Prerequisites

- Node.js 20+ and npm
- A PostgreSQL database (local or remote)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment example and fill in real values:

   ```bash
   cp .env.example .env
   ```

   At minimum, set `DATABASE_URL` to a real PostgreSQL connection string. See
   `src/lib/env.ts` for the full list of validated environment variables — the app will
   refuse to start with a clear error if a required variable is missing or malformed.

3. Apply database migrations and seed baseline data (roles + one placeholder college):

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000` for the public site and `http://localhost:3000/admin` for
   the admin area (unauthenticated — see the banner on every admin page).

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the Next.js dev server. |
| `npm run build` | Production build. |
| `npm run start` | Serve the production build. |
| `npm run lint` | Run ESLint. |
| `npm run lint:fix` | Run ESLint with `--fix`. |
| `npm run format` | Format the codebase with Prettier. |
| `npm run format:check` | Check formatting without writing changes. |
| `npm run typecheck` | Run the TypeScript compiler in check-only mode. |
| `npm test` | Run unit/component tests once (Vitest). |
| `npm run test:watch` | Run unit/component tests in watch mode. |
| `npm run test:e2e` | Run end-to-end tests (Playwright). Starts its own dev server. |
| `npm run db:migrate` | Create/apply a dev database migration (`prisma migrate dev`). |
| `npm run db:migrate:deploy` | Apply pending migrations without prompting (for CI/production). |
| `npm run db:seed` | Seed baseline roles and a placeholder college. |
| `npm run db:generate` | Regenerate the Prisma client from `prisma/schema.prisma`. |

## Project structure

```
src/
  app/
    (public)/        Public website routes (Home, About, Programs, Faculty, ...)
    admin/            Admin system routes (Dashboard, CMS, Users, Compliance, ...)
    api/health/       Health-check endpoint
  components/
    ui/               Generic UI primitives (Button, Card, Badge, ...)
    layout/           Header/footer/sidebar shells for the public and admin areas
    PagePlaceholder   Shared "content not yet available" placeholder used by every route
  lib/
    env.ts            Environment variable validation (Zod)
    prisma.ts          Prisma client singleton (driver-adapter based, Prisma 7)
    navigation.ts      Route tables shared by navigation and route-structure tests
prisma/
  schema.prisma       Data model (currently: tenancy/RBAC tables only — see docs/database-design.md)
  seed.ts             Seeds baseline roles + one placeholder college
tests/
  unit/               Vitest unit/component tests
  e2e/                Playwright end-to-end tests
docs/                 Requirements, architecture, database design, compliance matrix, implementation plan
```

## A note on placeholder data

Per `CLAUDE.md` rule 1, no real institutional content (college name, faculty, fees,
addresses, etc.) is ever invented in this codebase. Every route currently renders an
explicit, visibly-marked placeholder instead. Any seeded database row representing a
college-specific fact carries `isPlaceholder: true` and an unmistakable `[PLACEHOLDER]`
label — replace it with real data before anything is published.

## Health check

`GET /api/health` returns the app's status and a database connectivity check. It returns
`200` when the database is reachable and `503` (with `checks.database: "unreachable"`) when
it isn't — the endpoint itself never crashes for a missing database, and the production
build does not require one to succeed.

## Further reading

- `CLAUDE.md` — project scope and non-negotiable rules
- `docs/requirements.md` — extracted circular requirements
- `docs/architecture.md` — target architecture
- `docs/database-design.md` — full data model, including the compliance model
- `docs/compliance-matrix.md` — circular requirement → module/table mapping
- `docs/implementation-plan.md` — phased build plan
- `progress.md` — living status log
- `tests.json` — test coverage manifest
