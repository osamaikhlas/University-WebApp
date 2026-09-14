# Progress

Living log for the affiliated-college website and administration system. Update this file as work
happens — do not let it go stale (see `CLAUDE.md` rule 15).

## Status

**Phase 1 (project foundation), Phase 2 (database), Phase 3 (authentication &
authorization), Phase 4 (public website shell), the homepage, and CMS modules for College
Profile/Departments/Programs/Faculty/Staff/Notices/Events/Seminars/Workshops/Academic
Calendar/Timetables/Admissions/Fee Structures/Enrollment Statistics/Examinations/Results/
Documents/Infrastructure/Activities/Clubs/Gallery/Scholarships/Student Support/Policies/
Regulations/Affiliation/Contact/Location are all complete.** The stack is chosen and
scaffolded (Next.js + TypeScript + Tailwind + PostgreSQL/Prisma), the full data model for
every module in `CLAUDE.md`'s required scope exists as Prisma models, every `/admin/*`
route is behind real login + server-side, database-verified permission checks (see
`docs/permission-matrix.md`), and the public site's 20 sections now render real,
publish-gated database content through a shared shell. The homepage (`/`) is a
fully-fleshed, information-dense 15-section page. **Staff can now actually author content
through the admin UI** for 28 modules — list/view/create/edit pages plus the real content
approval workflow (`DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → PUBLISHED`, and
`PUBLISHED → UPDATE_REQUIRED → DRAFT`; every transition enforces permissions, records the
actor/timestamp/an optional comment, and writes an audit log entry, with a mandatory reason
on rejection), sharing one generic workflow engine and audit-log writer rather than 28
reimplementations of either — instead of
every admin page being `PagePlaceholder` and every table populated only by
`prisma/seed.ts`. All 4 permission domains (`content_general`, `content_admissions`,
`content_examinations`, `content_faculty`) have real CMS modules exercising them.
**The Compliance Dashboard (`/admin/compliance`) is now built too** — all 20 circular
requirements, each showing its number/title/description/required information/responsible
module/status/completeness/public page/last updated/last verified/verifier/evidence/reviewer
notes, with an automatic completeness check computed live against real database content and
a `verify`/`request_update` (reject-review)/`mark_not_applicable`/`reopen` workflow gated so
`VERIFIED` can only ever be reached by an authorized human reviewer (CLAUDE.md rule 7). The
other 4 admin modules (Grievances, Users/Roles/Permissions UI, Audit log viewer, Approval
workflow queue) are still placeholder-gated, not built — see `tests.json`'s `admin_system`
section.

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

- 2026-09-13 — **Implemented Phase 3: authentication and authorization** (per explicit
  instruction, using a user-specified exact list of 8 required roles superseding the
  Phase 1/`docs/architecture.md` §4 baseline role set):
  - Extended `prisma/schema.prisma`: added `Session` (server-side session store — the
    cookie holds only a high-entropy random token, DB stores only its SHA-256 hash, mirroring
    `passwordHash`), `User.failedLoginAttempts`/`lockedUntil` (login lockout), and
    `LOGIN_FAILED`/`LOGOUT` to `AuditAction`. Migrated (`prisma/migrations/
    20260913121742_add_auth_sessions/`) and applied against the local PostgreSQL instance.
  - Built `src/lib/auth/permissions.ts` as the single source of truth for the permission
    matrix: the 8 required roles (`SUPER_ADMIN`, `PRINCIPAL`, `ADMINISTRATOR`, `EDITOR`,
    `REVIEWER`, `ADMISSION_OFFICER`, `EXAMINATION_OFFICER`, `FACULTY_EDITOR`) × 22
    `<domain>:<action>` permissions across 4 content domains (general/admissions/
    examinations/faculty) plus grievances/compliance/users/roles/permissions/audit_logs/
    approval_workflow/dashboard. Design principles (documented in `docs/permission-matrix.md`):
    separation of duties (no role both `:manage`s and `:publish`es the same content domain,
    mirroring the "no self-approval" rule from `docs/architecture.md` §5), domain scoping for
    the 3 officer roles, and governance/system-admin access limited to
    `PRINCIPAL`/`ADMINISTRATOR`/`SUPER_ADMIN`. `prisma/seed.ts` seeds `Role`/`Permission`/
    `RolePermission` directly from this file (wholesale-replaces each role's grants on every
    seed run, so removing a permission from the matrix actually revokes it in the database),
    so the database can never drift from what the app enforces.
  - Built the auth runtime: `src/lib/auth/password.ts` (bcryptjs, cost 12),
    `src/lib/auth/session.ts` (session create/read/destroy; cookie is httpOnly, `sameSite:
    lax`, `secure` in production; 8-hour absolute expiry), `src/lib/auth/guard.ts`
    (`requireUser`/`requirePermission` — the actual security boundary, always re-reading the
    database, never trusting the cookie's own contents per CLAUDE.md rule 5),
    `src/lib/auth/actions.ts` (`login`/`logout` Server Actions: generic "invalid email or
    password" error with no user enumeration, lockout after `MAX_FAILED_ATTEMPTS=5` wrong
    attempts for `LOCKOUT_DURATION_MS=15min`, writes `AuditLog` rows for
    LOGIN/LOGIN_FAILED/LOGOUT). Learned mid-implementation that a `'use server'` file may
    only export async functions — exporting the lockout constants alongside `login`/`logout`
    silently zeroed out every export in the compiled module; moved them to
    `src/lib/auth/lockout.ts`.
  - Added `/login` (Server Component + `LoginForm` client component using React's
    `useActionState`) and `/admin/unauthorized`. Rewrote `src/app/admin/layout.tsx` to call
    `requireUser()` (redirects to `/login` otherwise) and render the signed-in user's
    identity + a real `logout` Server Action (`AdminUserBar`, replacing the Phase 1
    `AdminNoAuthBanner` placeholder, which is now deleted). Patched all 23
    `src/app/admin/*/page.tsx` files to call `requirePermission("<key>")` for their specific
    route, per `src/lib/auth/route-permissions.ts`'s route→permission mapping. `AdminSidebar`
    and the dashboard's module grid now filter to links the signed-in user can access (UX
    convenience only — every page still enforces its own check server-side regardless of
    what the sidebar shows).
  - `prisma/seed.ts` now also seeds one login-capable `[DEV SEED]` test account per role
    (`<role-slug>@example.invalid`, shared password `DevSeed!Passw0rd1`, overridable via
    `DEV_LOGIN_PASSWORD`), gated so this block never runs when `NODE_ENV=production`.
  - Tests: `tests/unit/auth/` (permissions, password, session, guard, actions,
    route-permissions, role-access — 6 files, all mocking Prisma/`next/headers`/
    `next/navigation` rather than touching a real database) plus `tests/e2e/auth.spec.ts`
    (logs in as each of the 8 seeded role accounts against the real dev server + seeded
    database, covering unauthenticated/authorized/unauthorized/role-specific access).
    Updated `tests/e2e/admin.spec.ts` (the old "no-auth banner" assertion no longer applies —
    it now asserts the real redirect-to-`/login` behavior). Installed the Playwright Chromium
    browser (unavailable in the Phase 1 environment) and **ran the full e2e suite for the
    first time in this project — all 18 tests pass**, not just listed/validated.
  - Ran `npm run typecheck`, `npm run lint`, `npm test` (64/64 unit tests passing), and
    `npm run build` (all `/admin/*` routes and `/login` correctly dynamic; public routes
    still static) — all clean.
  - Wrote `docs/permission-matrix.md` (roles table, full permission matrix, route→permission
    mapping, enforcement points, test-account reference) and updated `tests.json` with a new
    `auth` section plus `in_progress` status on the `adm-dashboard`/`adm-cms`/`adm-users`/
    `adm-roles`/`adm-permissions`/`adm-audit-logs` entries (permission-gated now, but still
    no real CRUD UI/API).

- 2026-09-13 — **Implemented Phase 4: public website shell** (per explicit instruction, with
  an explicit 20-route list — including Home — that **consolidates** the Phase 1 scaffold's
  29 one-per-circular-item routes into broader sections; see the decisions log below for the
  full old→new mapping):
  - Deleted the 13 now-redundant route folders (`academic-calendar`, `activities`,
    `college-profile`, `departments`, `history`, `infrastructure`, `location`,
    `non-teaching-staff`, `principals-message`, `programs`, `rules-regulations`,
    `timetable`, `vision-mission`) and created `academics`, `staff`, `campus`, `rules`.
    Updated `PUBLIC_NAV_LINKS` (`src/lib/navigation.ts`) and `tests/unit/routes.test.ts`
    (29 → 20) accordingly. Every dropped circular category still has its own clearly-headed
    section on a consolidated page (e.g. History and Vision/Mission are now `<h2>` sections
    within `/about`) rather than being silently dropped, per `CLAUDE.md`'s "none of them
    should be silently dropped" instruction.
  - Built the shared shell: `PublicHeader`/`PublicFooter` (now async, reading the real
    college name/contact info from the database instead of hard-coded copy),
    `MobileNav` (hamburger-triggered disclosure panel, closes on link click, no client-side
    routing bugs from `setState`-in-effect), `PublicPageShell` (the shared page
    container — breadcrumbs + heading + `Container`), and new `src/components/ui/`
    primitives: `Alert` (info/success/warning/danger, `role="status"` vs. `role="alert"`
    per WAI-ARIA), `EmptyState`, `DataTable` (a real semantic `<table>` in a horizontally-
    scrollable wrapper, never a styled `<div>` grid), `Breadcrumbs`, and `Skeleton`/
    `PageLoadingSkeleton` (the existing root `loading.tsx` spinner from Phase 1 already
    covers the generic per-navigation loading state; these are for in-page use). Added
    `DemoDataNotice` (`src/components/DemoDataNotice.tsx`) — shown next to any section
    rendering a row with `isPlaceholder: true`, so seed/demo content can never be mistaken
    for verified official content on the live page (rule 14), not just in the database.
  - Built `src/lib/content.ts`: one query function per section, every one of them filtering
    to `status: "PUBLISHED"` (rule 4) and scoped to `getPrimaryCollege()` (memoized per
    request via React's `cache()`). `Result` additionally requires `isPublic: true` — two
    independent flags both have to allow it. Documented one known gap: `Document` has no
    publish-state field of its own (it's a generic `(entityType, entityId)` attachment
    table — see `prisma/schema.prisma` §15), so `/downloads` currently lists every document
    for the college rather than filtering by a parent entity's publish state.
  - Wrote all 20 page components against this query layer + shell, each showing a real
    `EmptyState` (never fabricated rows) when its query returns nothing. `/search` is a
    plain GET form (`searchSite()` in `content.ts`) — works without client JS, searches
    Notice/Event/Program/Faculty/Scholarship/Policy titles, published-only.
  - Built a real, working **Grievance submission form** (`src/app/(public)/grievance/`):
    a Server Action (`actions.ts`) validates input with Zod and writes to `Grievance`,
    encrypting `submitterContact` with AES-256-GCM (`src/lib/security/crypto.ts`,
    `GRIEVANCE_ENCRYPTION_KEY` — 64 hex chars / 32 bytes, added to `env.ts` as optional
    presence/format-only per the existing pattern, generated for local `.env`, documented
    in `.env.example`) before it ever reaches Prisma — the schema comment on that column
    ("App layer must encrypt this at rest") is now actually honored. This file has no query
    that lists submissions back to any caller (rule 6: grievance data is private by
    default); the confirmation message is the only thing rendered after a successful
    submit.
  - **Found and fixed a real bug** while visually checking the build with Playwright
    screenshots: the desktop header's horizontally-scrolling nav (`overflow-x-auto`) had no
    `min-w-0`/`flex-1` on its flex parent, so instead of scrolling within its own box it
    silently pushed the *entire header* (and thus the page) wider than the viewport at
    1280px — a real horizontal-overflow bug that unit/typecheck/lint couldn't have caught.
    Fixed in `PublicHeader.tsx`; re-verified with `document.documentElement.scrollWidth <=
    clientWidth` at both 1280px and 390px widths, and via new/updated screenshots.
  - **Found and fixed a second real bug**: every public content page was being statically
    prerendered at build time (Next/Turbopack defaults to static when a page uses no
    dynamic API), which would have baked in whatever the database held *at build time* and
    silently gone stale — directly at odds with rule 4's "kept accurate and regularly
    updated" spirit and with how an admin-editable CMS is supposed to work. Added
    `export const dynamic = "force-dynamic"` to all 20 public pages; confirmed via
    `next build`'s route table that every one is now `ƒ` (server-rendered per request) not
    `○` (static).
  - Updated `prisma/seed.ts` so its ~30 demo content rows are actually visible on the public
    site: added `status: "PUBLISHED"` (`isPlaceholder: true` stays) to every `create` block,
    **and mirrored the same fields into each `update` branch** — without that second part,
    re-running the already-existing seed on this repo's real database was a no-op (the rows
    already existed from Phase 2, so `upsert`'s `update: {}` branch fired and never touched
    `status`), which is exactly the bug the first e2e run against real data caught. Flipped
    `dev-seed-result`'s `isPublic` to `true` so `/results` has something to show, as a
    deliberate, documented example of rule 4's gate actually working (every other row keeps
    its own independent publish state).
  - Tests: `tests/unit/ui/*` (Alert, EmptyState, DataTable, Breadcrumbs),
    `tests/unit/content/queries.test.ts`, `tests/unit/security/crypto.test.ts`,
    `tests/unit/grievance/actions.test.ts` (28 new unit tests, 95/95 passing overall), and a
    new `tests/e2e/public-content.spec.ts` (database-backed content rendering, demo-data
    marking, breadcrumbs, mobile nav open/close, search, grievance submission — 9 tests).
    Updated `tests/e2e/admin.spec.ts`'s Phase-1-era selectors were already fixed in Phase 3;
    `tests/e2e/public-site.spec.ts` needed no changes. **Ran the full Playwright suite for
    real (27/27 passing)**, plus `npm run typecheck`, `npm run lint`, `npm test` (95/95), and
    `npm run build` — all clean.
  - Updated `tests.json` with new `public_shell` and rewritten `public_website` sections
    (20 entries, replacing the old 29), and `docs/permission-matrix.md` is unaffected (no
    admin-side change this phase).

- 2026-09-14 — **Implemented the homepage** (per explicit instruction: 15 required
  sections, information-focused, all changeable content from the database, optimized for
  mobile/accessibility/performance/SEO):
  - Built all 15 sections as independent components under `src/components/home/` (`Hero`,
    `AnnouncementBanner`, `QuickLinks`, `NoticesSection`, `EventsSection`, `IntroSection`,
    `ProgramsSection`, `DepartmentsSection`, `FacilitiesSection`, `ActivitiesSection`,
    `SupportSection`, `DocumentsSection`, `GrievanceCallout`, `LocationSection`,
    `ContactSection`), each reading from `src/lib/content.ts` — no hard-coded institutional
    data anywhere; only navigational/UI chrome (link labels, section headings) is a literal
    string. Added two new queries: `getImportantAnnouncement` (latest notice that hasn't
    expired — deliberately not a `category` naming convention, since a college's own tagging
    can't be relied on) and `getUpcomingEvents` (`startDate >= now`, soonest first).
  - **Performance**: every section below the hero is wrapped in its own `<Suspense
    fallback={<SectionSkeleton />}>` (new component in `src/components/ui/Skeleton.tsx`) so
    one slow query streams in independently instead of blocking the rest of the page. `Hero`
    itself is awaited directly, unstreamed — it's the LCP element and the `<h1>` source, so it
    belongs in the initial HTML, not behind a skeleton.
  - **Accessibility**: added a real skip-to-main-content link. Found during e2e testing that
    a plain `<a href="#main-content">` doesn't actually work in Chromium — it scrolls to the
    target but does not move keyboard focus for a `tabindex="-1"` element, a known
    cross-browser gap. Fixed with a small client component (`src/components/SkipLink.tsx`)
    that explicitly calls `.focus()` on click/activation. Added `id="main-content"
    tabIndex={-1}` to both the public and admin layouts' `<main>` so the same skip link works
    everywhere.
  - **SEO**: `generateMetadata` on the homepage now builds title/description from
    `CollegeProfile`/`College` (falling back to the same placeholder copy as everywhere
    else), plus canonical/Open Graph/Twitter tags. Found and fixed a real bug: returning a
    plain string title let the root layout's `template: "%s | <site name>"` apply a second
    time, producing "`<site name> | <site name>`" — fixed with `title: { absolute: title }`.
    Added `src/app/sitemap.ts` and `src/app/robots.ts` (generated from `PUBLIC_NAV_LINKS`,
    excluding `/admin`/`/login`). Added `src/lib/seo.ts`'s `buildCollegeJsonLd` for
    schema.org `CollegeOrUniversity` structured data — deliberately stricter than the rest of
    the site: a search engine has no UI to show `DemoDataNotice` next to a JSON-LD field, so
    this omits any field (or the whole block) still backed by `isPlaceholder: true` data
    rather than publish it as fact (CLAUDE.md rules 1/14 applied to machine-readable output,
    not just the rendered page).
  - Added `NEXT_PUBLIC_SITE_URL` to `env.ts` (optional, defaults to `localhost:3000`) to
    build the absolute URLs `sitemap.xml`/`robots.txt`/canonical tags require.
  - Added `LinkButton` to `src/components/ui/Button.tsx` (a `<Link>` styled identically to
    `Button`, for the hero's navigating CTAs — kept as a real anchor rather than a
    button-with-onClick-navigate, for both accessibility and crawlability).
  - **Found and fixed a real data bug** while writing the e2e tests: the seed's
    `dev-seed-event` row's `startDate` was set to `new Date()` only in the upsert's `create`
    branch; because the row already existed from earlier phases, every re-seed took the
    `update` branch instead, which didn't touch `startDate` — so it stayed frozen at whatever
    moment it was first created and was already in the past, silently breaking
    `getUpcomingEvents()`'s `startDate >= now` filter. Fixed by mirroring `startDate` (30
    days out) into `update` too, and added a second, deliberately-expired demo notice
    (`dev-seed-notice-expired`) purely so `getImportantAnnouncement`'s exclusion logic has
    something real to prove itself against.
  - Verified visually with real Playwright screenshots at 1280px and 390px widths (no
    horizontal overflow at either), and confirmed keyboard tab order (skip link is the first
    stop) and JSON-LD omission (zero `<script type="application/ld+json">` tags while the
    seeded college is still placeholder) directly against a running dev server.
  - Tests: `tests/e2e/homepage.spec.ts` (11 tests — all 15 sections present, announcement/
    upcoming-events filtering, quick links/grievance callout navigation, skip link, heading
    structure, SEO metadata, JSON-LD omission, sitemap/robots reachability, mobile overflow),
    plus new unit tests (`tests/unit/seo.test.ts`, `tests/unit/sitemap-robots.test.ts`, and
    additions to `tests/unit/content/queries.test.ts` for the two new queries) — **113/113
    unit tests and 38/38 e2e tests passing**, `npm run typecheck`/`npm run lint`/`npm run
    build` all clean.
  - Updated `tests.json` with a new `homepage` section (9 items) and rewrote the `pub-home`
    entry to describe all 15 sections.
  - **Recorded a process mistake for the record**: while updating `tests.json`'s
    `lastUpdated` timestamp, a `git checkout -- tests.json` (intended to undo an unrelated
    formatting mistake from an earlier `json.dump` reformat) instead discarded the entire
    file back to its original pre-Phase-3 committed state, since none of this work has been
    committed yet. Recovered by reconstructing the file from this session's own conversation
    history (every prior edit was still visible in-context) rather than from disk — verified
    the reconstruction's shape (20 public routes, 23 admin routes, 9 auth items, 5 shell
    items, 9 homepage items) before moving on. No content was actually lost, but this is a
    reminder that `git checkout` on an uncommitted-since-day-one file is effectively
    irreversible from git's own history — worth committing progress periodically going
    forward specifically so `git` itself becomes a recovery option.

- 2026-09-14 — **Implemented CMS modules for College Profile, Departments, Programs,
  Faculty, and Staff** (per explicit instruction: list/view/create/edit + draft/review/
  publish/archive workflow, role permissions applied, tests added):
  - Built one shared, generic engine instead of 5 duplicated ones:
    `src/lib/content-workflow.ts` (the `DRAFT → PENDING_REVIEW → APPROVED → PUBLISHED`
    state machine plus `ARCHIVED` reachable from anywhere non-terminal; `applyWorkflowTransition`
    validates the transition, applies it via an injected per-model `update` callback, sets
    `publishedAt`/`publishedBy` only on publish, and writes the audit entry — this is what
    `docs/implementation-plan.md`'s original Phase 2 goal, "the shared draft → review →
    publish machinery... built once," turned out to actually be, now that there's real
    content to hang it on) and `src/lib/audit.ts` (`logAudit`, the first reusable
    non-login/logout `AuditLog` writer, serializing `Date` fields to plain JSON for
    Prisma's `Json` columns).
  - `src/lib/admin/module-permissions.ts` maps each module to its permission domain from
    Phase 3's matrix: College Profile/Departments/Programs → `content_general` (EDITOR
    manages, REVIEWER/PRINCIPAL publish); Faculty/Staff → `content_faculty` (FACULTY_EDITOR
    manages, REVIEWER/PRINCIPAL publish) — no new permissions needed, the Phase 3 matrix
    already anticipated exactly this split. `create`/`edit` require `manage`;
    `approve`/`reject`/`publish`/`archive` require `publish` — since no role except
    `SUPER_ADMIN` holds both for the same module, self-approval is structurally impossible,
    not just discouraged (verified directly in `tests/unit/admin/module-permissions.test.ts`
    by cross-checking against the live `ROLE_PERMISSIONS` matrix).
  - Shared UI: `StatusBadge` (5-state color coding), `WorkflowActions` (renders one
    `<form>`-per-button for whichever transitions are currently legal *and* the viewer is
    allowed to perform — a UX convenience only; every button's target Server Action
    independently re-derives the permission and re-validates the transition against the
    record's live database status), `StatusFilter` (status tabs on every list page, driven
    by `?status=`).
  - Departments, Programs, Faculty, Staff each get `page.tsx` (list), `new/page.tsx`
    (create), `[id]/page.tsx` (view + workflow actions + Edit link), `[id]/edit/page.tsx`,
    an `actions.ts` (`create*`/`update*`/`transition*` Server Actions), and a form
    component. College Profile is a singleton (`CollegeProfile.collegeId` is `@unique`) —
    same shape, but "list" is really "the one profile" and `create` redirects to `edit`
    once a profile already exists rather than erroring. Programs/Faculty forms include a
    department `<select>` (validated server-side against the submitting college, not just
    trusted from the client); Faculty's `subjectsTaught` `String[]` is a comma-separated
    text input parsed/joined at the boundary.
  - Added `/admin/college-profile` and `/admin/departments` to `ADMIN_NAV_LINKS` and
    `ADMIN_ROUTE_PERMISSIONS` (Programs/Faculty/Staff already existed as placeholder routes
    from Phase 1, now replaced with the real modules) — admin route count 23 → 25.
  - Every admin-authored record is created with `isPlaceholder: false` (only
    `prisma/seed.ts` ever sets `true` — CLAUDE.md rules 13/14: real staff input is never
    demo data, regardless of how sparse it is).
  - Added a project-wide ESLint rule (`argsIgnorePattern: "^_"` for
    `@typescript-eslint/no-unused-vars`) since every `transition*` action needs an unused
    trailing `formData` parameter to match the signature `<form action={fn.bind(...)}>`
    expects — needed once, reused by all 5 modules.
  - Tests: `tests/unit/content-workflow.test.ts` (13), `tests/unit/audit.test.ts` (3),
    `tests/unit/admin/module-permissions.test.ts` (8), and one `actions.test.ts` per module
    under `tests/unit/admin/<module>/` (departments 11, programs 7, faculty 6, staff 5,
    college-profile 7) — 60 new unit tests (113 → 173 project-wide). Plus two e2e specs
    against the real dev server + seeded database: `tests/e2e/cms-departments.spec.ts` (10
    tests — the full
    EDITOR-creates → REVIEWER-approves/publishes/archives lifecycle, ADMINISTRATOR
    view-only, FACULTY_EDITOR blocked by wrong domain, and the published department
    actually appearing on the public `/academics` page) and `tests/e2e/cms-faculty.spec.ts`
    (5 tests — the `content_faculty` domain, department-FK select, and array field).
  - **Found and fixed two real e2e testing bugs** (not application bugs) while writing
    these specs: (1) `page.waitForURL(/\/admin\/departments\/[^/]+$/)` also matches the
    literal `/admin/departments/new` route (since `"new"` satisfies `[^/]+`), and
    `waitForURL` resolves immediately if the *current* URL already matches — so it captured
    a stale URL before the real create-and-redirect had finished. Fixed by waiting for
    content that only exists on the real view page before reading `page.url()`. (2) Every
    `waitForURL(sameUrl)` after a transition click is a complete no-op, because
    `transition*` always redirects back to the exact URL the click originated from — so it
    never actually waited for the mutation, and under heavy parallel e2e load (many
    Playwright workers hitting the `next dev` server at once) this surfaced as a real,
    reproducible intermittent failure where the next test observed stale (pre-transition)
    data. Fixed by replacing every such wait with a content-based assertion (the resulting
    status text becoming visible) with a generous timeout; re-ran the full e2e suite three
    times after the fix with zero flakes.
  - **Ran the full suite for real**: `npm run typecheck`/`npm run lint`/`npm run build` all
    clean; `npm test` (unit) and `npx playwright test` (e2e, 3 consecutive clean runs) both
    fully green — see the exact counts in `tests.json`'s `cms_modules` section.
  - Updated `tests.json` with a new `cms_modules` section and flipped `adm-college-profile`
    (new entry), `adm-departments` (new entry), `adm-programs`, `adm-faculty`, and
    `adm-staff` from `not_started`/absent to `passing`.
- 2026-09-14 — **CMS modules implemented for Notices, Events, Seminars, Workshops, Academic
  Calendar, and Timetables**, extending the same shared engine (`src/lib/content-workflow.ts`
  + `src/lib/audit.ts` + `src/lib/admin/module-permissions.ts`) built for the first 5 modules
  — confirming it generalizes rather than needing per-module rework. All 6 fall under the
  existing `content_general` permission domain; no new domain was needed.
  - Added `src/lib/admin/zod-helpers.ts` (`requiredDateField`, `optionalDateField`,
    `toDateInputValue`) — the first shared code these modules needed, since they're the
    first CMS modules with date fields. `requiredDateField`/`optionalDateField` validate an
    HTML `<input type="date">` string and transform it straight to a `Date`; invalid dates
    are rejected with a field-level Zod error rather than silently becoming `Invalid Date`.
  - Notices: title/body required, category/publishDate/expiryDate optional.
  - Events: title required, description/location optional, startDate required, endDate
    optional.
  - Seminars/Workshops: near-identical modules (Seminars has `speaker`, Workshops has
    `facilitator`), each with an **optional** Department FK — a `resolveDepartmentId`
    helper treats "no department selected" as valid (college-wide), and separately rejects a
    submitted department id that doesn't belong to the current college.
  - Academic Calendar: title/startDate required, description/endDate/category/academicYear
    optional, no FK.
  - Timetables: the first module with a **required** FK (Program, via `resolveProgramId` —
    creation is refused without a valid program, unlike Seminars/Workshops' optional FK) and
    the first with a `Json?` field (`structuredSchedule`, edited as raw JSON text in a
    monospace `<textarea>`); the Zod schema round-trips it through `JSON.parse` inside a
    `.refine()` so malformed JSON is rejected with a clear error on both create and edit,
    and an omitted schedule is left `undefined` (create) / explicit `null` (update) rather
    than ever inventing a schedule.
  - Added `content_general` permission-domain entries for all 6 modules to
    `src/lib/admin/module-permissions.ts`, nav links for Seminars/Workshops to
    `src/lib/navigation.ts` (Notices/Events/Academic Calendar/Timetables already had
    placeholder nav entries), and route-permission entries for the two new routes to
    `src/lib/auth/route-permissions.ts`.
  - Tests: `tests/unit/admin/zod-helpers.test.ts` (8) plus one `actions.test.ts` per module
    under `tests/unit/admin/<module>/` (notices, events, seminars, workshops,
    academic-calendar, timetables) — 40 new unit tests (173 → 213 project-wide). Plus two
    e2e specs against the real dev server + seeded database: `tests/e2e/cms-notices.spec.ts`
    (10 tests — full EDITOR→REVIEWER lifecycle including date fields, public `/notices`
    visibility, ADMINISTRATOR view-only, FACULTY_EDITOR blocked) and
    `tests/e2e/cms-timetables.spec.ts` (6 tests — required-FK + JSON-field lifecycle,
    malformed-JSON rejection on edit, public `/academics` visibility, wrong-domain role
    blocked).
  - **Found and fixed three more real e2e testing bugs** (all in the test code, not the
    app) while writing `cms-timetables.spec.ts`: (1) ambiguous `getByLabel(/^program$/i)`
    style matchers silently matched the wrong element (the sidebar's "Programs" nav link is
    also a case-insensitive substring match), making `selectOption`/`fill` target nothing
    useful — fixed with direct `#id` locators, the more precise choice whenever a form's
    labels aren't guaranteed unique against the rest of the page. (2) A more subtle timing
    bug: even after switching to content-based waits (`expect(...).toBeVisible()`), reading
    `page.url()` on the very next line could still capture the stale `/admin/timetables/new`
    URL — confirmed via manual Playwright debug scripts that the DOM for the new page can
    attach a few hundred milliseconds *before* the browser's address bar/history actually
    commits during a Next.js client-side transition, so a content-only wait doesn't
    guarantee the URL has updated yet. Fixed with an explicit
    `page.waitForURL((url) => !url.pathname.endsWith("/new"))` before reading `page.url()`.
    (3) A test-logic bug distinct from both of the above: calling `loginAs(page, "editor")`
    and then, later in the *same* test, `loginAs(page, "reviewer")` on the same page/context
    hung indefinitely, because the app correctly redirects an already-authenticated session
    straight from `/login` to `/admin` — the login form's email field never renders for the
    second `loginAs` call to fill. Fixed by splitting the two roles' steps into separate
    `test()` blocks (each gets Playwright's default fresh context), matching the pattern
    `cms-notices.spec.ts`/`cms-departments.spec.ts` already used correctly. Generalizable
    lesson: never call `loginAs` more than once per `test()` block with a different role.
  - **Ran the full suite for real**: `npm run typecheck`/`npm run lint`/`npm run build` all
    clean; `npm test` (213/213 unit) and `npx playwright test` (66/66 e2e, 3 consecutive
    clean full-suite runs) both fully green.
  - Updated `tests.json`'s `cms_modules` section with 10 new entries and flipped
    `adm-notices`, `adm-events`, `adm-timetables`, and `adm-academic-calendar` from
    `not_started` to `passing`, plus added new `adm-seminars`/`adm-workshops` entries
    (`passing`) — Seminars/Workshops aren't their own top-level circular section (they fold
    into the public site's consolidated `/events` page per the Phase 4 route consolidation)
    but got dedicated admin CMS modules per this session's explicit instruction.
- 2026-09-14 — **CMS modules implemented for Admissions, Fee Structures, Enrollment
  Statistics, Examinations, Results, and Downloads/Documents**, extending the same shared
  engine to the last two permission domains that had no real CMS module yet
  (`content_admissions`, `content_examinations`) and closing a long-tracked known gap
  (Document's missing publish lifecycle).
  - Admissions: required Program FK, optional eligibilityCriteria/applicationStartDate/
    applicationEndDate.
  - Fee Structures: required Program FK, optional Admission FK (via a `resolveAdmissionId`
    helper mirroring the Seminar/Workshop optional-FK pattern), a required Decimal `amount`,
    and `currency` defaulting to "PKR" when left blank.
  - Enrollment Statistics: required Program FK, required `totalEnrolled`, optional
    `maleCount`/`femaleCount`.
  - Examinations: required Program FK, optional Notice FK (`resolveNoticeId`), optional
    academicYear/scheduleStartDate/scheduleEndDate.
  - Results: required Program + Examination FKs, an `isPublic` checkbox implementing the
    module's double publish gate (a result reaches the public `/results` page only once it
    is both `status: PUBLISHED` and `isPublic: true` — see the 2026-09-14 decisions log entry
    below), and an optional externalLink.
  - Downloads/Documents: authors the general (not attached to any other record) downloadable
    documents shown on the public Downloads page. Added `status`/`publishedAt`/`publishedBy`
    to the `Document` model for the first time (it previously had no publish lifecycle at
    all — see `db-migration`/`shell-content-queries` entries below) via
    `prisma/migrations/20260914090529_add_workflow_fields_admissions_documents`, applied
    with zero drift. `getDocuments()` (`src/lib/content.ts`) now filters on
    `status: "PUBLISHED"` instead of returning every document for the college unconditionally
    — closing a gap flagged since Phase 4. `prisma/seed.ts`'s `dev-seed-document` was updated
    to set `status: "PUBLISHED"` to match every other seeded content row, so it doesn't
    silently vanish from `/downloads` under the new gate.
  - Also added `publishedAt`/`publishedBy` to `FeeStructure`, `EnrollmentStatistic`, and
    `Result` (same migration) — these 3 models had `status` but no publish-timestamp
    columns, which the shared `applyWorkflowTransition` engine unconditionally tries to set
    on a `publish` transition; every other CMS module already had both columns, so this was
    the first time the gap surfaced.
  - Tests: one `actions.test.ts` per module under `tests/unit/admin/<module>/` (admissions,
    fee-structures, enrollment-statistics, exams, results, documents) — 41 new unit tests
    (213 → 254 project-wide). Plus two e2e specs against the real dev server + seeded
    database: `tests/e2e/cms-admissions.spec.ts` (6 tests — first e2e coverage of the
    `content_admissions` domain: ADMISSION_OFFICER creates+submits, REVIEWER
    approves+publishes, ADMINISTRATOR is view-only, EXAMINATION_OFFICER wrong-domain
    blocked, published cycle visible on `/admissions`) and `tests/e2e/cms-results.spec.ts`
    (7 tests — first e2e coverage of `content_examinations`, and a direct demonstration of
    the double publish gate: publishes a result while `isPublic` stays false and confirms
    it's still absent from `/results` by its unique `externalLink`, then — as the same
    EXAMINATION_OFFICER who authored it, reusing the "editing doesn't revert status" policy
    from the 2026-09-14 decisions log — edits it to set `isPublic: true` and confirms it now
    appears).
  - **Found and fixed a real Zod correctness bug** while building Enrollment Statistics:
    `z.coerce.number().min(0).optional().or(z.literal(""))` (the pattern already used for
    College Profile's `establishedYear`) silently turns a *blank* `maleCount`/`femaleCount`
    field into `0` rather than `null`, because `Number("") === 0` already satisfies
    `min(0)` before the `z.literal("")` fallback branch is ever tried — unlike
    `establishedYear`, whose `min(1800)` bound reliably fails for a coerced-to-0 blank value
    and so always falls through correctly. This is a CLAUDE.md rule 1 violation risk (an
    admin leaving a field blank would have their form silently record a real, specific `0`
    instead of "not recorded"), not just a style nit. Fixed by passing
    `formData.get(x) || undefined` into a plain `.optional()` schema instead of routing a
    literal empty string through number coercion at all — this pattern should be preferred
    over the `establishedYear`-style `.or(z.literal(""))` trick for any future optional
    numeric field whose valid range includes 0.
  - **Found and fixed a Prisma `Decimal` serialization issue** while building Fee
    Structures: `Decimal` is a class instance, not a plain serializable value, so passing a
    Prisma row with a `Decimal` field (here, `amount`) directly from a Server Component into
    a `"use client"` form component fails. Fixed by having the edit page convert it to a
    plain string (`{ ...feeStructure, amount: feeStructure.amount.toString() }`) before
    passing it down, with the client form's prop type reflecting that pre-serialized shape.
    Generalizable to any future Decimal-bearing admin form.
  - **Ran the full suite for real**: `npm run typecheck`/`npm run lint`/`npm run build` all
    clean; `npm test` (254/254 unit) and `npx playwright test` (79/79 e2e, 3 consecutive
    clean full-suite runs) both fully green.
  - Updated `tests.json`'s `cms_modules` section with 8 new entries; flipped
    `adm-admissions`, `adm-exams`, `adm-results`, and `adm-documents` from `not_started` to
    `passing`; added new `adm-fee-structures`/`adm-enrollment-statistics` entries
    (`passing`); flipped `pub-admissions` and `pub-results` to `passing` now that they have
    dedicated e2e coverage; and updated the `shell-content-queries`/`pub-downloads` notes to
    reflect the closed Document publish-gate gap.
- 2026-09-14 — **CMS modules implemented for Infrastructure, Activities, Clubs, Gallery,
  Scholarships, Student Support, Policies, Regulations, Affiliation, Contact, and
  Location** — the largest single CMS batch yet (11 modules), completing every
  `content_general` and `content_faculty` module remaining after the prior sessions. All
  4 permission domains now have real CMS coverage (this batch doesn't add a new domain;
  Clubs becomes the third `content_faculty` module alongside Faculty/Staff).
  - Infrastructure: required `InfrastructureCategory` enum select, no FK.
  - Activities: title/optional category/description, no FK.
  - Clubs (`content_faculty`): optional Faculty FK as advisor, via a `resolveFacultyAdvisorId`
    helper mirroring the established optional-FK pattern.
  - Policies / Regulations: near-identical simple modules (title/category/body; Regulations
    adds `regulatingBody`), no FK.
  - Affiliation: optional Program FK (college-wide when omitted) plus optional
    validFrom/validTo dates.
  - Contact: required `ContactType` enum select, no FK.
  - Location: the **second true singleton module** after College Profile — but unlike
    `CollegeProfile.collegeId` (which is `@unique`), `Location.collegeId` has no unique
    constraint, so the existence guard uses `findFirst` instead of `findUnique`, matching
    `getLocation()` in `src/lib/content.ts`.
  - Gallery: the **first nested-resource CMS module** — `GalleryAlbum` (a normal
    list/view/create/edit module) containing `GalleryItem`s, where adding an item creates a
    fresh `Media` asset (`url`, required accessibility `altText`, `mediaType`) in the same
    Server Action rather than requiring a separate media-library step first. The new
    `Media` row is attached to the album (`entityType: "GalleryAlbum"`, `entityId:
    albumId`) rather than back to the item, since the item doesn't exist yet at the point
    the Media row is created. Editing an item updates both the `Media` row and the
    `GalleryItem` row in one action.
  - Added `publishedAt`/`publishedBy` to `Contact` and `Location` — like `FeeStructure`/
    `EnrollmentStatistic`/`Result` before them, both models had `status` but not the
    publish-timestamp columns the shared `applyWorkflowTransition` engine needs on a
    `publish` transition (`prisma/migrations/20260914093028_add_workflow_fields_contact_location`,
    applied with zero drift).
  - Added 8 new admin nav links (Activities, Clubs, Infrastructure, Policies, Regulations,
    Affiliation, Contact, Location) to `ADMIN_NAV_LINKS`; Gallery/Scholarships/Student
    Support already had placeholder routes from Phase 1, so those 3 only needed their
    `page.tsx` (and supporting files) replaced, not new nav entries.
  - Tests: one `actions.test.ts` per module under `tests/unit/admin/<module>/`
    (infrastructure, activities, clubs, gallery — covering both album and item actions,
    scholarships, student-support, policies, regulations, affiliation, contact, location) —
    58 new unit tests (254 → 312 project-wide). Plus two e2e specs against the real dev
    server + seeded database: `tests/e2e/cms-gallery.spec.ts` (6 tests — the full nested
    album→item lifecycle: EDITOR creates an album, adds an item, submits both for review,
    REVIEWER approves+publishes both, both appear on the public `/gallery` page; also
    confirms FACULTY_EDITOR is blocked — wrong domain) and `tests/e2e/cms-location.spec.ts`
    (4 tests — run against the already-`PUBLISHED` seeded location rather than a
    from-scratch create, since the database always has exactly one: confirms the `/new`
    page redirects away via the `findFirst`-based singleton guard, that editing a
    `PUBLISHED` location doesn't revert its status, and that the edit is reflected on the
    public `/campus` page).
  - **Found and fixed one test-authoring bug** (not an application bug) while writing
    `cms-location.spec.ts`: the test initially expected `/admin/location/new` to redirect
    to `/admin/location/edit` when a location already exists. Re-reading College Profile's
    own `new/page.tsx` (the established singleton precedent) showed the convention is the
    opposite: a page-load "already exists" guard redirects to the plain **view** page, and
    only the create Server Action itself (reached if a client somehow still POSTs stale
    form state) redirects to **edit**. `src/app/admin/location/new/page.tsx` was already
    written consistently with that convention — only the test's expectation was wrong.
    Generalizable lesson: when writing e2e coverage for a singleton module, check the
    existing singleton's own redirect targets before asserting new ones from first
    principles.
  - Gallery's e2e spec and every unit test file passed cleanly on the first real run — no
    other new e2e bugs found in this batch, a sign the established patterns (content-based
    waits, `#id` locators, one role per `test()` block, `resolveXId` helpers for optional
    FKs) have converged into something reliably reusable across very different module
    shapes (enum selects, singletons, nested resources).
  - **Ran the full suite for real**: `npm run typecheck`/`npm run lint`/`npm run build` all
    clean; `npm test` (312/312 unit) and `npx playwright test` (89/89 e2e, 3 consecutive
    clean full-suite runs) both fully green.
  - Updated `tests.json`'s `cms_modules` section with 13 new entries; flipped
    `adm-gallery`, `adm-scholarships`, and `adm-student-support` from `not_started` to
    `passing`; added new `adm-activities`/`adm-clubs`/`adm-infrastructure`/`adm-policies`/
    `adm-regulations`/`adm-affiliation`/`adm-contact`/`adm-location` entries (`passing`);
    flipped `pub-campus` and `pub-gallery` to `passing` now that they have dedicated e2e
    coverage; and updated `pub-events`/`pub-scholarships`/`pub-student-support`/`pub-rules`/
    `pub-affiliation`/`pub-contact` notes to point at their new admin CMS modules.

- 2026-09-14 — **Replaced the shared content workflow engine with the explicit content
  approval workflow required for this project** (per explicit instruction: `DRAFT ->
  SUBMITTED -> UNDER_REVIEW -> APPROVED -> PUBLISHED`, and `PUBLISHED -> UPDATE_REQUIRED ->
  DRAFT`; every transition enforces permissions, stores actor/timestamp/comment, and writes
  an audit log; rejection requires a reason; only PUBLISHED content is public) — decided
  (see the decisions log below) to migrate this in place across all 28 existing CMS modules
  rather than add it as a second, parallel engine:
  - **Schema**: replaced the `ContentStatus` enum's `PENDING_REVIEW`/`ARCHIVED` values with
    `SUBMITTED`/`UNDER_REVIEW`/`UPDATE_REQUIRED` (`DRAFT`/`APPROVED`/`PUBLISHED` unchanged);
    added `SUBMIT`/`START_REVIEW`/`REQUEST_UPDATE`/`RETURN_TO_DRAFT` to `AuditAction`; added
    `AuditLog.comment` (`String?`) to hold each transition's comment/reason, since storing it
    only in the `Json` before/after snapshots would make it unqueryable and easy to overlook.
    Migration `prisma/migrations/20260914150000_content_approval_workflow_v2` was hand-written
    (not `prisma migrate dev`, which refuses to run non-interactively) with an explicit
    `CASE`-based remap (`PENDING_REVIEW -> SUBMITTED`, `ARCHIVED -> DRAFT`) for every one of
    the ~30 content tables' `status` columns, applied for real against the local Postgres
    instance via `prisma migrate deploy` with zero drift afterward — though in practice no
    row in the seeded dev database actually held either removed value, so this ran as a
    schema-only change.
  - **Engine** (`src/lib/content-workflow.ts`, fully rewritten): 7 actions
    (`submit_for_review`, `start_review`, `approve`, `reject`, `publish`, `request_update`,
    `return_to_draft`) implementing the exact required chain plus the reject-to-DRAFT
    shortcut from `UNDER_REVIEW` (decided over adding a distinct `REJECTED` status — see
    decisions log). `applyWorkflowTransition` now takes an optional `comment`, throws
    `WorkflowError` if `reject` is called with an empty/whitespace-only one, and always
    writes it (when present, for any action) onto the `AuditLog` row it creates — actor and
    timestamp were already covered by that row's existing `actorId`/`createdAt` columns, so
    "store timestamp"/"store actor" needed no new fields, just the existing audit-log write
    firing on every transition (already true before this change). New
    `MANAGE_PERMISSION_ACTIONS` constant classifies `submit_for_review`/`return_to_draft` as
    author-tier actions and everything else as reviewer/publisher-tier (decided as two
    distinct actions/actors for `submit`→`start_review` — see decisions log), and a new
    `isPubliclyVisible()` helper (true only for `PUBLISHED`) gives `src/lib/content.ts`'s
    already-correct `status: "PUBLISHED"`-only queries a named, testable assertion of rule 4
    rather than leaving it implicit.
  - **UI**: `WorkflowActions` (`src/components/admin/WorkflowActions.tsx`) rewritten to
    render one shared `<textarea name="comment">` plus one submit button per legal action,
    each button overriding its target via `formAction` (a plain HTML attribute Next.js
    Server Actions support) so the one comment field's value reaches whichever action's
    `formData` regardless of which button was clicked — no client JS needed, preserving the
    "pure server-rendered forms" design principle from the original engine. A
    `workflowError` prop (new) renders a `role="alert"` `<Alert>` when a transition's Server
    Action redirects back with `?workflowError=<message>` (a real, user-facing case now —
    "reject with no reason" — not just the previous benign stale-button race). `StatusBadge`/
    `StatusFilter` updated to the 6 new status labels/colors (`UPDATE_REQUIRED` uses the
    `danger` token, since it means the public site currently has a flagged/no-longer-good
    version live).
  - **All 28 modules' `actions.ts`** (identical hand-written pattern, so transformed via a
    scripted regex rewrite rather than 28 manual edits — verified against every file
    afterward): `transition*` now reads `formData.get("comment")`, passes it through to
    `applyWorkflowTransition`, checks `MANAGE_PERMISSION_ACTIONS.has(action)` instead of the
    old `action === "submit_for_review"` literal, and on `WorkflowError` redirects with
    `?workflowError=${encodeURIComponent(error.message)}` instead of silently swallowing it.
    **All 29 view pages** (`[id]/page.tsx` plus the 2 singleton pages, College Profile and
    Location) similarly gained a `searchParams` prop, extracted `workflowError`, and pass it
    to `WorkflowActions`. The ~24 `new`/`edit` pages' FK-picker queries (e.g. "which
    Departments can this Faculty record reference") dropped their `status: { not: "ARCHIVED"
    }` filter — with `ARCHIVED` gone there is no longer an "excluded" status, so every
    non-deleted record is now offered (previously DRAFT/SUBMITTED/etc. records were *already*
    offered; only `ARCHIVED` was ever excluded).
  - Tests: `tests/unit/content-workflow.test.ts` rewritten (13 → 32 tests) to cover every one
    of the 7 transitions (parameterized), the reason-required-for-reject rule (empty and
    whitespace-only), comment storage on both reject and non-reject transitions,
    `publishedAt`/`publishedBy` set only on `publish`, `getAvailableActions` for all 6
    statuses × both grant combinations, and `isPubliclyVisible`. Every one of the 28
    `tests/unit/admin/<module>/actions.test.ts` files' `transition*` describe block was
    updated (removed actions/statuses replaced with their nearest equivalent in the new
    chain: `archive` → `request_update`, `PENDING_REVIEW` → `UNDER_REVIEW`, `ARCHIVED` as an
    illegal-transition starting status → `DRAFT`); Departments' and Gallery's blocks (the two
    modules with fuller-than-one-test coverage) were rewritten to exercise the complete chain
    including reject-without-a-reason. All 7 CMS e2e specs (`cms-departments`,
    `cms-notices`, `cms-admissions`, `cms-faculty`, `cms-gallery`, `cms-results`,
    `cms-timetables`) updated for the new status labels and the new required `start_review`
    step before `approve`; `cms-departments.spec.ts`'s main flow was extended to also
    exercise `request_update` → `return_to_draft`, and a new describe block
    ("Rejecting under-review content requires a reason (real browser UI)") added there as
    the first e2e proof that the shared-textarea-plus-`formAction` mechanism actually works
    in a real browser, not just at the Server Action level.
  - **Ran the full suite for real**: `npm run typecheck`/`npm run lint`/`npm run build` all
    clean; `npm test` (343/343 unit) and `npx playwright test` (94/94 e2e) both fully green,
    including a full re-seed of the real local database against the migrated schema.
  - Updated `tests.json`: rewrote `cms-workflow-engine`'s feature/notes to describe the new
    state machine and point at the migration; added `cms-workflow-reject-reason-e2e`; updated
    the `cms_modules` section description's workflow-chain summary.

- **Implemented the university compliance module** (`docs/compliance-matrix.md`, CLAUDE.md
  rule 7), per explicit instruction:
  - `/admin/compliance` lists all 20 circular requirements (number, title, description,
    responsible module, status, completeness, public page, evidence count, last verified,
    verifier, last updated); `/admin/compliance/[id]` shows every requested field for one
    requirement in full (required information, owner, the completeness checklist, the
    verify/reject-review/mark-not-applicable/reopen actions, the evidence list + an
    add-evidence form, and the full verification history).
  - **Schema**: `ComplianceStatus` migrated
    (`prisma/migrations/20260914160000_compliance_workflow`, applied against the real local
    Postgres instance with zero drift afterward) from the old
    `not_started/in_progress/submitted_for_review/verified/rejected` set to the requested
    `NOT_STARTED/IN_PROGRESS/READY_FOR_REVIEW/VERIFIED/NEEDS_UPDATE/NOT_APPLICABLE`;
    `VerificationDecision.REJECTED` renamed to `NEEDS_UPDATE` to match; existing rows
    remapped (`SUBMITTED_FOR_REVIEW → READY_FOR_REVIEW`, `REJECTED → NEEDS_UPDATE`) rather than
    assuming a clean database, same principle as the content-workflow-v2 migration earlier
    this session. `ComplianceVerification.rejectionReason` renamed to `note` and generalized
    to carry reviewer notes on a `VERIFIED` decision too, not just the mandatory reason for a
    `NEEDS_UPDATE` one. 6 new `AuditAction` values added for the compliance workflow's own
    transitions plus evidence attachment.
  - **`src/lib/compliance-workflow.ts`** (mirrors `content-workflow.ts`'s shape): 5 explicit
    actions — `submit_for_review` (owner-level, `compliance:view`),
    `verify`/`request_update`/`mark_not_applicable`/`reopen` (reviewer-level,
    `compliance:verify`). `verify` and `request_update` are the *only* two actions that write
    a `ComplianceVerification` row, and `verify` is the *only* action that can ever set
    `VERIFIED` — a requirement cannot reach `VERIFIED` any other way, not even automatically
    from 100% completeness (CLAUDE.md rule 7, and the user's explicit instruction repeating
    it). `request_update` doubles as the "reject/review" button the task asked for — same
    target status, same mandatory-reason rule, whether flagging a `READY_FOR_REVIEW` item or
    an already-`VERIFIED` one found to need fixing later.
  - **The one automatic transition**: `NOT_STARTED <-> IN_PROGRESS`, via
    `syncAutomaticStatus`, driven by whether real content or attached evidence exists for the
    requirement yet (this satisfies "implement automatic completeness checks... based on
    actual database content" without touching the human-gated states) — it is a no-op once a
    requirement reaches `READY_FOR_REVIEW`/`VERIFIED`/`NEEDS_UPDATE`/`NOT_APPLICABLE`, so an
    automatic recompute can never override a human decision. Called from the list/detail page
    loaders (a read-time side effect, logged to the audit trail with a null actor so "the
    system changed this, not a person" stays traceable) rather than from a cron job, since
    there is no background-job infrastructure in this project yet.
  - **`src/lib/compliance.ts`**: static per-requirement metadata (required information,
    responsible module + admin link, public page) for all 20 items, plus one automatic
    completeness check per item queried against the real content tables that item traces to
    (`docs/compliance-matrix.md` §1) — e.g. item 4 (Faculty) checks both "at least one
    published faculty member" and "every published department has at least one." Item 19
    (Grievance mechanism) checks that a `PRINCIPAL`/`ADMINISTRATOR`/`SUPER_ADMIN` is actually
    assigned via `UserRole`, since its requirement is procedural (a mechanism exists and is
    staffed), not a content table to publish. Item 20 (any other information) has no fixed
    data source by design and always reports 0% automatic completeness — reviewed case by
    case via manually attached evidence only, per `docs/compliance-matrix.md`.
  - Evidence attachment (`ComplianceEvidence`, pre-existing generic `(entityType, entityId)`
    pointer model) and reviewer notes (`ComplianceVerification.note`) both wired to real forms
    on the detail page; verification history is simply every `ComplianceVerification` row for
    the requirement, newest first — nothing is overwritten, so a full verify/needs-update
    audit trail always survives (CLAUDE.md rule 8).
  - **Tests**: `tests/unit/compliance-workflow.test.ts` (34 tests: every transition, the
    reason-required rule for `request_update`/`mark_not_applicable`, permission
    classification, the "VERIFIED only via verify" invariant, `syncAutomaticStatus` never
    overriding a human-gated status); `tests/unit/compliance.test.ts` (17 tests: all 20 items'
    metadata is present and well-formed, per-item completeness math including partial/zero
    results and an unknown-item fallback, and the overview/detail loaders' automatic-sync
    wiring); `tests/unit/admin/compliance/actions.test.ts` (10 tests: permission-per-action,
    reason enforcement, evidence creation + audit log, illegal-transition/race handling);
    `tests/e2e/cms-compliance.spec.ts` (6 tests against the real dev server + seeded
    database). The e2e spec is written differently from every other CMS module's: the 20
    `ComplianceRequirement` rows are a fixed, pre-seeded checklist, not a creatable resource,
    so tests can't get a clean starting state by creating a fresh record the way every other
    module's e2e spec does — each mutating block instead reads the requirement's current
    status first and normalizes it before asserting, so the suite stays deterministic across
    repeated runs against the same persistent dev database (verified by running it three
    times back-to-back without reseeding in between).
  - Full verification suite re-run after this work: `npm run typecheck`/`npm run lint`/
    `npm run build` all clean; `npm test` now 404/404 (up from 343); `npx playwright test` all
    100/100 (up from 94) when run at reduced worker concurrency (the dev server times out
    under the default full-parallel load on this machine — confirmed by re-running the
    handful of affected specs, including this new one, in isolation and at `--workers=3`,
    where every one passes; this is local dev-server capacity, not a regression).

- **Made the compliance completeness engine explicit and field-level**, per explicit
  instruction ("do not use a generic 'page exists = compliant' rule... inspect actual
  structured data"), replacing the first pass's per-item `{requiredInformation,
  responsibleModule, publicPage}` metadata + separate mostly-count-based checks with one
  unified, exported `ComplianceRule` record (`src/lib/compliance.ts`) for all 20 items:
  - Each rule now explicitly declares `requiredRecords`, `requiredFields`,
    `requiredDocuments` (`null` where not appropriate), `publicRoute`, `responsibleRole`
    (e.g. `FACULTY_EDITOR (author); REVIEWER or PRINCIPAL (publish)`), and
    `responsibleModule` — all as plain data, readable on the requirement's detail page
    (new "Required records"/"Required fields"/"Required documents"/"Responsible role"
    sections) rather than buried inside a check function.
  - The `check()` for nearly every item now uses a new `everyRecordHasFields` helper to
    verify specific fields are populated on **every** matching published record, not just
    that a row count is non-zero — e.g. Faculty requires every published faculty member to
    have a designation, qualifications, subjectsTaught, and an email or phone, and every
    published Department to have at least one such faculty member; Admissions requires
    eligibilityCriteria + both application dates on every admission cycle; Contact requires
    a labeled published phone **and** a labeled published email, not just "a contact
    exists."
  - Items 8 (Admissions), 10 (Examinations/Results), 13 (Affiliation), and 18
    (Policies/Regulations) also require a **document**, satisfied by a human explicitly
    attaching a published `Document` as `ComplianceEvidence` for that specific requirement
    (`hasPublishedDocumentEvidence`) — this uses `ComplianceEvidence`'s existing generic
    `(entityType, entityId)` pointer for its actual intended purpose, rather than guessing
    at a freeform `Document.category` string (every document created through the admin
    Documents module shares `entityType: "College"`, so category-keyword matching would
    have been unreliable).
  - Grievance mechanism (item 19) still checks for an assigned
    `PRINCIPAL`/`ADMINISTRATOR`/`SUPER_ADMIN` `UserRole` — "a working mechanism" is
    procedural (is someone actually staffed to handle it), not a content table to publish,
    matching the explicit example in the instruction.
  - Confirmed live against the real dev database that this genuinely changes results, not
    just refactors code: the seeded Faculty record — human-`VERIFIED` in the prior session
    at what the old count-only check reported as 100% — now correctly shows **67%**
    completeness (missing qualifications and email/phone), while its `VERIFIED` status
    correctly stays untouched (`syncAutomaticStatus` never overrides a human decision, only
    the automatic `NOT_STARTED`/`IN_PROGRESS` portion). Admissions similarly dropped from a
    count-only 100% to a real **50%** once application-date fields and the required
    prospectus-document check were added.
  - `tests/unit/compliance.test.ts` rewritten around one describe block per item (1-20, 68
    tests total): every item that has field-level checks gets both a "record exists but a
    required field is missing → still not 100%" test (the actual proof this isn't a
    page-exists rubric) and a fully-compliant case; a metadata test asserts every rule
    declares non-empty `requiredRecords`/`requiredFields`/`responsibleRole`/
    `responsibleModule` and a `check` function; a dedicated test confirms exactly items 8/10/
    13/18 declare `requiredDocuments` and the other 16 don't.
  - Full re-verification: `tsc`/`eslint` clean, `npm test` 453/453 (up from 404), `npx
    playwright test` 100/100 (`tests/e2e/cms-compliance.spec.ts` updated for the renamed
    "Required records"/"Required fields" UI sections, plus a new assertion that Faculty's
    missing-qualifications gap is visibly surfaced on the real page even though the
    requirement is `VERIFIED`).

## In progress

- Nothing in progress. Phase 1 (project foundation), Phase 2 (database), Phase 3
  (authentication & authorization), Phase 4 (public website shell), the homepage, and CMS
  modules for College Profile/Departments/Programs/Faculty/Staff/Notices/Events/Seminars/
  Workshops/Academic Calendar/Timetables/Admissions/Fee Structures/Enrollment Statistics/
  Examinations/Results/Documents/Infrastructure/Activities/Clubs/Gallery/Scholarships/
  Student Support/Policies/Regulations/Affiliation/Contact/Location are complete — every
  `content_general` and `content_faculty` module is now built, alongside all of
  `content_admissions`/`content_examinations` from the prior session. The Compliance
  Dashboard is now built too (see Completed above), with its own state machine rather than
  the generic content workflow reused as-is. Only Grievances remains a content-shaped module
  without a CMS module, and needs its own design pass (see Next steps) — CLAUDE.md rule 6
  (private-by-default) means it can't reuse either workflow as-is, since neither assumes
  "must never reach a public view at all."
- **Reminder to self**: commit this work to git at the next natural checkpoint (with the
  user's go-ahead) — everything since `b9099b1` is still uncommitted working-tree state,
  which is what made the `tests.json` mishap above possible in the first place.

## Next steps

1. Design (don't just reuse either existing workflow for) Grievances — CLAUDE.md rule 6
   (private-by-default) doesn't map cleanly onto either `content-workflow.ts` (assumes
   content becomes *public* once published) or `compliance-workflow.ts` (built around a
   fixed 20-item checklist, not a growing list of submissions); Grievances must never reach a
   public view at all and needs its own state machine (new/assigned/in-progress/resolved,
   per `GrievanceStatus`). Compliance is now built (see Completed above) — this is genuinely
   the last content-authoring gap in CLAUDE.md's required scope.
2. Build the generic `ApprovalRequest`/notification layer on top of the workflow engine
   (`docs/implementation-plan.md` Phase 2's other half) — right now a REVIEWER discovers
   pending work only by manually filtering a module's list to `?status=SUBMITTED` or
   `?status=UNDER_REVIEW`;
   `/admin/approval-workflow` (still a placeholder) should become a cross-module "things
   waiting on me" queue, and an EDITOR should get notified when their submission is
   approved/rejected.
3. Build real Users/Roles/Permissions admin screens on top of the existing `requirePermission`
   gates, so role assignment no longer requires editing `prisma/seed.ts` by hand.
4. `Document` and Gallery's `Media` assets both still take a plain URL text field rather than
   a real file upload — there is no file-storage integration in this system yet. Revisit once
   real uploads (not externally-hosted links) are required.
5. Gather real college data for the highest-priority sections (College Profile, Programs, Faculty,
   Contact, Location, Affiliation) — placeholders only until this is supplied.
6. Resolve remaining open questions below (single college vs. template, languages, review-frequency
   cadence) — none of these block further engineering work right now, but they do shape how the
   already-built content schema gets populated with real data.
7. `Course` (a `Program` sub-resource) has no CMS module yet and, per the 2026-09-14 audit,
   is missing `publishedAt`/`publishedBy` like `FeeStructure`/`Contact`/etc. were before this
   session — add both columns in the same migration that builds its CMS module, rather than
   discovering the gap mid-implementation again.

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
| 2026-09-13 | **Phase 3 (authentication & authorization) implemented** per explicit instruction, with an explicit 8-role list (`SUPER_ADMIN`, `PRINCIPAL`, `ADMINISTRATOR`, `EDITOR`, `REVIEWER`, `ADMISSION_OFFICER`, `EXAMINATION_OFFICER`, `FACULTY_EDITOR`) **superseding** the Phase 1/`docs/architecture.md` §4 baseline role set (`super_admin`, `principal`, `content_editor`, `approver`, `compliance_officer`, `grievance_officer`, `auditor`) — the old roles are dropped from the seed on every run. |
| 2026-09-13 | Sessions are server-side (a `Session` table + hashed random token cookie), not JWTs — chosen so a session can be immediately revoked server-side on logout/suspension, and so the cookie never carries roles/permissions a client could tamper with. |
| 2026-09-13 | Permission domains are grouped (`content_general`/`content_admissions`/`content_examinations`/`content_faculty` × view/manage/publish, plus governance/system-admin permissions) rather than one permission per module × CRUD verb, to keep the matrix a reviewable size (22 permissions) while still letting each of the 8 roles have a distinct, principled grant — see `docs/permission-matrix.md` for the full rationale and table. |
| 2026-09-13 | Grievance and Compliance access is limited to `PRINCIPAL`/`ADMINISTRATOR`/`SUPER_ADMIN` since the new role list has no dedicated Grievance Officer/Compliance Officer role — a judgment call to confirm with the user once real admin staffing is known (see Open questions). |
| 2026-09-13 | **Phase 4 (public website shell) implemented** per explicit instruction, with an explicit 20-route list (Home + 19 sections) **consolidating** the Phase 1 scaffold's 29 one-per-circular-item routes. Old → new mapping: `about`/`college-profile`/`history`/`vision-mission`/`principals-message` → `/about` (4 labeled sections); `departments`/`programs`/`academic-calendar`/`timetable` → `/academics` (4 sections); `non-teaching-staff` → `/staff`; `infrastructure`/`location` → `/campus` (location's address also echoed on `/contact`); `activities` folds into `/events` alongside the previously-routeless Seminars/Workshops/Clubs; `rules-regulations` → `/rules` (Policies + Regulations sections). `admissions`, `faculty`, `notices`, `events`, `examinations`, `results`, `gallery`, `scholarships`, `student-support`, `affiliation`, `grievance`, `contact`, `downloads`, `search` kept their existing URLs. Every dropped circular category still has a clearly-headed section somewhere reachable from the new nav — none were silently dropped. |
| 2026-09-13 | Every public content page is `force-dynamic` (server-rendered per request), not statically prerendered — found during this phase that Next/Turbopack defaults to static generation for any page with no dynamic API, which would have baked database content in at build time and gone stale. Revisit with `revalidatePath`/ISR once the admin CMS can call it on publish, rather than re-fetching on every request forever. |
| 2026-09-13 | Sessions/permissions aside, `Document` (downloads) has no publish-state field of its own in the current schema — `/downloads` lists every document for the college unfiltered rather than enforcing rule 4 there. Flagged as a known gap (`tests.json`: `shell-content-queries`, `pub-downloads`) rather than worked around with an invented convention. |
| 2026-09-13 | Grievance submissions are real (not seed-only) as of this phase: the public form encrypts `submitterContact` with AES-256-GCM before it reaches Prisma (`src/lib/security/crypto.ts`), keyed by a new optional `GRIEVANCE_ENCRYPTION_KEY` env var (presence/format validated in `env.ts`, same pattern as every other var there — never checked for "is this a real usable key" until something actually tries to encrypt). |
| 2026-09-14 | **Homepage implemented** per explicit instruction (15 required sections). "Important announcement" is deliberately *not* keyed off a `Notice.category` naming convention — it's simply the latest notice whose `expiryDate` hasn't passed, so it works regardless of what categories a college actually uses. |
| 2026-09-14 | Every homepage section below the hero streams independently via React `<Suspense>` rather than the page awaiting all ~14 queries before sending any HTML — a genuine performance choice (perceived load time), not just a loading-state nicety. |
| 2026-09-14 | Structured data (JSON-LD) is held to a *stricter* standard than the rendered page: it's omitted entirely (not just visually marked) whenever the underlying college/contact/location data is still `isPlaceholder`, since a search engine has no UI to show `DemoDataNotice` next to a machine-readable field — see `src/lib/seo.ts`. |
| 2026-09-14 | Added `NEXT_PUBLIC_SITE_URL` (optional, defaults to `localhost:3000`) as the one new env var this required, for `sitemap.xml`/`robots.txt`/canonical-URL absolute-URL requirements. |
| 2026-09-14 | **Process note**: a `git checkout -- tests.json` run to undo an unrelated mistake instead discarded the entire file back to its pre-Phase-3 committed state (nothing in this repo has been committed since `b9099b1`, so git had no newer version to fall back to). Recovered from this session's own conversation history rather than losing the work, but it's a sign this repo should start getting real commits at natural checkpoints rather than staying as one long-running uncommitted working tree. |
| 2026-09-14 | **CMS modules implemented** for College Profile, Departments, Programs, Faculty, and Staff, built on one shared workflow engine (`src/lib/content-workflow.ts`) rather than 5 separate ones — the engine is the reusable deliverable; the per-module code is thin field-mapping on top of it. |
| 2026-09-14 | `create`/`edit` require a module's `:manage` permission; `approve`/`reject`/`publish`/`archive` all require `:publish`. Archiving from an unpublished state (DRAFT/PENDING_REVIEW) still requires `:publish`, not `:manage` — a deliberate choice to keep "remove from the pipeline" at the same trust level as "make it live," even though it means an EDITOR/FACULTY_EDITOR can't withdraw their own abandoned draft without a reviewer's help (tracked as an open question below). |
| 2026-09-14 | College Profile is modeled as a true singleton in the admin UI (matching its `@unique collegeId` in the schema) rather than forcing it through the same list/create/edit shape as the other 4 modules — `create` redirects to `edit` once a profile exists, and there is no list page, just the one profile's view page. |
| 2026-09-14 | Editing a record does not revert its status (e.g. fixing a typo on a PUBLISHED item stays PUBLISHED) — `manage`/`publish` permission holders can edit at any status. Only the 5 explicit workflow actions change status. This matches common real-world CMS behavior (small fixes shouldn't force a full re-review) but is worth revisiting once real editorial policy exists. |
| 2026-09-14 | Found two real Playwright bugs while writing the CMS e2e specs, both from the same root cause: relying on `waitForURL` to prove a mutation completed, when the target URL was identical to (or a substring-match of) the starting URL. Generalizable lesson for any future e2e work in this repo: after a Server Action whose redirect target can equal the current URL, wait for a content change, never a URL change. |
| 2026-09-14 | **CMS modules extended** to Notices, Events, Seminars, Workshops, Academic Calendar, and Timetables — all placed in the existing `content_general` permission domain (no new domain needed), confirming the workflow engine built for the first 5 modules generalizes rather than requiring per-module rework. |
| 2026-09-14 | Added `src/lib/admin/zod-helpers.ts` as shared date-field validation (`requiredDateField`/`optionalDateField`/`toDateInputValue`) rather than duplicating Zod date-parsing logic across 6 modules — the first CMS modules with date fields at all. |
| 2026-09-14 | Seminars/Workshops model their Department link as an **optional** FK (college-wide when omitted), while Timetables' Program link is **required** — a deliberate distinction reflecting that a seminar/workshop can genuinely be institution-wide, but a timetable only makes sense scoped to one program. |
| 2026-09-14 | Timetable's `structuredSchedule` (a `Json?` column) is edited as raw JSON text in the admin UI rather than a structured day/period builder UI — a pragmatic first pass that still enforces validity (malformed JSON is rejected, never silently discarded) without building a full schedule-grid editor before real usage patterns are known. |
| 2026-09-14 | Seminars and Workshops got dedicated admin CMS modules even though they aren't independent top-level sections in `CLAUDE.md`'s admin-system list — they fold into the public site's consolidated `/events` page (per the Phase 4 route consolidation). This is a deliberate widening: the circular's public-facing consolidation doesn't have to constrain how many distinct authoring workflows the admin side offers. |
| 2026-09-14 | Found a third category of e2e testing bug (beyond the two `waitForURL` issues from the first CMS batch): calling `loginAs()` twice with two different roles inside one `test()` block fails, because the app correctly redirects an already-authenticated session away from `/login` before the form ever renders. Generalizable lesson: always give each role its own `test()` block (fresh browser context), never reuse one page across a role switch. |
| 2026-09-14 | **CMS modules extended** to Admissions, Fee Structures, Enrollment Statistics, Examinations, Results, and Downloads/Documents — the first modules built on `content_admissions` and `content_examinations`, and the first to give `Document` (previously statusless) a real publish lifecycle. All 4 permission domains now have real CMS coverage, not just `content_general`/`content_faculty`. |
| 2026-09-14 | Added `publishedAt`/`publishedBy` to `FeeStructure`, `EnrollmentStatistic`, `Result`, and `status`/`publishedAt`/`publishedBy` to `Document` (`prisma/migrations/20260914090529_add_workflow_fields_admissions_documents`) — the shared `applyWorkflowTransition` engine unconditionally sets `publishedAt`/`publishedBy` on a `publish` transition, so every model it drives needs those columns; this is the first time a model lacking them was wired into the engine, surfacing the requirement explicitly. |
| 2026-09-14 | Documents (the CMS module) authors *general* downloadable documents — a `("College", collegeId)` `entityType`/`entityId` sentinel, the same "not tied to anything more specific" convention `prisma/seed.ts` already used for its example audit-log entry — rather than exposing `Document`'s full generic `(entityType, entityId)` attachment shape in the admin form. `Document` remains available for other modules to attach files to their own records later; this module only covers the public Downloads page's standalone documents. |
| 2026-09-14 | Found a real Zod correctness bug building Enrollment Statistics: `z.coerce.number().min(0).optional().or(z.literal(""))` (the pattern already used for College Profile's `establishedYear`) silently converts a *blank* field to `0` instead of falling through to the empty-string branch, because `Number("") === 0` already satisfies `min(0)` — unlike `establishedYear`'s `min(1800)`, which reliably fails for a coerced-to-0 blank value and so always falls through correctly. A CLAUDE.md rule 1 risk (inventing a real zero where "not recorded" was meant), fixed by passing `formData.get(x) \|\| undefined` into a plain `.optional()` schema instead. Any future optional numeric field whose valid range includes 0 should use this pattern, not the `establishedYear`-style `.or(z.literal(""))` trick. |
| 2026-09-14 | Found a Prisma `Decimal` serialization issue building Fee Structures: `Decimal` (used for `amount`) is a class instance, not a plain serializable value, so it can't cross the Server Component -> Client Component boundary as a prop. Fixed by converting it to a plain string before passing it into the client form component. Generalizable to any future Decimal-bearing admin form. |
| 2026-09-14 | **CMS modules extended** to Infrastructure, Activities, Clubs, Gallery, Scholarships, Student Support, Policies, Regulations, Affiliation, Contact, and Location — completing every `content_general` and `content_faculty` module in CLAUDE.md's required scope (28 CMS modules total, all 4 permission domains real). Clubs is the third `content_faculty` module (Faculty, Staff, Clubs). |
| 2026-09-14 | Gallery's `GalleryItem` creation Server Action also creates a fresh `Media` row in the same action, rather than requiring a separate media-library step first — the new asset is attached to the *album* (`entityType: "GalleryAlbum"`), not the item, since the item doesn't exist yet when the Media row is written. This keeps the admin UX to one form per photo instead of a two-step "upload, then attach" flow, at the cost of `Media` rows not being reusable across albums from this UI (a real limitation to revisit if photo reuse across albums becomes common). |
| 2026-09-14 | Location is modeled as a singleton in the admin UI (create redirects to the view page if one exists; no list page), matching College Profile — but `Location.collegeId` has no `@unique` constraint in the schema (unlike `CollegeProfile.collegeId`), so its existence checks use `findFirst` rather than `findUnique`. A deliberate minimal fix rather than adding a migration to make `collegeId` unique, since nothing in the admin UI can currently create a second row anyway (the "new" page's own guard prevents it) — worth revisiting if a future data-import path could ever insert a duplicate outside the admin UI. |
| 2026-09-14 | Added `publishedAt`/`publishedBy` to `Contact` and `Location` (`prisma/migrations/20260914093028_add_workflow_fields_contact_location`) — the same fix as `FeeStructure`/`EnrollmentStatistic`/`Result` in the prior session: both models had `status` but not the publish-timestamp columns the shared `applyWorkflowTransition` engine writes on a `publish` transition. Audited every remaining `ContentStatus`-bearing model afterward (`grep`/`awk` over prisma/schema.prisma) to check for the same gap ahead of time rather than discovering it module-by-module: every model with a real CMS module now has both columns, except `Course` — a `Program` sub-resource with no CMS module of its own yet (not requested this session; still just seed-only data). Flagged so whoever builds a Courses CMS module doesn't rediscover this same issue from scratch. |
| 2026-09-14 | **Content approval workflow v2**: migrated the shared engine in place across all 28 existing CMS modules (rather than adding a second, parallel engine) to the exact required chain `DRAFT -> SUBMITTED -> UNDER_REVIEW -> APPROVED -> PUBLISHED` / `PUBLISHED -> UPDATE_REQUIRED -> DRAFT` — confirmed with the user before starting given the blast radius (enum migration + 28 modules' actions/pages/tests). |
| 2026-09-14 | Rejection sends `UNDER_REVIEW` content back to `DRAFT` (same target as before, now requiring a reason) rather than introducing a distinct `REJECTED` status — keeps `DRAFT` as the single "author needs to act on this" state rather than splitting it across `DRAFT`/`REJECTED`/`UPDATE_REQUIRED`. `ARCHIVED` was dropped entirely (not folded into any new status) since it wasn't part of the required chain and had no real seeded data depending on it. |
| 2026-09-14 | `submit_for_review` (author, `DRAFT -> SUBMITTED`) and `start_review` (reviewer, `SUBMITTED -> UNDER_REVIEW`) are two distinct actions rather than collapsing straight to `UNDER_REVIEW` — `SUBMITTED` is a real queue state a reviewer explicitly claims, not just a momentary pass-through. No new permission tier was needed for this: `start_review` uses the same `:publish` permission as `approve`/`reject`/`publish`/`request_update`, since the existing permission matrix only has `manage`/`publish` tiers per domain and adding a third tier for this alone wasn't asked for. |
| 2026-09-14 | The rejection reason (and any other transition's optional comment) is stored on a new `AuditLog.comment` column, not inside the existing `beforeSnapshot`/`afterSnapshot` `Json` blobs — keeps it a plain queryable string rather than something buried in JSON that every future reader has to know to look for. |
| 2026-09-14 | Existing `ARCHIVED`/`PENDING_REVIEW` rows (none existed in the seeded dev database, verified via `psql` before writing the migration) are remapped by the migration as `ARCHIVED -> DRAFT` / `PENDING_REVIEW -> SUBMITTED` rather than the migration assuming a clean database — written this way on principle (CLAUDE.md rule 8: never silently lose a real row's status to a failed migration), even though it happened to run as a no-op remap in practice here. |
| 2026-09-14 | The ~24 `new`/`edit` pages' FK-picker queries dropped their `status: { not: "ARCHIVED" }` filter rather than being redirected at a new "equivalent excluded" status (e.g. `UPDATE_REQUIRED`) — with `ARCHIVED` gone there's no remaining status that means "don't offer this as a reference," so every non-deleted record of the referenced type is now selectable, same as it always effectively was for every status except the removed one. |
| 2026-09-14 | **Compliance module**: adopted the user's exact 6-status list (`NOT_STARTED/IN_PROGRESS/READY_FOR_REVIEW/VERIFIED/NEEDS_UPDATE/NOT_APPLICABLE`) in place of `docs/compliance-matrix.md` §3's originally-documented 5-status lifecycle (`not_started/in_progress/submitted_for_review/verified/rejected`) — same in-place-migration principle as the content-workflow-v2 decision above, applied to a second, independent state machine rather than trying to unify the two (a compliance requirement and a piece of content are genuinely different things with different lifecycles). |
| 2026-09-14 | `request_update` is one action serving as both the "reject" button (from `READY_FOR_REVIEW`) and a way to flag an already-`VERIFIED` item as needing fixing later — not two separate actions — since both cases have the same target status (`NEEDS_UPDATE`), the same mandatory-reason rule, and the same reviewer authority (`compliance:verify`). `NOT_APPLICABLE` is a new status beyond the original `docs/compliance-matrix.md` lifecycle, added because the user's requested status list included it and because not every one of the 20 circular items necessarily applies to every college (e.g. a "moot court room" facility item for a college with no Law program). |
| 2026-09-14 | Only `NOT_STARTED <-> IN_PROGRESS` is automatic; every other status change is an explicit human action. This reads CLAUDE.md rule 7 ("no content or compliance status can be auto-approved") as being about *approval decisions* specifically, not all bookkeeping — the user's own instruction singles out `VERIFIED` ("must NEVER become VERIFIED automatically... requires an authorized human reviewer") rather than saying no status may ever move automatically, which is why `NOT_STARTED`/`IN_PROGRESS` were judged safe to derive from real data while everything downstream of them still requires a person. |
| 2026-09-14 | `ComplianceVerification.rejectionReason` renamed to `note` rather than adding a second column — both a `VERIFIED` decision's optional commentary and a `NEEDS_UPDATE` decision's mandatory reason are "what the reviewer wrote," and the verification-history UI shows them identically either way. |
| 2026-09-14 | Item 19's (Grievance mechanism) completeness check tests for an assigned `PRINCIPAL`/`ADMINISTRATOR`/`SUPER_ADMIN` via `UserRole` rather than any Grievance-table content, since the circular's requirement is that a *mechanism* exists and is reachable/staffed, not that grievances have actually been filed — an idle grievance inbox with nobody assigned to it is the actual compliance gap this check is meant to catch. |
| 2026-09-14 | Item 20's (any other information) completeness check is a hard-coded "always 0%, no fixed data source" rather than being derived from its `ComplianceEvidence` count — `docs/compliance-matrix.md` describes it as "extensible... reviewed case by case," and evidence existing isn't the same claim as "the underlying data is actually complete," which every other item's check makes. This is a deliberate exception to the completeness engine's premise, not a placeholder. |
| 2026-09-14 | **"Required documents" is checked via `ComplianceEvidence` pointing at a published `Document`** (`hasPublishedDocumentEvidence`), not via `Document.category` keyword matching, and applies only to items 8/10/13/18 rather than universally — chosen because every `Document` row created through the existing admin Documents module already shares one fixed `entityType: "College"` sentinel (a prior-session decision), so there is no reliable structural signal in `Document` itself for "this is the admission prospectus" vs. "this is a random circular." A reviewer explicitly attaching evidence to the specific requirement is the one place that link is unambiguous, and it reuses `ComplianceEvidence`'s already-built generic pointer shape rather than adding a new field or convention. |
| 2026-09-14 | **`everyRecordHasFields` checks every matching published record, not "at least one."** A requirement with 10 faculty records where only 1 has qualifications filled in is not actually compliant with "faculty details, including qualifications" — the stricter reading was chosen deliberately, even though it means realistic seed/placeholder data now reports partial completeness almost everywhere instead of misleadingly reaching 100% off one fully-filled-in demo record. |

## Open questions

- Which specific college (or colleges) is this for? Name, type (Govt/Private/Law/Education), and real
  institutional data are not yet available.
- Is this a single-tenant site or a multi-tenant template reusable across affiliated colleges? The schema
  is tenant-ready (every table carries `collegeId`) regardless of the answer.
- What languages must the public site support (English/Urdu/Sindhi)? Needs resolution before the content
  schema (Phase 3 per `docs/implementation-plan.md`) is finalized.
- Who are the real people behind the 8 seeded roles (`SUPER_ADMIN`, `PRINCIPAL`,
  `ADMINISTRATOR`, `EDITOR`, `REVIEWER`, `ADMISSION_OFFICER`, `EXAMINATION_OFFICER`,
  `FACULTY_EDITOR` — `prisma/seed.ts`, `docs/permission-matrix.md`)? Generic system taxonomy,
  not a confirmed real-world assignment. In particular: is folding grievance/compliance
  oversight into `PRINCIPAL`/`ADMINISTRATOR` (no dedicated officer role in the new list)
  actually how this college wants that handled, or does it need its own role later?
- Should sessions use a longer/shorter lifetime than the current fixed 8-hour absolute expiry
  (`src/lib/auth/session.ts`)? No "remember me" / refresh-token option exists yet.
- Is MFA required for any role before go-live? `docs/architecture.md` §3 recommends it for
  high-privilege roles (Principal, Approver-equivalent, Compliance Officer-equivalent, Super
  Admin); the `User.mfaEnabled` column exists but nothing enforces or sets it yet.
- Is the Phase 4 route consolidation (29 → 20 sections; see the decisions log above) the
  right information architecture, or should any of the folded-together sections (e.g.
  Academics bundling Departments/Programs/Calendar/Timetable into one long page) get their
  own URL back once real content makes that page unwieldy?
- Should `/downloads` be its own content type with a real publish/draft lifecycle, or should
  a document's visibility simply follow whatever entity it's attached to (its
  `entityType`/`entityId`)? Blocks closing the `pub-downloads` gap in `tests.json`.
- How should the compliance report / website URL submission to the Inspector of Colleges be tracked —
  `docs/database-design.md` §9 proposes a `ComplianceReportExport` model for this; needs confirmation it
  matches how the college actually wants to submit. Still not built — the Compliance Dashboard itself
  (list/detail/verify/evidence/history) is done, but generating and recording submission of the report
  artifact is a separate, not-yet-requested piece.
- `ComplianceEvidence.entityId` is freeform text (matching its existing generic
  `(entityType, entityId)` shape), not validated against a real row of that type, and marking a
  requirement `VERIFIED` doesn't check that its evidence actually points at `PUBLISHED` records —
  `docs/database-design.md` §9 proposes exactly that constraint ("evidenceRefs must point at records
  whose own status = published"). Left as a human-judgment call for now (the reviewer sees the evidence
  list before deciding) rather than an enforced constraint, since building real cross-model existence
  validation for an open-ended `entityType` wasn't part of what was asked; worth revisiting if reviewers
  start verifying items with stale/bad evidence pointers in practice.
- Review-frequency cadence per content type (e.g. how often Notices vs. Faculty vs. Affiliation should be
  reviewed) is left as a policy decision for the college — see `docs/architecture.md` §12.
- Is "editing doesn't revert status" (a PUBLISHED record can be edited in place without
  going back through review) the right policy, or should any edit to already-published
  content require re-approval? Currently no role's real-world workflow has been confirmed
  either way. Note this now interacts with `request_update`/`UPDATE_REQUIRED` (see the
  2026-09-14 content-approval-workflow-v2 decisions log entry) — a reviewer who wants an
  edit re-reviewed should use `request_update` rather than relying on an in-place edit
  being blocked.
- The rejection-reason gap noted here previously is now resolved (rejection requires a
  non-empty reason, stored on the `AuditLog` row's new `comment` column — see the
  2026-09-14 content-approval-workflow-v2 decisions log entry) — but there is still no
  notification system to actively tell the author *when* their content is rejected; they
  currently have to check the record's audit trail themselves.
- `request_update`/`UPDATE_REQUIRED` only has `manage`-permission `return_to_draft`
  available to move it back to `DRAFT` for editing — should the reviewer's `request_update`
  comment be surfaced more prominently on the edit form itself (not just in the audit log),
  so the author doesn't have to go hunting for why an update was requested?
