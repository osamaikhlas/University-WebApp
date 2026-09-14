# Progress

Living log for the affiliated-college website and administration system. Update this file as work
happens — do not let it go stale (see `CLAUDE.md` rule 15).

## Status

**Phase 1 (project foundation) and Phase 2 (database) complete.** The stack is chosen and
scaffolded (Next.js + TypeScript + Tailwind + PostgreSQL/Prisma), and the full data model for
every module in `CLAUDE.md`'s required scope now exists as Prisma models, migrated against a
real PostgreSQL database and seeded with clearly-marked dev/demo data. No real college
content, authentication, or business logic exist yet — see `tests.json`'s
`public_website`/`admin_system` sections, which remain `not_started` because every page is
still a placeholder with no UI/API wired to the new schema yet.

## Completed

- 2026-09-13 — Read and transcribed the university circular (`docs/source`); identified the 20 required
  public-content categories and the governance requirements (Principal accountability, accuracy/currency,
  regular updates, compliance report to the Inspector of Colleges).
- 2026-09-13 — Defined full target scope for the Public website and Admin system, and the 15
  non-negotiable project rules, in `CLAUDE.md`.
- 2026-09-13 — Created `progress.md` and `tests.json` skeletons.
- 2026-09-13 — Wrote `docs/requirements.md`: extracted the circular's 20 content requirements and its
  governance requirements, plus engineering requirements derived from `CLAUDE.md`'s non-negotiable rules.
- 2026-09-13 — Wrote `docs/compliance-matrix.md`: mapped all 20 circular requirements (+ governance
  requirements) to owning public/admin modules, database entities, responsible roles, and an explicit
  compliance status lifecycle.
- 2026-09-13 — Wrote `docs/architecture.md`: production-grade architecture covering Public website, Admin
  CMS, Authentication, RBAC, Approval workflow, Audit logging, Document/media management, Search,
  Grievance system, Compliance dashboard, Notifications, Content review/freshness, Accessibility, SEO,
  Testing, Deployment, and Backups. Proposes (pending confirmation) a tenant-ready relational-DB stack as
  the default recommendation.
- 2026-09-13 — Wrote `docs/database-design.md`: explicit ER model (tenancy/RBAC tables, generic content
  lifecycle, all 20 requirement-backing structured tables, grievance, approval workflow, audit log,
  notifications, content-review scheduling) and an explicit compliance data model
  (`ComplianceRequirement`/`ComplianceItem`/`ComplianceReportExport`) with its verification rules.
- 2026-09-13 — Wrote `docs/implementation-plan.md`: 9-phase build sequence (decisions → auth/RBAC/audit →
  generic content lifecycle → the 20 content modules → documents/search → grievance/compliance →
  notifications/accessibility/SEO → hardening/deployment/backups → launch & compliance submission), each
  phase cross-referenced to `tests.json` entries.
- 2026-09-13 — **Implemented Phase 1: project foundation** (this phase is scaffolding work that precedes
  `docs/implementation-plan.md`'s own "Phase 1: auth/RBAC/audit" — that phase is effectively next):
  - Scaffolded Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 via `create-next-app`, merged into
    the existing repo without touching `docs/`, `CLAUDE.md`, `progress.md`, or `tests.json`.
  - Configured ESLint (flat config, `eslint-config-next` + `eslint-config-prettier`) and Prettier.
  - Configured PostgreSQL + Prisma **v7** (driver-adapter architecture — schema no longer holds a
    connection `url`; `prisma.config.ts` supplies it to the CLI, `@prisma/adapter-pg` supplies it to
    `PrismaClient` at runtime). Implemented the tenancy/RBAC subset of the schema from
    `docs/database-design.md` §1 (`College`, `User`, `Role`, `Permission`, `RolePermission`, `UserRole`)
    plus a seed script (`prisma/seed.ts`) for the baseline role set and one clearly-marked placeholder
    college. The 20 content-requirement tables are deferred to the content-module phase, per the plan.
  - Added environment variable validation (`src/lib/env.ts`, Zod) that checks presence/format only —
    never connectivity — so `next build` never requires a live database.
  - Configured unit/component testing (Vitest + Testing Library) and Playwright for e2e.
  - Built the full public route structure (29 sections, matching `CLAUDE.md`'s scope exactly) and admin
    route structure (23 sections), every route currently rendering a shared, clearly-marked
    `PagePlaceholder` component (rules 1, 13, 14) — Home and the admin Dashboard are slightly customized
    but still placeholder-level.
  - Built a shared UI/layout system (`src/components/ui/*`, `PublicHeader`/`PublicFooter`,
    `AdminSidebar`/`AdminNoAuthBanner`) and a shared `src/lib/navigation.ts` route table used by both the
    layouts and a regression test that checks every nav link has a real page.
  - Added `loading.tsx`, `error.tsx`, `global-error.tsx`, and `not-found.tsx`.
  - Added `GET /api/health` (force-dynamic; reports `ok`/`degraded` based on a live DB ping, never
    crashes or requires a DB at build time).
  - Wrote `README.md` with setup/run instructions, and wired all 16 requested npm scripts.
  - **Ran and fixed to green**: `npm run lint` (clean), `npm run typecheck` (clean, after removing a
    dependency on Next's generated `LayoutProps` type and fixing jest-dom's Vitest type import path),
    `npm test` (15/15 passing, after loading `.env` in the Vitest setup file so `src/lib/env.ts`'s
    module-level validation doesn't crash test collection), and `npm run build` (all 55 routes compiled;
    51 pages statically prerendered, `/api/health` correctly left dynamic).
  - Smoke-tested the production build (`next start`): `/` and `/admin` return 200, an unknown route
    returns 404, and `/api/health` correctly reports `"degraded"`/`"unreachable"` (not a crash) since no
    real PostgreSQL server exists in this environment.
  - `npm run db:migrate` was invoked to confirm it's wired correctly — it correctly loads
    `prisma.config.ts`/the schema and fails only with `P1001: Can't reach database server`, since no real
    Postgres is available here. **Not yet run against a real database** — do this once `DATABASE_URL`
    points at one.
  - `npm run test:e2e`'s Playwright tests were verified to parse and list correctly
    (`npx playwright test --list` → 6 tests, 3 files) but were **not executed** — Chromium binaries
    aren't installed in this environment. Run `npx playwright install && npm run test:e2e` to execute
    them.
  - Noted but did not fix: `npm audit` reports 4 high-severity advisories, all transitive from Prisma's
    CLI dependency on `mysql2`/`deepmerge-ts` (used for multi-database support we don't use). The only
    automated fix (`npm audit fix --force`) downgrades to Prisma 6.19.3, undoing the driver-adapter setup
    — left as a tracked, low-risk (dev-tooling-only, not reachable at runtime) issue rather than reverting.
  - Updated `tests.json` with a new `foundation` section for infrastructure-level tests; the per-feature
    `public_website`/`admin_system` entries remain `not_started` (a route existing as a placeholder is
    not the real, tested behavior each entry describes) but now note that a placeholder route exists.

- 2026-09-13 — **Implemented Phase 2: database** (per explicit instruction, using
  `docs/database-design.md` as the reference model and a user-specified exact list of 39
  models to create):
  - Extended `prisma/schema.prisma` with every requested model: `CollegeProfile`,
    `Department`, `Program`, `Course`, `Faculty`, `Staff`, `Infrastructure`, `Notice`,
    `Event`, `Seminar`, `Workshop`, `AcademicCalendar`, `Timetable`, `Admission`,
    `FeeStructure`, `EnrollmentStatistic`, `Examination`, `Result`, `Contact`, `Location`,
    `Affiliation`, `Activity`, `Club`, `GalleryAlbum`, `GalleryItem`, `Scholarship`,
    `StudentSupport`, `Policy`, `Regulation`, `Grievance`, `Document`, `Media`,
    `ComplianceRequirement`, `ComplianceEvidence`, `ComplianceVerification`, `AuditLog`,
    `Notification` (plus `GrievanceNote`, added beyond the requested list because `Grievance`
    is unusable without somewhere to record internal case notes).
  - Design decisions/divergences from `docs/database-design.md` (recorded as comments at the
    top of `prisma/schema.prisma` too): `Document` and `Media` are generic attachment tables
    keyed by `(entityType, entityId)` rather than a bespoke FK column per module, since the
    doc itself notes Document is "shared by many modules"; `GalleryItem` wraps a `Media` row
    with per-album curation/ordering/publication state rather than duplicating asset fields;
    the doc's single `ComplianceItem` is split into `ComplianceRequirement` (denormalized
    current status) + `ComplianceEvidence` (append-only evidence links) +
    `ComplianceVerification` (append-only human verification decisions, so a full
    verify/reject history survives per rule 8); `createdBy`/`updatedBy`/`publishedBy` are
    plain user-id strings rather than enforced FK relations (would otherwise force ~90 named
    back-relations onto `User`), while single-purpose actor fields that are actually queried
    (`Grievance.assignedTo`, `Document/Media.uploadedBy`, `ComplianceEvidence.addedBy`,
    `ComplianceVerification.verifiedBy`, `ComplianceRequirement.owner`, `AuditLog.actor`,
    `Notification.user`) are real relations.
  - Added a shared `ContentStatus` enum (`DRAFT`/`PENDING_REVIEW`/`APPROVED`/`PUBLISHED`/
    `ARCHIVED`) used across every structured content model, plus `isPlaceholder`,
    `publishedAt`/`publishedBy` where the model is independently publishable, and
    `createdBy`/`updatedBy` audit stamps — consistent with rules 4, 8, 13, 14.
  - Installed PostgreSQL 16 locally via Homebrew (`brew install postgresql@16`, service
    started with `brew services start postgresql@16` — **this now auto-starts at login on
    this machine**; stop with `brew services stop postgresql@16` if not wanted persistently)
    since no database server was available in this environment, to actually validate the
    migration and seed end-to-end rather than only generating unverified SQL.
  - Generated the migration SQL statically (`prisma migrate diff --from-empty
    --to-schema=prisma/schema.prisma --script`, since `prisma migrate dev` needs a reachable
    shadow database at generation time) into
    `prisma/migrations/20260913114324_init_content_modules/`, then **applied it for real**
    against the local Postgres instance with `prisma migrate deploy` — succeeded with no
    errors, and `prisma migrate diff --from-config-datasource --to-schema=prisma/schema.prisma
    --exit-code` confirms zero drift between the applied database and the schema.
  - Rewrote `prisma/seed.ts`: kept the Phase 1 role/college seed, added one `[DEV SEED]`
    admin user (`.invalid` email, obviously-fake password hash, never a real credential) to
    satisfy required uploader/actor foreign keys, one clearly `[PLACEHOLDER]`-marked demo
    record per content module (department → program → course → faculty → ... → gallery
    album/item → grievance/note → document), and all 20 `ComplianceRequirement` rows
    transcribed from `docs/compliance-matrix.md` (itself transcribed from the circular) —
    seeding the fixed checklist is system taxonomy, not invented college data, per the same
    rationale already used for the Phase 1 role seed. Ran the seed against the real database
    twice to confirm every `upsert` is idempotent (verified via row counts before/after).
  - Verified an end-to-end worked example of the evidence → verification → status flow:
    seeded one `ComplianceEvidence` row (Faculty item) and one `ComplianceVerification`
    (`decision: VERIFIED`), then updated `ComplianceRequirement.status` to `VERIFIED` — spot
    checked via `psql` that requirement #4 shows `VERIFIED` while the other 19 correctly
    remain `NOT_STARTED` (nothing is auto-derived; this is a real demonstration of the
    human-decision path rule 7 requires).
  - Ran `npm run typecheck`, `npm run lint`, and `npm test` after the schema/client changes —
    all clean/passing (15/15 unit tests), confirming the new generated Prisma Client types
    don't break any existing code.
  - Updated `tests.json` with a new `database` section tracking schema/migration/seed
    verification directly (separate from the per-module `pub-*`/`adm-*` entries, which stay
    `not_started` until real UI/API code reads from these tables).

## In progress

- Nothing in progress. Phase 1 (project foundation) and Phase 2 (database) are complete;
  next up is wiring authentication/RBAC and real CRUD/API code on top of this schema
  (`docs/implementation-plan.md`'s own Phase 1/2), not yet started.

## Next steps

1. Run `npx playwright install && npm run test:e2e` in an environment with network access to actually
   execute the e2e suite (only listed/validated so far, not run).
2. Begin `docs/implementation-plan.md` Phase 1: authentication, full RBAC enforcement (the admin area
   currently has zero auth — see the banner on every admin page), and audit logging, now that the
   underlying tables exist.
3. Wire admin CRUD screens and public read pages to the new content tables, enforcing rule 4
   (draft vs. published) at the query layer from the very first module.
4. Gather real college data for the highest-priority sections (College Profile, Programs, Faculty,
   Contact, Location, Affiliation) — placeholders only until this is supplied.
5. Resolve remaining open questions below (single college vs. template, languages, real admin role
   names, review-frequency cadence) — none of these block further engineering work right now, but they do
   shape how the already-built content schema gets populated with real data.

## Decisions log

| Date | Decision |
|------|----------|
| 2026-09-13 | Public site and Admin system scope finalized per user specification. |
| 2026-09-13 | 15 non-negotiable rules adopted (see `CLAUDE.md`). |
| 2026-09-13 | Requirements, architecture, database design, compliance matrix, and implementation plan documented (`docs/`). Architecture proposes a tenant-ready design and a relational-DB-backed stack as defaults — **proposed, not yet confirmed** by the user. |
| 2026-09-13 | **Stack decision made** (via explicit instruction to implement it): Next.js (App Router) + TypeScript + Tailwind CSS v4 + PostgreSQL + Prisma 7 (driver-adapter architecture) + Vitest/Testing Library + Playwright. This resolves the "technology stack" open question from `docs/architecture.md` §0. |
| 2026-09-13 | Pinned `prisma`/`@prisma/client` to the last stable line (`7.10.0`) rather than the `prisma` package's `latest` dist-tag, which currently points at an `8.0.0-rc.*` pre-release. |
| 2026-09-13 | Tenancy/RBAC schema (`College`, `User`, `Role`, `Permission`, `RolePermission`, `UserRole`) built now, ahead of the content-requirement tables, since auth/RBAC is the next phase and depends on it. |
| 2026-09-13 | **Phase 2 (database) implemented** per explicit instruction, covering all 39 requested models. `Document`/`Media` made generic `(entityType, entityId)` attachment tables rather than per-module FK columns; `ComplianceItem` (from `docs/database-design.md`) split into `ComplianceRequirement` + append-only `ComplianceEvidence`/`ComplianceVerification` for a fuller audit trail; `createdBy`/`updatedBy`/`publishedBy` kept as plain id strings (not FK relations) to avoid ~90 forced back-relations on `User`. |
| 2026-09-13 | Installed PostgreSQL 16 locally via Homebrew to validate the migration/seed against a real database rather than only generating unverified SQL. The service is registered to auto-start at login (`brew services start postgresql@16`) — stop with `brew services stop postgresql@16` if that persistence isn't wanted on this machine. |

## Open questions

- Which specific college (or colleges) is this for? Name, type (Govt/Private/Law/Education), and real
  institutional data are not yet available.
- Is this a single-tenant site or a multi-tenant template reusable across affiliated colleges? The schema
  is tenant-ready (every table carries `collegeId`) regardless of the answer.
- What languages must the public site support (English/Urdu/Sindhi)? Needs resolution before the content
  schema (Phase 3 per `docs/implementation-plan.md`) is finalized.
- Who are the intended admin roles (e.g. Principal, department heads, registrar office, IT staff) and what
  should each be allowed to do? The baseline role set seeded in `prisma/seed.ts` (`super_admin`,
  `principal`, `content_editor`, `approver`, `compliance_officer`, `grievance_officer`, `auditor`) is
  generic system taxonomy, not a confirmed real-world assignment.
- How should the compliance report / website URL submission to the Inspector of Colleges be tracked —
  `docs/database-design.md` §9 proposes a `ComplianceReportExport` model for this; needs confirmation it
  matches how the college actually wants to submit.
- Review-frequency cadence per content type (e.g. how often Notices vs. Faculty vs. Affiliation should be
  reviewed) is left as a policy decision for the college — see `docs/architecture.md` §12.
