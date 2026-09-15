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
`VERIFIED` can only ever be reached by an authorized human reviewer (CLAUDE.md rule 7).
**The full public + admin Grievance system is now built too** — a confidential public
submission form (name/email/phone/category/subject/description/attachment) that generates a
non-guessable reference number, rate-limited and honeypot-protected against abuse; an admin
case-management module with its own NEW/ASSIGNED/UNDER_REVIEW/ACTION_REQUIRED/RESOLVED/CLOSED
state machine, assignment, internal notes, recorded responses, encrypted-contact detail views
restricted to authorized staff, permission-checked attachment downloads, full audit history,
and search/filter/pagination. **Documents and Gallery (Media) now support real file
upload/validation/preview/replacement/archive/publish-unpublish** — the former paste-a-URL
placeholders are gone; uploaded files live outside `public/` and are served only through
permission-checked routes that are public exactly when the owning record is actually live
(status + publish/expiry-date window for Documents; "does any PUBLISHED GalleryItem wrap this
Media" for images). This also added `ARCHIVED`/`archive`/`unarchive`/`unpublish` to the
*shared* content workflow engine (`src/lib/content-workflow.ts`), so every one of the 28
content-authoring modules — not just Documents/Gallery — now genuinely has the
draft/review/publish/archive lifecycle `tests.json`'s notes had been (inaccurately) claiming
since Phase 4. **`/search` is now a real global search** — 8 categories (pages, notices,
events, programs, faculty, documents, policies, regulations), category filtering,
relevance-ranked results, and pagination, still published-only. **The admin Dashboard
(`/admin`) is now real too** — content status totals, compliance percentage, requirements
needing attention, recent notices/events, content not recently reviewed, document expiry
warnings, and recent audit activity, every number a live database query scoped to what the
signed-in role can actually see. **Centralized audit logging is now real too** — a single
writer (`src/lib/audit.ts`'s `logAudit()`) is the only code path that ever writes an
`AuditLog` row, all 7 former direct-Prisma call sites (content/compliance/grievance
workflows, grievance notes/responses, public grievance submission, login/logout, and the new
role-assignment action) now funnel through it, a read-only `/admin/audit-logs` viewer exists
with filtering/pagination/detail views, and immutability is enforced both by omission
(no edit/delete Server Action exists) and by a database-level Postgres trigger that rejects
any `UPDATE`/`DELETE` on the table outright. `/admin/users` now supports the one real
"permission change" this app's data model has — assigning/revoking a user's roles, fully
audited. **Content review/freshness tracking is now real too** — Notices, Faculty, Academic
Calendar, Timetables, and Admissions (the 5 modules explicitly named for staleness warnings)
now track a real last-reviewed date and reviewer per record, shown alongside last updated and
a computed next-review-due date on each record's admin page, with a "Mark reviewed" action;
the review period is configurable per module at `/admin/content-review-settings`, and the
dashboard now has a real "Content review warnings" section (5 named stale-`<module>` counts
plus a combined overdue-reviews table) driven by that real data instead of an `updatedAt`
guess. Only 2 admin modules (the Roles/Permissions matrix editor and the cross-module Approval
workflow queue) remain placeholder-gated, not built — see `tests.json`'s `admin_system`
section. **A site-wide accessibility audit is now done too** — automated axe-core coverage
(`tests/e2e/accessibility.spec.ts`) plus real fixes: a systemic contrast failure
(`text-foreground/50`, ~90 files), missing current-page indication across every nav component,
invalid `<dl>` markup on 17 admin detail pages, non-keyboard-focusable scrollable regions, and
two missing landmarks (`/login`'s `<main>`, `AdminUserBar`'s `<header>`) — see `tests.json`'s
`public_shell` section (`shell-accessibility-audit`). **A site-wide security review is now done
too** — most categories (authorization coverage, SQL injection, XSS, CSRF, path traversal,
secrets handling, private-grievance-data handling) checked out already solid; real fixes: a
per-IP login rate limit (closing a credential-stuffing gap the existing per-account lockout
didn't cover), magic-byte verification on every file upload (closing a MIME-type-spoofing gap),
and a full set of security headers (CSP, `X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`, `Permissions-Policy`, HSTS) added to `next.config.ts`, which previously had
none. One architectural gap (admin queries not scoped by `collegeId`, a live IDOR risk only if
this app is ever deployed multi-tenant) was found and deliberately flagged rather than
unilaterally fixed — see `tests.json`'s `public_shell` section (`shell-security-review`) and the
Open Questions below. **A full-application browser-automation walkthrough is now done too** —
the public site's 10 main sections plus the complete admin notice lifecycle (login through
publish, public verification, edit, audit trail) and a compliance verification, at both desktop
and mobile viewport, all driven with real browser interaction
(`tests/e2e/full-walkthrough.spec.ts`). Found and fixed one real defect: the admin dashboard
overflowed horizontally at 375px width (a `grid`/`flex` "won't shrink below content" bug, the
second instance of this exact class of bug in this project) — see `tests.json`'s `public_shell`
section (`shell-full-walkthrough`).

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

- 2026-09-14 — **Implemented the full public + admin grievance system** (per explicit
  instruction), closing the last content-shaped gap called out in the prior session's "Next
  steps" — deliberately its own state machine (`src/lib/grievance-workflow.ts`), not a reuse
  of `content-workflow.ts`/`compliance-workflow.ts`, since a grievance must never become
  public (CLAUDE.md rule 6):
  - **Schema**: reshaped `Grievance` (migration
    `20260914170000_grievance_case_management`, applied with zero drift) — added a unique,
    non-sequential `referenceNumber` (`src/lib/grievance-reference.ts`,
    `GRV-YYYYMMDD-<6 random chars>`, alphabet excludes `0/O/1/I`); split the old single
    `submitterContact` into required `submitterEmail` + optional `submitterPhone` (both
    still AES-256-GCM encrypted, same as before) plus required `submitterName`/`category`;
    added required `subject`; added `submitterIpHash` (abuse-pattern review only, never the
    raw IP) and `closedAt`. `GrievanceStatus` is now
    `NEW`/`ASSIGNED`/`UNDER_REVIEW`/`ACTION_REQUIRED`/`RESOLVED`/`CLOSED` (was
    `NEW`/`IN_REVIEW`/`RESOLVED`/`CLOSED`), matching the exact admin status list requested.
    Added `GrievanceResponse` (recorded replies to the submitter — this system has no
    outbound email/SMS integration, so a response is the record of what staff said, not
    proof it was delivered), `GrievanceAttachment` (submitter-uploaded evidence — a separate
    model from the generic `Document`/`Media` tables since those require a real `User`
    uploader FK, and a public submitter isn't a `User`), and a generic `RateLimitEntry`
    (fixed-window counter, reusable by any future unauthenticated write path). Added 4
    `AuditAction` values (`GRIEVANCE_ASSIGN`/`GRIEVANCE_STATUS_CHANGE`/
    `GRIEVANCE_NOTE_ADDED`/`GRIEVANCE_RESPONSE_SENT`).
  - The local dev database had 29 pre-existing `grievances` rows (1 real dev-seed fixture +
    28 leftover Playwright e2e artifacts from earlier sessions) that predated the new
    required columns and blocked the migration; deleted them (confirmed with the user first
    — see the decisions log) since they were test artifacts, not real submissions, then
    re-ran `prisma/seed.ts` to restore the one dev fixture.
  - **Public submission** (`src/app/(public)/grievance/`): form now collects name, email,
    phone (optional), category (fixed list, `src/lib/grievance-categories.ts`, shared with
    server-side Zod validation so they can never drift), subject, description, and an
    optional attachment. On success, shows the generated reference number and tells the
    submitter to keep it for follow-up. **Abuse protection**: a per-IP rate limit
    (`src/lib/security/rate-limit.ts`, 3 submissions/hour, `RateLimitEntry`-backed) and a
    honeypot field (`website`) hidden off-screen — a filled honeypot silently reports success
    without writing anything, so a bot never learns to adapt. Attachments are validated
    (type: PDF/JPEG/PNG/WEBP/DOC/DOCX; size: 10MB) and saved outside `public/`
    (`src/lib/security/file-storage.ts`, `storage/grievance-attachments/`, gitignored) —
    readable only through the new authenticated download route below, never a public URL.
  - **Admin module** (`src/app/admin/grievances/`): list page with search (reference #,
    subject, submitter name, description — email/phone are encrypted and can't be searched
    at the DB level, a documented limitation) + status/category filters + pagination
    (`src/lib/pagination.ts`, `src/components/ui/Pagination.tsx` — the first pagination
    component in this codebase, generic enough for other modules to adopt later). Detail
    page: decrypts `submitterEmail`/`submitterPhone` only for `grievances:view` holders;
    lists attachments as download links to
    `GET /api/admin/grievances/[id]/attachments/[attachmentId]` (permission-checked before
    ever reading a file); assignment restricted to users actually holding
    `grievances:manage` (`src/lib/admin/grievance-assignees.ts`, derived from the permission
    matrix rather than a hard-coded role list, re-validated server-side against the
    submitted `assigneeId`); the full status-transition set
    (start_review/request_action/resume_review/resolve/close/reopen, with
    request_action/resolve/reopen requiring a reason, mirroring the
    `content-workflow.ts`/`compliance-workflow.ts` reason-required pattern); internal notes
    (never shown to the submitter); recorded responses; and a full audit-history panel
    reading `AuditLog` filtered to `entityType: "Grievance"`. Every mutating action requires
    `grievances:manage`; `grievances:view` alone can see but not act — currently the same
    role set (PRINCIPAL/ADMINISTRATOR/SUPER_ADMIN) holds both, but the code never assumes
    that will always be true.
  - Tests: `tests/unit/grievance/{workflow,reference-number,actions}.test.ts`,
    `tests/unit/security/{rate-limit,file-storage}.test.ts`,
    `tests/unit/admin/grievances/actions.test.ts`,
    `tests/unit/admin/grievance-assignees.test.ts`, `tests/unit/pagination.test.ts` (95 new
    unit tests, 508/508 passing project-wide). `tests/e2e/grievance.spec.ts` (17 tests
    against the real dev server + seeded database: public submission with a real inline PNG
    attachment, reference-number search, decrypted-contact visibility gated to authorized
    staff, an unauthorized role refused even by direct navigation, the attachment route
    refusing an unauthenticated fetch, the complete status lifecycle including the
    reason-required and reopen-after-close paths, notes/responses, full audit history, and
    filter correctness) — all passing, plus updated
    `tests/e2e/public-content.spec.ts`'s older grievance-submission smoke test for the new
    required fields. Ran the full suite for real: `npm run typecheck`/`npm run
    lint`/`npm run build` all clean, `npm test` 508/508, `npx playwright test` 117/117 (full
    suite, not just the new spec).
  - Updated `tests.json`'s `pub-grievance` and `adm-grievances` entries (`adm-grievances`
    flipped from `not_started` to `passing`).

- 2026-09-15 — **Implemented real document and media management** (per explicit
  instruction: upload/validation/preview/metadata/replacement/archive/publish-unpublish for
  both Documents and Gallery/Media, with uploaded files never exposed without a permission
  check):
  - **Schema** (migration `20260915090000_document_media_management`, applied with zero
    drift): `Document` gained `description`, `storedPath`/`fileName` (replacing the old
    required `fileUrl` pasted-URL column, which is now gone entirely), `publishDate`/
    `expiryDate` (an optional scheduling window, mirroring Notice's existing pattern — see
    `isDocumentPubliclyVisible` below), and `approvedById`/`approvedAt` (set only by the
    workflow's `approve` transition, cleared on reject/return-to-draft). `Media` gained
    `storedPath`/`mimeType` (replacing the old required `url` column), `category`, and
    `mediaDate` (the date the photo represents, distinct from the system `uploadedAt`
    timestamp). Added `ARCHIVED` to the shared `ContentStatus` enum.
  - **Shared workflow engine extended** (`src/lib/content-workflow.ts`) rather than adding
    Documents/Gallery-specific one-offs: `archive` (legal from any non-archived status,
    publish-tier — taking live content down is as significant as putting it up),
    `unarchive` (ARCHIVED → DRAFT, manage-tier like `return_to_draft`), and `unpublish`
    (PUBLISHED → APPROVED, publish-tier — takes something down without flagging it as
    needing rework the way `request_update` does, and can be republished without
    re-review). Because `WorkflowActions`/`getAvailableActions` are shared by all 28
    content-authoring modules, this one change retroactively makes every module's
    "draft/review/publish/archive workflow" claim in `tests.json` actually true, not just
    Documents/Gallery's — verified by running the *entire* e2e suite (137 tests, not just
    the new specs) and fixing the one assertion this changed the real behavior of (see
    decisions log).
  - **Upload storage** (`src/lib/security/upload-storage.ts`, deliberately separate from
    `src/lib/security/file-storage.ts`'s grievance-attachment logic, which has different
    validation rules and is never publicly reachable): validates type (Documents: PDF/
    DOC(X)/XLS(X)/PPT(X)/TXT/JPEG/PNG; Media: JPEG/PNG/WEBP/GIF) and size (25MB/10MB) before
    ever writing to disk, stores files under `storage/uploads/<kind>/<entityId>/` (gitignored,
    outside `public/`), `validateUpload` exported separately from `saveUploadedFile` so
    callers can reject a bad file before creating (or updating) the owning database row.
  - **Permission-checked file serving**: `GET /api/files/documents/[id]` is public exactly
    when `isDocumentPubliclyVisible` (status PUBLISHED *and* within the publish/expiry
    window) — the same function `src/lib/content.ts`'s `getDocuments()` uses to decide what
    appears on `/downloads`, reused rather than duplicated, so "is this listed" and "is this
    downloadable" can never drift apart. `GET /api/files/media/[id]` is public exactly when
    at least one `GalleryItem` wrapping that `Media` row is currently PUBLISHED (`Media`
    itself carries no status). Anything else redirects through `requirePermission` like any
    other admin page.
  - **Documents module** (`src/app/admin/documents/`): upload requires a real file (client
    preview via new `src/components/admin/FilePreviewInput.tsx`, reused by Gallery below);
    the edit form's file input is optional — leaving it blank keeps the current file,
    providing a new one replaces it (bumps `version`, logs `FILE_REPLACED`); `publish` is
    refused with a clear error if no file has ever been uploaded; approving records
    `approvedById`/`approvedAt` as a small Documents-specific follow-up mutation after the
    shared transition (not a generic engine field, to avoid forcing it onto 27 other models
    that don't have the columns).
  - **Gallery/Media module** (`src/app/admin/gallery/`): item creation now uploads a real
    image instead of pasting a URL, and dropped the `mediaType` select (VIDEO/DOCUMENT)
    entirely — the user's field list (image/caption/album/date/category/alt text) is
    image-only, so `mediaType` is now always hard-coded `"IMAGE"` at creation; replacing the
    image on edit is optional (same pattern as Documents) and logs `FILE_REPLACED`.
  - Updated the public Downloads and Gallery pages, and the homepage's "Important documents"
    section, to link to the new `/api/files/*` routes instead of the removed `fileUrl`/`url`
    columns. `prisma/seed.ts` now writes small real placeholder files to disk (a PNG for
    Media, a text file for Document) during seeding, so the dev-seed rows work end-to-end
    through the real file routes instead of pointing at fake `https://example.invalid/...`
    URLs that were never actually fetchable.
  - Tests: `tests/unit/security/upload-storage.test.ts`, updated
    `tests/unit/content-workflow.test.ts` (archive/unarchive/unpublish coverage),
    `tests/unit/content/queries.test.ts` (`getDocuments` date-window filter,
    `isDocumentPubliclyVisible`), and rewritten `tests/unit/admin/documents/actions.test.ts`
    / `tests/unit/admin/gallery/actions.test.ts` for the upload-based flow (546/546 unit
    tests passing project-wide). `tests/e2e/cms-documents.spec.ts` (new, 12 tests: no-file
    rejection, upload+preview+metadata, the full review→publish lifecycle, public
    downloadability without a session, file replacement, publish-date scheduling, unpublish/
    re-publish/archive/unarchive, and the wrong-domain permission check) and rewritten
    `tests/e2e/cms-gallery.spec.ts` (now 14 tests, item creation/replacement using real image
    uploads, plus new unpublish/archive/permission-gated-image-access coverage). **Ran the
    full e2e suite repeatedly (137 tests) to check for regressions from the shared workflow
    engine change** — found and fixed one real regression (`cms-departments.spec.ts`, see
    decisions log) and two long-standing pre-existing test bugs unrelated to this feature
    (also see decisions log) — final state: 137/137 e2e, 546/546 unit, `npm run typecheck`/
    `npm run lint`/`npm run build` all clean.
  - Updated `tests.json`'s `adm-documents`, `adm-gallery`, `pub-downloads` (flipped
    `in_progress` → `passing`), and `pub-gallery` entries.

- 2026-09-15 — **Implemented real global website search** (per explicit instruction: search
  across pages/notices/events/programs/faculty/documents/policies/regulations, with keyword
  search, category filtering, pagination, relevance, and an empty state, published-only):
  - Rewrote `searchSite()` (`src/lib/content.ts`) from a fixed, unranked, unpaginated
    6-module search (Notice/Event/Program/Faculty/Scholarship/Policy, title-only) into the 8
    requested categories with a new signature (`{query, category?, page?, pageSize?}` →
    `{results, totalCount, totalPages, page}`). Dropped Scholarship (not in the requested
    category list) and added Documents and Regulations. Every database category now matches
    on title *and* body/description (`OR`), not title alone. **"Pages" has no backing
    table** — added a static `SEARCHABLE_PAGES` list (title/description/href) mirroring
    `PUBLIC_NAV_LINKS`'s 19 real routes (excluding `/search` itself), matched the same way
    as database rows; this is the only category that can never need a publish-state check,
    since every listed page is already public by construction.
  - **Category filtering**: an optional `category` narrows to exactly one of the 8 — when
    set, every other category's database query is skipped entirely (not just filtered out
    after fetching), so an irrelevant filter costs nothing extra.
  - **Relevance**: no full-text-search index exists in this app (`contains` is the only
    matching primitive available), so relevance is a deterministic in-memory score computed
    over each `contains`-matched candidate: exact title match > title starts with the query >
    whole-word match inside the title > any other substring match in the title, plus a small
    bonus if the query also appears in the snippet/body; ties break alphabetically by title
    (never by timestamp, which would make ordering — and any test asserting on it — flaky).
    Candidates are capped at 50 rows per category before ranking, generous for this app's
    realistic single-college content volume.
  - **Pagination**: reused `src/lib/pagination.ts` + `src/components/ui/Pagination.tsx`
    as-is (built generically for the admin Grievances module, not admin-specific) — paginates
    the final combined, ranked list across *all* matching categories, not per-category, so
    page 2 is genuinely "the next 10 most relevant results," not "whatever's left over in
    each table."
  - **Documents respect the same publish/expiry-date window as `/downloads`** — extracted a
    shared `documentWindowWhere(now)` Prisma-where fragment used by both `getDocuments()` and
    `searchSite()`, so a document's search-result visibility can never drift from its
    `/downloads` visibility (the same "one source of truth for visibility" principle already
    applied to `isDocumentPubliclyVisible`/the file-serving route in the previous session's
    work).
  - Rewrote `/search` (`src/app/(public)/search/page.tsx`): still a plain GET form (works
    without JS, bookmarkable), now with a category `<select>` and the shared `Pagination`
    component; kept the `?q=` param name and the "No published results found" empty-state
    copy unchanged so the pre-existing e2e assertions in `public-content.spec.ts` and
    `grievance.spec.ts` (which both `goto("/search?q=...")` and check for that exact phrase)
    kept working without modification.
  - Tests: rewrote `tests/unit/content/queries.test.ts`'s `searchSite` block (category
    filtering, the document date-window fragment, static-page matching, relevance ordering,
    pagination math with no cross-page overlap) and added `tests/unit/ui/Pagination.test.tsx`
    (the `Pagination` component had no unit coverage yet, despite already being reused by two
    features now) — 557/557 unit tests passing project-wide. New `tests/e2e/search.spec.ts`
    (9 tests: every category represented for a broad query, static pages searchable,
    category filter narrows results, a category filter's own empty state, a nonsense query's
    empty state, a blank query shows neither, relevance ordering, pagination controls absent
    when unnecessary, and — the core privacy guarantee — a freshly-created DRAFT notice is
    never returned even when its exact title is searched). Re-ran the full e2e suite (146
    tests, not just the new spec) since `searchSite`'s signature change was a real breaking
    change to shared code — all passing, plus `npm run typecheck`/`npm run lint`/`npm run
    build` all clean.
  - Updated `tests.json`'s `pub-search` entry.

- 2026-09-15 — **Implemented the real admin Dashboard** (per explicit instruction: total
  published pages, drafts, pending reviews, recent notices, upcoming events, compliance
  percentage, requirements needing attention, content not recently reviewed, document expiry
  warnings, recent audit activity — "do not fabricate statistics, all numbers must come from
  the database"):
  - New `src/lib/admin/dashboard.ts`: a registry of all 28 content-authoring modules (the
    same set `MODULE_PERMISSIONS` covers), each with a `groupBy`-by-status query (powers the
    published/draft/pending-review totals) and, for the ~19 modules with an actual editorial
    title field, a `listPublished` query (powers "content not recently reviewed" — the
    9 purely tabular/structured modules like fee structures or enrollment statistics stay in
    the totals but are deliberately left out of that table, since flagging them by a
    synthetic label would be noise, not a useful review prompt).
  - **Every section is permission-scoped to the viewer**, not a site-wide leak: content
    totals and the stale-content table sum only across modules the caller holds `:view` on
    (reusing `MODULE_PERMISSIONS`); recent notices/upcoming events/document expiry need
    `content_general:view`; compliance needs `compliance:view`; audit activity needs
    `audit_logs:view`. A narrowly-scoped role (e.g. ADMISSION_OFFICER) sees fewer sections
    and smaller totals, never an error — the dashboard summarizes *their* admin surface.
  - **Compliance percentage is defined as the share of the 20 circular requirements actually
    VERIFIED by a human** (reusing the existing `getComplianceOverview()` from
    `src/lib/compliance.ts` — no compliance logic duplicated), deliberately not average
    completeness, which a machine can compute with nobody having signed off and would
    overstate how "done" compliance really is (CLAUDE.md rule 7). "Requirements needing
    attention" excludes VERIFIED/NOT_APPLICABLE, ordered worst-first: NEEDS_UPDATE (a
    regression from a previously-verified state) before READY_FOR_REVIEW before IN_PROGRESS
    before NOT_STARTED.
  - **"Content not recently reviewed"** flags PUBLISHED content whose `updatedAt` predates a
    180-day threshold — this app has no per-record "last reviewed" field or scheduled review
    cadence yet (a known gap noted in earlier sessions' open questions), so `updatedAt` is
    the only honest signal available; documented as a deliberate, named threshold constant
    rather than an invented one.
  - **Document expiry warnings**: published documents already past their `expiryDate` (still
    live but quietly stale) or expiring within 30 days, reusing the `Document.expiryDate`
    field built in an earlier session's Document/Media management work.
  - **A real TypeScript/Prisma pitfall, worth remembering**: writing the 28 module `groupBy`
    queries as inline arrow functions inside an array literal typed against a shared
    interface broke Prisma's own generic inference for `.groupBy(...)` — contextually typing
    the closure's expected return type up front corrupts the argument/return conditional
    types Prisma resolves together, surfacing as a confusing "argument not assignable to
    parameter" error with no mention of inference at all. Fixed by extracting each query
    into a standalone top-level named function (no surrounding expected type while its own
    body is checked) and referencing those functions from the registry array (typed via
    `satisfies`, not a contextual `: T[]` annotation) — the array only ever checks each
    function's *already-inferred* concrete return type for structural compatibility, which
    works cleanly.
  - New `src/components/admin/StatCard.tsx` (a labeled number, optionally linking to where
    it came from, with a `data-stat-card` attribute added specifically so e2e tests can
    target one card unambiguously — several stat labels/values otherwise collide with
    identical text elsewhere on the page, e.g. a "Published" status badge).
  - Rewrote `src/app/admin/page.tsx` entirely, replacing the Phase-1 placeholder (module
    link grid only) with the real dashboard sections above the same permission-filtered
    module grid, which was kept as useful secondary navigation.
  - **Found and fixed a real regression while re-verifying the full e2e suite**: the new
    dashboard description text happened to also start with "Signed in as ...", colliding
    with `AdminUserBar`'s existing identity display in the admin layout header and breaking
    a pre-existing `auth.spec.ts` assertion — removed the redundant phrase from the
    dashboard's own description instead of loosening the pre-existing test.
  - Tests: `tests/unit/admin/dashboard.test.ts` (permission filtering per section, status
    aggregation across mocked modules, the 180-day staleness threshold, compliance
    percent/priority-ordering math, expired-vs-expiring-soon classification, audit actor
    name fallback for anonymous/system entries — 571/571 unit tests passing project-wide).
    `tests/e2e/dashboard.spec.ts` (9 tests: SUPER_ADMIN sees every section, EDITOR/
    ADMISSION_OFFICER see only their permitted sections, a freshly-created draft notice
    increments the Drafts count and appears in Recent notices, creating a department writes
    a visible audit entry, and the full upload→submit→review→publish path for a
    document expiring tomorrow makes it appear as a document expiry warning). Ran the full
    e2e suite (155 tests, not just the new spec) — all passing, plus `npm run typecheck`/
    `npm run lint`/`npm run build` all clean.
  - Updated `tests.json`'s `adm-dashboard` entry (flipped `in_progress` → `passing`).

- 2026-09-14 — **Implemented centralized audit logging** (per explicit instruction: log
  create/update/delete-archive/submit/approve/reject/publish/unpublish/login/permission
  changes/compliance verification/grievance status changes, recording actor/timestamp/entity/
  entity ID/action/previous values/new values/metadata; audit records must not be editable
  from normal CMS interfaces):
  - **Centralized the writer.** `src/lib/audit.ts`'s `logAudit()` already existed
    (2026-09-14, CMS-modules session) but required a non-null `actorId`, so every
    system/anonymous action (public grievance submission, automatic compliance status sync,
    a failed login against a nonexistent account) had to bypass it and call
    `prisma.auditLog.create()` directly — 7 call sites in total, each shaping the row
    slightly differently. Widened `LogAuditParams.actorId` to `string | null` and migrated
    all 7 sites (`content-workflow.ts`, `compliance-workflow.ts`, `grievance-workflow.ts`,
    `admin/grievances/actions.ts`'s note/response actions, the public grievance submission
    action, `auth/actions.ts`'s login/logout, and the new `admin/users/actions.ts` below)
    onto the single function, so there is now exactly one place in the codebase that writes
    an `AuditLog` row. Also added a `metadata Json?` column (free-form contextual detail
    beyond before/after field values — e.g. a login's user agent, or which specific role a
    permission change added/removed) and started actually recording `userAgent` on every
    login/failed-login row, which `requestMeta()` had captured but never persisted before.
  - **Built the one real "permission change" surface this app has**: `/admin/users`
    (`src/app/admin/users/page.tsx` + new `src/app/admin/users/actions.ts`), replacing the
    `adm-users` placeholder. Scoped deliberately to role assignment (`UserRole` rows) only —
    a role's own permission grants (`ROLE_PERMISSIONS`) stay fixed in code/seed, not
    runtime-editable, so assigning/revoking a role really is the one permission change a
    human can make here. `assignRoleAction`/`removeRoleAction` (`requirePermission
    ("users:manage")`) validate the role name, refuse assigning an already-held role, refuse
    removing a user's last role (would silently lock them out of every permission-gated page
    — `User.status` exists for deliberate suspension instead), and log `ROLE_CHANGE` with
    real before/after role-name lists plus `metadata: {changeType, role, targetUserEmail}`.
    Full account CRUD and the Roles/Permissions matrix editor remain separate, still-unbuilt
    modules (`adm-roles`/`adm-permissions` stay `in_progress`).
  - **Built the read-only audit log viewer**, replacing the `adm-audit-logs` placeholder:
    `src/lib/admin/audit-logs.ts` (`AUDIT_ACTIONS`/`isAuditAction`/`humanizeAuditAction` —
    Prisma doesn't export an enum's value list, so this is hand-maintained alongside
    `AuditAction` in `schema.prisma`; `getAuditLogPage` with entityType/action/actor filters
    + the existing `pagination.ts` helpers; `getAuditLogEntry` for the detail view),
    `/admin/audit-logs` (list + filter form + `Pagination`) and `/admin/audit-logs/[id]`
    (before/after snapshots + metadata rendered as formatted JSON, plus an explicit note that
    the record is permanent), both gated behind `requirePermission("audit_logs:view")`. The
    dashboard's "recent audit activity" table (built the prior session) now delegates to
    `getAuditLogPage()` instead of its own separate query, so the two views can never
    disagree.
  - **Enforced immutability at the database layer, not just by omission.** The application
    layer already guaranteed no edit/delete path exists (grepped the codebase: `logAudit()`
    is the only writer, and it only ever `.create()`s); hardened this with a real database
    constraint too, since CLAUDE.md rule 8 and this task's explicit "should not be editable"
    both read as a guarantee worth defending in more than one layer. New migration
    `20260916000000_audit_log_hardening` adds `BEFORE UPDATE`/`BEFORE DELETE` Postgres
    triggers on `audit_logs` that unconditionally `RAISE EXCEPTION` — manually verified via
    `psql` that both an `UPDATE` and a `DELETE` against a real row are rejected by the
    database itself, regardless of what future code might try.
  - **Found and fixed a real Playwright anti-pattern while writing the e2e spec**: the
    role-assignment test clicked "Add", then called `page.waitForURL(/\/admin\/users$/)` —
    but the page was already on `/admin/users` *before* the click (from an idempotent
    pre-check step), so `waitForURL` resolved immediately against the pre-click URL instead
    of waiting for the Server Action's redirect to actually land, and the very next
    assertion (filtering the audit log for the new `ROLE_CHANGE` entry) ran before the write
    had committed — a flaky, hard-to-diagnose failure that only showed up under
    multi-worker parallel load, not in isolation. Fixed by waiting for a real DOM change (the
    "Remove REVIEWER" button appearing/disappearing) instead of a URL that never actually
    changes across the round trip. Generalizable lesson, joining the two `waitForURL`
    lessons from earlier sessions: never treat a URL match as proof of completion when the
    action's redirect target can equal the page's current URL.
  - Also split two of the new e2e tests (department CREATE→PUBLISH, grievance status change)
    into `test.describe.serial()` blocks with one `test()` per role, rather than one long
    test calling `loginAs()` multiple times — the already-known "second `loginAs` in one
    test hangs" pitfall from earlier sessions, re-encountered here because the audit-log
    verification step naturally wanted a third `super-admin` login tacked onto the end of an
    existing multi-role workflow test.
  - Added `data-user-card={user.email}` to each user row on `/admin/users` (required
    widening `src/components/ui/Card.tsx` from a fixed `{children, className}` prop shape to
    `ComponentPropsWithoutRef<"div">` with prop spreading, a safe/backward-compatible change)
    so the e2e spec can target one specific user's card reliably instead of a fragile
    DOM-nesting-order `div` filter.
  - Tests: extended `tests/unit/audit.test.ts` (7 cases — the `actorId: null` path, full
    metadata/comment/ipAddress recording, metadata omission), new
    `tests/unit/admin/users/actions.test.ts` (7 cases) and
    `tests/unit/admin/audit-logs.test.ts` (filtering, pagination, actor fallback, detail
    mapping) — 589/589 unit tests passing project-wide. New `tests/e2e/audit-logs.spec.ts`
    (14 tests: access control, read-only guarantees on both list and detail pages, and real
    CREATE/PUBLISH/GRIEVANCE_STATUS_CHANGE/LOGIN/ROLE_CHANGE entries produced by actually
    performing those actions end to end). **Ran the full suite for real**: `npm run
    typecheck`/`npm run lint`/`npm run build` all clean; `npx playwright test` (169/169 e2e,
    including a clean re-run after fixing the `waitForURL` flake above).
  - Updated `tests.json`'s `adm-users` and `adm-audit-logs` entries (both flipped
    `in_progress` → `passing`).

- 2026-09-14 — **Implemented content review/freshness tracking** (per explicit instruction:
  show last updated/last reviewed/next review date/reviewer for relevant content; admin
  warnings for overdue reviews, expired documents, stale admissions/timetable/academic
  calendar/faculty records/notices; make the review period configurable):
  - **Scoped to the 5 modules the warnings list explicitly names** — Notices, Timetables,
    Academic Calendar, Admissions, Faculty — rather than all 28 content modules. Documents
    already has its own, more precise freshness signal (`expiryDate`, built in an earlier
    session) and is deliberately not part of this list; the engine itself
    (`computeReviewFreshness`, `markContentReviewed`) is generic and not tied to this
    specific 5, so extending review tracking to more modules later is additive (new schema
    columns + a registry entry) rather than a redesign.
  - Schema: added `lastReviewedAt DateTime?` / `lastReviewedById String?` to all 5 models
    (plain id, not a relation — matching this schema's existing `createdBy`/`updatedBy`
    audit-stamp convention), a new `ReviewPeriodSetting` model (one row per module with an
    explicit admin-set override; not scoped to a College — review cadence is a system-wide
    policy, like Role/Permission), and a new `MARK_REVIEWED` `AuditAction`
    (`prisma/migrations/20260917000000_content_review_tracking`, zero-drift confirmed).
  - **"Next review due" is always computed live, never stored**: `(lastReviewedAt ??
    publishedAt ?? createdAt) + periodDays`, in `src/lib/content-review.ts`'s
    `computeReviewFreshness`. This is what makes the review period genuinely configurable —
    changing a module's period at `/admin/content-review-settings` immediately and
    retroactively changes every record's overdue status, with no backfill migration ever
    needed. A record never explicitly reviewed still gets a real due date, anchored to when
    it was published (or created, if never published) — so newly published content becomes
    due for its first review after one period, not immediately and not never.
  - `src/lib/admin/review-settings.ts`: `REVIEWABLE_MODULES` (the 5-module registry),
    `DEFAULT_REVIEW_PERIOD_DAYS` (180, matching the dashboard's pre-existing staleness
    heuristic threshold so the default behavior isn't a surprising change), `getReviewPeriods`
    (bulk, for the dashboard scan), `getReviewPeriodDays` (single-module), and
    `setReviewPeriodDays` (validates 1–3650 days, upserts the override, writes an audit entry
    — a review-period change is itself a traceable admin action, CLAUDE.md rule 8).
  - Each of the 5 modules' `[id]/page.tsx` now renders a shared `ReviewPanel`
    (`src/components/admin/ReviewPanel.tsx`: last updated, last reviewed, next review due,
    reviewer, an overdue alert, and a "Mark reviewed" button) alongside the existing
    `WorkflowActions` panel. "Mark reviewed" is a new `markXReviewed` Server Action per module
    (`src/lib/content-review.ts`'s `markContentReviewed`, the single write path all 5 funnel
    through), gated on the module's `:publish` permission rather than `:manage` — reviewing
    for accuracy is a higher-trust check than authoring, the same tier as approve/publish, so
    the same "no role holds both manage and publish for one domain" structural guarantee
    that makes self-approval impossible also makes self-review impossible.
  - New `/admin/content-review-settings` (list + edit form for each of the 5 modules' review
    period), gated behind `compliance:verify` — reused rather than adding a new permission
    for one settings screen, since review-cadence policy is institutional governance in the
    same vein as compliance verification (PRINCIPAL/ADMINISTRATOR/SUPER_ADMIN).
  - **Dashboard extended** (`src/lib/admin/dashboard.ts`): a new `getReviewWarnings` scans
    the 5 modules' PUBLISHED records (draft content isn't a public-facing accuracy risk),
    computing real overdue status per record and a per-module count that stays accurate even
    when the combined "Overdue reviews" table is capped to `limit`. Notices/Faculty/Academic
    Calendar were removed from the older `getStaleContent` `updatedAt`-heuristic registry
    (now real-tracked instead, so the two signals could never quietly disagree); that older
    table was renamed "Other content not recently reviewed" and still covers the remaining
    ~15 modules with no per-record review date. The dashboard now shows 5 named
    "Stale `<module>`" cards plus the combined table, exactly matching the requested warning
    list (the 6th named warning, expired documents, was already built and is unchanged).
  - **Found and fixed a real pre-existing bug while running the full e2e suite**:
    `getNotices()`/`getImportantAnnouncement()` in `src/lib/content.ts` ordered by
    `publishDate desc` with no explicit NULLS handling. Postgres's default for `DESC` is
    NULLS FIRST, so any notice with no `publishDate` set always outranked every dated notice
    as "most current" on both the public `/notices` list and the homepage's announcement
    banner, regardless of actual recency — a real, previously-undetected correctness bug (not
    introduced by this session's changes, just newly surfaced by a new e2e-created notice
    that happened to have no `publishDate`). Fixed with explicit `nulls: "last"` on both
    queries' `orderBy`, verified directly via `psql` before and after.
  - Tests: new `tests/unit/content-review.test.ts` (freshness-math edge cases — anchors on
    lastReviewedAt/publishedAt/createdAt in that order, strict `isOverdue` boundary —
    mark-reviewed's write+audit shape, reviewer-name resolution),
    `tests/unit/admin/review-settings.test.ts` (period get/set/validation, override detail),
    `tests/unit/admin/content-review-settings/actions.test.ts`, a `markXReviewed` case added
    to each of the 5 modules' existing `actions.test.ts` files, and a new `getReviewWarnings`
    block in `tests/unit/admin/dashboard.test.ts` (overdue detection, period overrides,
    reviewer resolution, count-vs-capped-list accuracy) — 625/625 unit tests passing
    project-wide. New `tests/e2e/content-review.spec.ts` (9 tests: the full
    create→submit→publish→mark-reviewed lifecycle with per-role "Mark reviewed" button
    visibility, a resulting `MARK_REVIEWED` audit entry, settings-screen access control,
    saving a custom period and seeing it persist, server-side rejection of an invalid period,
    and the dashboard section rendering) — deliberately doesn't try to force a record into an
    "overdue" state via e2e (nothing in the admin UI exposes backdating a publish timestamp,
    and no other spec in this repo shells out to the database for setup); that exact date
    arithmetic is what the unit tests above cover precisely instead. **Ran the full suite for
    real**: `npm run typecheck`/`npm run lint`/`npm run build` all clean; `npx playwright
    test` (178/178 e2e, including the NULLS-ordering fix's regression check).
  - Updated `tests.json` with a new `adm-content-review` entry and extended `adm-dashboard`'s
    notes to describe the new review-warnings section.

- 2026-09-15 — **Site-wide accessibility audit** (explicit instruction): keyboard navigation, focus
  management, semantic HTML, headings, labels, form errors, table accessibility, alt text, dialogs,
  buttons/links, responsive behavior, and contrast, across both the public site and the admin system —
  fixing real issues, not just cataloguing them. Set up automated checking first: installed
  `@axe-core/playwright` and wrote `tests/e2e/accessibility.spec.ts` (34 tests) running axe-core against
  one page of every "shape" (public content page, login, admin list/create/detail/dashboard) plus every
  admin detail page a fix below touched, gated on WCAG 2.1 A/AA tags — all 34 passing. Findings and fixes:
  - **Contrast (systemic)**: `text-foreground/50` — used for "(optional)" field hints, muted badges
    (ARCHIVED/CLOSED/NOT_APPLICABLE), and helper text across ~90 files — measured **3.41:1** in light mode
    against this app's actual `globals.css` tokens (computed relative luminance, not eyeballed), failing
    WCAG AA's 4.5:1 minimum for normal-size text. Replaced with the already-used `text-foreground/60`
    (4.67:1 light / 6.36:1 dark, both passing) everywhere, a mechanical `sed` across every occurrence.
    Verified every other color-token pairing already in use (success/warning/danger/info/placeholder/brand
    backgrounds with their paired foreground) at 6:1–12:1 — no other contrast issues found.
  - **Current-page indication (keyboard nav / orientation)**: none of `AdminSidebar` (38 links),
    the public header's desktop nav, or `MobileNav` ever marked which page a visitor was on — no
    `aria-current`, no visual distinction. Converted all three to Client Components using `usePathname()`
    (no `cacheComponents` flag is set, so no Suspense boundary was required) with `aria-current="page"`
    plus a visual active state; extracted a new `DesktopNavLinks` component out of `PublicHeader` to do
    it without making the whole header (which fetches the college name) a Client Component.
  - **Invalid `<dl>` markup (semantic HTML)**: 17 of the 32 admin `[id]/page.tsx` detail pages had a
    `<dl>` containing a `<div>` that itself wrapped further `<div>`s around `<dt>`/`<dd>` pairs — invalid
    per the HTML definition-list content model (a `div` that's a direct child of `dl` must contain
    `dt`/`dd` directly, not another `div`), flagged by axe's `definition-list`/`dlitem` rules (WCAG-tagged).
    Fixed in academic-calendar, admissions, affiliation, audit-logs, college-profile, compliance,
    documents, enrollment-statistics, events, exams, fee-structures, gallery item, location, notices,
    results, seminars, and workshops by flattening each pair to `dt`/`dd` as direct grid children
    (`grid sm:grid-flow-col sm:grid-rows-2 sm:grid-cols-N`) — reproduces the exact original side-by-side
    visual layout (column-major fill: label above value per column) without the invalid nesting. Verified
    with a script that re-scanned all 32 `<dl>`-bearing files for the pattern (zero remaining) and with
    axe directly against each fixed page.
  - **Keyboard access to scrollable content**: `DataTable`'s horizontally-scrollable wrapper and two raw
    JSON `<pre>` blocks (audit log detail, timetable schedule) were scrollable but had no way for a
    keyboard-only user to reach the scrolled content (axe `scrollable-region-focusable`, serious impact) —
    added `tabIndex={0}`. The first attempt also added `role="region" aria-label={caption}` to `DataTable`,
    which then collided with an identically (or near-identically) named parent `<section>` landmark on
    pages like `/academics` and `/admissions` (axe `landmark-unique`) — self-caught by re-running a
    broader axe best-practice sweep immediately after the first fix, not by the user. Corrected by
    dropping the redundant region role: a scrollable container only needs to be keyboard-operable, not
    its own named landmark.
  - **Missing landmarks**: `/login` (its own top-level route, outside both the `(public)` and `/admin`
    layouts that normally each provide one) had no `<main>` at all — which also meant the site's skip
    link (`#main-content`, in the root layout) pointed at a target that didn't exist on that specific
    page. Added `<main id="main-content">`. `AdminUserBar` (the "Signed in as … / Sign out" bar) rendered
    as a bare `<div>` outside any landmark; changed to `<header>`.
  - **Verified already correct, left unchanged**: alt text on every raw `<img>` (all real/non-empty, not
    just present); no clickable-`<div>`/`<span>` anti-patterns anywhere; `Alert`'s `role="alert"`
    (danger/warning) vs `role="status"` (info/success) split; `Breadcrumbs`/`Pagination`'s existing
    `aria-current="page"`; `MobileNav`'s existing Escape-to-close and `aria-expanded`/`aria-controls`; no
    true modal dialogs exist anywhere in the app (only `MobileNav`'s non-modal disclosure panel), so there
    was no focus-trap to audit; the default Next.js viewport meta (no zoom lockout); `DataTable`'s
    already-real `<table>` with `scope="col"` headers and a `<caption>`.
  - `tsc`/`eslint` clean; full `npm run test` (625/625) and full `npx playwright test` re-run after every
    fix, both clean except one pre-existing e2e flake unrelated to this work (see decisions log below).
  - Updated `tests.json` with a new `shell-accessibility-audit` entry under `public_shell`.

- 2026-09-15 — **Site-wide security review** (explicit instruction): authentication, authorization, role
  escalation, server-side permissions, input validation, XSS, SQL injection, CSRF, file uploads, path
  traversal, session handling, secrets, API endpoints, private grievance data, admin routes, security
  headers, and rate limiting — fixing real issues, not just producing a report, with tests run after every
  fix. Most categories checked out already solid (see `tests.json`'s `shell-security-review` entry for the
  full verification list — authorization coverage across every admin page/action, SQL-injection safety,
  XSS, CSRF, path traversal, secrets handling, private-grievance-data handling). Real gaps found and fixed:
  - **Login had no per-IP rate limit**, only the existing per-account lockout (`failedLoginAttempts`/
    `lockedUntil`) — an attacker spreading guesses across many different known/leaked accounts from one
    source could never trip any single account's 5-attempt lockout. Added the same per-IP `RateLimitEntry`
    limiter the public grievance form already used. The threshold is environment-aware (10/15min in
    production; much higher outside it) because this repo's own e2e suite opens nearly every spec with a
    real login — a production-sized limit made the suite itself look like a credential-stuffing attack
    from one IP the first time it was tried, which is how this constraint was actually discovered.
  - **File uploads (Documents, Media, grievance attachments) validated only the client-asserted
    `File.type`**, never the file's actual bytes — a scripted client can set any `Content-Type` on a
    multipart part regardless of the real content, so a disguised HTML/script file could be uploaded under
    an allow-listed MIME type. Combined with the Media route serving images inline (`Content-Disposition:
    inline`), this was a real (if browser-dependent) content-sniffing stored-XSS risk. Added
    `src/lib/security/file-signature.ts` — magic-byte verification for every allow-listed type with a real
    signature (PDF, JPEG/PNG/GIF/WEBP, the legacy OLE2 Office formats, the ZIP-based OOXML formats) — wired
    into both `saveUploadedFile` and `saveGrievanceAttachment`, rejecting a mismatch before anything
    touches disk. This also meant strengthening the existing upload unit tests, which had been using
    placeholder text (`"content"`) for every fixture regardless of claimed type — upgraded those fixtures
    to genuine magic-byte content and added dedicated signature-mismatch tests plus a standalone test file
    for the new function itself.
  - **`next.config.ts` had zero security headers.** Added a `Content-Security-Policy` (no external script/
    style/font/image origins — this app loads none — `object-src`/`frame-ancestors 'none'`), `X-Content-
    Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, a locked-down `Permissions-Policy`,
    `Strict-Transport-Security` (production only), and `poweredByHeader: false`. No nonce-based CSP (would
    require a Proxy file generating a fresh nonce per request and forcing every route to dynamic rendering
    — a much larger structural change than this app's actual XSS exposure justifies, given React's default
    escaping and exactly one `dangerouslySetInnerHTML` call, already `<`-escaped). Verified the headers
    actually land on a real `npm run start` response via `curl`, not just trusted from the config file.
  - **Known gap, deliberately flagged rather than fixed**: nearly every admin query filters by `id` alone,
    not also by the signed-in user's `collegeId` — a real IDOR/horizontal-authorization gap *if* this app
    ever became genuinely multi-tenant. Not fixed because there is currently no code path anywhere that
    creates a second `College` row (verified directly — no `prisma.college.create` call exists in the
    codebase, and the live dev database holds exactly one college), so there is no other tenant's data to
    leak today, and whether this app is single-tenant or a multi-tenant template is an explicit, still-open
    question this session didn't have standing to resolve unilaterally by retrofitting ~30 modules' queries
    for a requirement that hasn't been decided. See the decisions log and Open questions.
  - `tsc`/`eslint` clean; full `npm run test` (637/637) and full `npx playwright test` (211/212 — the one
    failure is the same pre-existing, already-documented test-data-accumulation flake from the prior
    session's accessibility audit, unrelated to this work) re-run after every fix; a real production build
    (`npm run build` + `npm run start`) verified clean and its response headers confirmed directly.
  - Updated `tests.json` with a new `auth-login-rate-limit` entry and a new `shell-security-review` entry.

- 2026-09-15 — **Full-application browser-automation walkthrough** (explicit instruction): ran the real dev
  server and drove a real browser (Playwright/Chromium) through the public site's 10 main entry points and
  the complete admin notice lifecycle (login → dashboard → create → draft → submit → review → approve →
  publish → verify publicly → edit → audit trail) plus a compliance-dashboard verification, at both desktop
  and a real 375×812 mobile viewport — genuine UI interaction throughout (typing into the real search box
  and clicking Search, following the real Edit link), not just URL navigation. New
  `tests/e2e/full-walkthrough.spec.ts` (21 tests). Found and fixed one real defect:
  - **The admin dashboard (`/admin`) overflowed horizontally at 375px width.** Root-caused by measuring
    computed widths up the DOM ancestor chain from the overflowing content (rather than guessing) until the
    exact point the constraint broke: the "Recent notices"/"Upcoming events" cards sit in a
    `grid gap-6 lg:grid-cols-2` (a single implicit column below `lg:`), and a CSS Grid item's default
    `min-width: auto` means it won't shrink below its content's intrinsic width unless told otherwise — so a
    long notice/event title inside a `flex items-center justify-between` row, despite already carrying a
    `truncate` class the original author clearly intended to engage, never actually got the chance to
    truncate, because the *grid item* (the Card), not just the text link inside it, needed `min-w-0` to be
    allowed to shrink at all. This is a second, independent instance of the same flexbox/grid "intrinsic
    minimum size" trap already documented once in this project, for the public header's nav (see the
    2026-09-13 `shell-responsive-no-horizontal-scroll` decision below) — the underlying CSS gotcha recurs
    because it's per-container, not something fixed once globally. Fixed with `min-w-0` on both `<Card>`s
    (`src/app/admin/page.tsx`) plus `min-w-0 flex-1` on the two notice/event title `<Link>`s inside them —
    the Link-only fix alone was *not* sufficient (verified empirically by re-measuring after applying it
    alone before finding the Card also needed it), a useful reminder that this class of bug can require a
    fix at more than one level of the ancestor chain, not just the innermost element that looks broken.
  - `tsc`/`eslint` clean; full `npm run test` (637/637) and full `npx playwright test` (232/233 — the one
    failure is the same pre-existing, already-documented test-data-accumulation flake, unrelated) re-run
    after the fix; a real production build (`npm run build`) verified clean.
  - Updated `tests.json` with a new `shell-full-walkthrough` entry under `public_shell`.

## In progress

- Nothing in progress. Phase 1 (project foundation), Phase 2 (database), Phase 3
  (authentication & authorization), Phase 4 (public website shell), the homepage, every CMS
  module for the circular's required content types, the Compliance Dashboard, the Grievance
  system (public + admin), real Document/Media upload management, global search, the real
  admin Dashboard, centralized audit logging, role-assignment (`/admin/users`), and content
  review/freshness tracking (for Notices/Timetables/Academic Calendar/Admissions/Faculty) are
  all complete. Every module listed in `CLAUDE.md`'s required scope now has real, tested
  behavior except the Roles/Permissions matrix editor and the cross-module Approval workflow
  queue — see Next steps.
- **Reminder to self**: commit this work to git at the next natural checkpoint (with the
  user's go-ahead) — everything since `b9099b1` is still uncommitted working-tree state,
  which is what made the `tests.json` mishap noted earlier in this file possible in the
  first place.

## Next steps

1. Build the generic `ApprovalRequest`/notification layer on top of the workflow engine
   (`docs/implementation-plan.md` Phase 2's other half) — right now a REVIEWER discovers
   pending work only by manually filtering a module's list to `?status=SUBMITTED` or
   `?status=UNDER_REVIEW`;
   `/admin/approval-workflow` (still a placeholder) should become a cross-module "things
   waiting on me" queue, and an EDITOR should get notified when their submission is
   approved/rejected.
2. Build a real Roles/Permissions matrix editor (`/admin/roles`, `/admin/permissions`, both
   still placeholders) — `/admin/users` now covers *assigning* a user's roles, but each
   role's own permission grants (`ROLE_PERMISSIONS`) are still fixed in code/seed, not
   editable at runtime.
3. The grievance list's search can't reach `submitterEmail`/`submitterPhone` (encrypted
   columns aren't queryable by `contains`) — acceptable for now (reference number/subject/
   name/description cover the common case), but worth a searchable-hash-index approach if
   staff report needing to look up a case by contact info alone.
4. Gather real college data for the highest-priority sections (College Profile, Programs, Faculty,
   Contact, Location, Affiliation) — placeholders only until this is supplied.
5. Resolve remaining open questions below (single college vs. template, languages) — neither
   blocks further engineering work right now, but they shape how the already-built content
   schema gets populated with real data.
6. `Course` (a `Program` sub-resource) has no CMS module yet and, per the 2026-09-14 audit,
   is missing `publishedAt`/`publishedBy` like `FeeStructure`/`Contact`/etc. were before this
   session — add both columns in the same migration that builds its CMS module, rather than
   discovering the gap mid-implementation again.
7. Content review/freshness tracking (see the 2026-09-14 decisions log entries below) is
   scoped to the 5 modules the warnings list named — Departments, Programs, Staff, and the
   ~20 other content modules still have no per-record review date, only the older `updatedAt`
   heuristic. Worth extending if staff need "is this still accurate" tracking on more than
   Notices/Timetables/Academic Calendar/Admissions/Faculty; the engine itself
   (`src/lib/content-review.ts`) is already generic enough that doing so is additive schema
   + registry work, not a redesign.

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
| 2026-09-14 | **Deleted 29 pre-existing `grievances`/`grievance_notes` rows from the local dev database** to apply the grievance-system migration (new required `referenceNumber`/`subject`/`submitterEmail` columns can't be added NOT NULL onto existing rows). Confirmed with the user first (`AskUserQuestion`) rather than deleting unilaterally, since it's a destructive operation on existing data even though all 29 rows were identifiable as Playwright e2e artifacts (test-pattern names/emails, not real citizen submissions) from earlier sessions' repeated `tests/e2e/public-content.spec.ts` runs — this app has no production users yet. Re-ran `prisma/seed.ts` afterward to restore the one dev fixture. |
| 2026-09-14 | **Grievance case-management is its own workflow engine (`src/lib/grievance-workflow.ts`), not a reuse of `content-workflow.ts` or `compliance-workflow.ts`** — resolving the open design question from the prior session. Neither existing engine fit: content-workflow assumes the record becomes *public* once it reaches a terminal state (a grievance never does — rule 6); compliance-workflow is built around a fixed 20-item checklist, not an open-ended, growing list of confidential case records. `assignGrievance` is deliberately a separate function from the plain status-transition machinery, since assignment carries an extra field (`assigneeId`) a status flip doesn't. |
| 2026-09-14 | **Grievance responses have no outbound delivery mechanism** — recording a response (`GrievanceResponse`) is the authoritative record of what staff decided to communicate back, not proof an email/SMS/letter actually reached the submitter. This project has no email/SMS provider integrated anywhere yet (a broader gap noted in `docs/architecture.md`'s "Notifications" section, still unbuilt — see Next steps item 1). Flagged directly in the admin UI's copy so staff don't mistake "recorded" for "sent." |
| 2026-09-14 | **`submitterEmail`/`submitterPhone` stay encrypted, so the grievance list's search can't query them** — search covers reference number, subject, submitter name, and description (all plaintext columns) instead. Accepted as a known limitation (see Next steps) rather than either leaving contact info unencrypted (violates rule 6) or building a separate searchable-hash-index column, which wasn't asked for and adds a new pattern for a need not yet demonstrated. |
| 2026-09-15 | **`archive`/`unarchive`/`unpublish` were added to the *shared* `content-workflow.ts` engine, not implemented as Documents/Gallery-only one-offs** — the alternative (a parallel workflow module, like Grievance's) would have been wrong here, unlike the grievance case, because Documents/Gallery *do* fit the existing draft→review→publish shape exactly; they were only ever missing the archive/unpublish actions, which every other module using the same engine was also silently missing despite `tests.json` claiming otherwise since Phase 4. Fixing it once in the shared engine closes that gap everywhere for free, at the cost of needing to re-verify the *entire* e2e suite (not just the two modules asked about) for behavior changes — done: 137/137 passing, one real assertion fixed (see below). |
| 2026-09-15 | **Removed `Document.fileUrl` and `Media.url` entirely** (replaced by internal `storedPath` + a route-computed public URL) rather than keeping them alongside the new upload fields — the columns held a pasted external URL, a capability real file upload fully replaces; keeping both would mean two different, driftable ways to answer "where is this file," and the task was explicitly to implement real upload, not to keep the placeholder path as a fallback. |
| 2026-09-15 | **Document's `approvedById`/`approvedAt` are set by a small follow-up mutation inside `transitionDocument`, not a field on the shared `WorkflowUpdateData` type** — making "approver" generic across all 28 modules would mean adding two columns to every one of their Prisma models for a field only Documents was asked to track; keeping it module-local costs one small `if` in one Server Action instead. |
| 2026-09-15 | **Running the full e2e suite after the shared-engine change surfaced one real regression and two pre-existing, unrelated test bugs — all fixed rather than left as "known flaky":** (1) `cms-departments.spec.ts` asserted zero workflow actions were available to a REVIEWER on `UPDATE_REQUIRED` content; `archive` is now legal there too (REVIEWER holds publish-tier), so the assertion was narrowed to specifically check `return_to_draft`'s absence instead of the whole action panel's. (2) `grievance.spec.ts`'s assign-step assertion used a plain (substring) `getByText("Assigned")`, which also matches the unrelated "Unassigned" fallback text shown before any assignment exists — silently masking a real assignment failure as a pass; changed to `exact: true`. (3) The grievance form's honeypot field was hidden only via its *wrapper* `div`'s zero-size/overflow-hidden styling, not the `<input>` itself, so an automated visibility check of the input's own bounding box could (rarely, under heavy concurrent load) still see it as non-empty; the input itself now carries the same zero-size/clipped styling directly. None of these three were caused by or specific to Documents/Media — they surfaced only because this session's fuller e2e run put more load on the shared dev server/database than prior single-feature sessions had. |
| 2026-09-15 | **Search relevance is an in-memory heuristic score, not Postgres full-text search (`tsvector`/`ts_rank`)** — the latter would need a raw-SQL `UNION` across 8 differently-shaped tables (plus the static pages list, which isn't a table at all) to produce one ranked list, a lot of raw SQL to hand-maintain for a single-college site's realistic content volume. The chosen approach — fetch up to 50 `contains`-matched candidates per category, score deterministically, sort once — gives a real, testable relevance ordering without that infrastructure; worth revisiting only if/when content volume or "did you mean" / fuzzy-match requirements actually demand it. |
| 2026-09-15 | **Dropped Scholarship from search, added Documents and Regulations** — the previous ad hoc 6-module search set (Notice/Event/Program/Faculty/Scholarship/Policy) is superseded by this session's explicit 8-category list (pages/notices/events/programs/faculty/documents/policies/regulations), which doesn't include Scholarship. Conforming exactly to the requested list rather than keeping Scholarship "for free" alongside it, since the user's category list reads as the authoritative full scope, not an addition to whatever existed before. |
| 2026-09-15 | **"Pages" search results come from a hand-written static list (`SEARCHABLE_PAGES`), not `PUBLIC_NAV_LINKS` directly** — reusing the nav's `{href, label}` shape as-is would give every page result an empty/no snippet, which reads as broken on a results page (every other category has a snippet). Added a one-line description per page instead; this is UI chrome text, not fabricated institutional data, so it doesn't touch CLAUDE.md rule 1. |
| 2026-09-15 | **Dashboard "compliance percentage" = share of requirements VERIFIED, not average completeness** — the compliance module already computes a live completeness percent per requirement, but averaging those would let a dashboard number look better than the actual, human-gated compliance state CLAUDE.md rule 7 cares about (a 90%-complete-but-never-reviewed requirement is not 90% compliant). Reused `getComplianceOverview()` as-is rather than adding a second compliance aggregation function. |
| 2026-09-15 | **Dashboard content totals/stale-content are scoped per viewer's real permissions, not site-wide** — every section sums or lists only across the modules `MODULE_PERMISSIONS` says the signed-in role holds `:view` on (same pattern the module link grid already used for navigation). A narrower role sees a smaller, still-honest dashboard rather than either an error or numbers describing domains it can't open. |
| 2026-09-15 | **28 Prisma `.groupBy()` calls had to be extracted into standalone top-level named functions instead of inline closures inside the module registry array** — contextually typing an inline arrow function against the registry's declared return type broke Prisma's own generic inference for `.groupBy` (its argument/return types resolve together via conditional types that don't tolerate an externally-imposed expected return type), surfacing as a confusing "argument not assignable" error with no mention of inference. A standalone function has no surrounding expected type while its body is checked, so Prisma infers its real return type first; the registry array (built with `satisfies`, not a contextual `: T[]` annotation) only checks that already-concrete type afterward. Worth remembering for any future generic-registry-of-Prisma-queries pattern in this codebase. |
| 2026-09-14 | **Centralized audit logging implemented** per explicit instruction. Widened `logAudit()`'s `actorId` to `string \| null` so every system/anonymous action (public grievance submission, automatic compliance sync, a login attempt against a nonexistent account) can go through the one real writer instead of a bespoke direct `prisma.auditLog.create()` call — this, not adding new call sites, was the actual "centralization" work, since almost every mutating action already called *some* audit-writing code before this session. |
| 2026-09-14 | **Audit-log immutability is enforced in two layers, not one**: the application layer (no edit/delete Server Action exists anywhere — verified by grep) plus a database-level Postgres trigger (`BEFORE UPDATE`/`BEFORE DELETE` on `audit_logs`, migration `20260916000000_audit_log_hardening`) that rejects the operation outright. The trigger is the real guarantee; the application-layer absence is necessary but not sufficient, since it only holds as long as nobody ever adds a new write path without reading this comment. |
| 2026-09-14 | **"Permission changes" is scoped to role assignment (`UserRole` rows) only, not a full Users/Roles/Permissions CRUD suite** — this app's data model has no other runtime-editable permission concept (`ROLE_PERMISSIONS` is fixed in code/seed), so assigning/revoking which roles a user holds is the one real permission change a human can make. The Roles/Permissions matrix editor stays a separate, still-unbuilt module (see Next steps). |
| 2026-09-14 | **`removeRoleAction` refuses to remove a user's last role** rather than allowing it — a user with zero roles could still sign in (a valid session) but would fail every single permission-gated page, an effectively silent lockout rather than a deliberate account suspension. `User.status` already exists for genuinely disabling an account; that's the intended tool for "this person should lose access," not stripping their last role. |
| 2026-09-14 | **e2e role-assignment testing targets the non-login-capable `dev-seed-admin` fixture**, not any of the 8 per-role login test accounts (`<role-slug>@example.invalid`) other specs authenticate as — it already holds `SUPER_ADMIN`, so temporarily adding/removing `REVIEWER` changes no *effective* permission and can't corrupt another spec's role-based assumptions about a shared account running in parallel. The test is also written idempotently (checks for and clears a leftover `REVIEWER` assignment at start, restores original state at the end) so a prior aborted run can't leave the fixture in a state that breaks the next one. |
| 2026-09-14 | **Found a new category of e2e flake, distinct from the two `waitForURL` lessons and the double-`loginAs` lesson from earlier sessions**: calling `waitForURL(pattern)` immediately after a click, when the page was *already* on a URL matching `pattern` before the click ran (here: an idempotent pre-check step already sat on `/admin/users`, then a later click also redirects back to `/admin/users`), can resolve against the pre-click URL instead of waiting for the click's own navigation — silently turning a "wait for the mutation to land" into a no-op wait, surfacing only as an intermittent failure under multi-worker parallel load. Fixed by waiting for a real DOM/content change instead. Combined with the two prior `waitForURL` lessons, the durable rule for this codebase is: never trust `waitForURL` to prove a specific action completed unless the URL is guaranteed to differ from wherever the page already was. |
| 2026-09-14 | **Content review/freshness tracking implemented** per explicit instruction, scoped to exactly the 5 modules the task's warnings list named (Notices, Timetables, Academic Calendar, Admissions, Faculty) rather than all 28 content modules — Documents already has a more precise freshness signal (`expiryDate`) and wasn't named; the other ~20 modules weren't named either. The underlying engine is generic, so this is a scope choice about *where it's wired up today*, not a ceiling on where it could go. |
| 2026-09-14 | **"Next review due" is always computed live — `(lastReviewedAt ?? publishedAt ?? createdAt) + periodDays` — never stored on the record.** This is what makes "make the review period configurable" actually mean something: changing a module's period at `/admin/content-review-settings` instantly and retroactively changes every record's overdue status, with no backfill migration ever needed for a period change to take effect. The tradeoff is one extra small query (the module's current period) on every render of a `ReviewPanel` or the dashboard's warning scan — accepted as cheap relative to the correctness benefit. |
| 2026-09-14 | **"Mark reviewed" is gated on the module's `:publish` permission, not `:manage`** — reviewing content for continued accuracy is a higher-trust check than authoring it, the same tier as approve/publish. Since no role holds both `:manage` and `:publish` for the same domain (the existing separation-of-duties guarantee — see the 2026-09-14 CMS-modules decisions log entries), this also makes self-review structurally impossible, the same way self-approval already was. |
| 2026-09-14 | **The review-period settings screen reuses the existing `compliance:verify` permission rather than adding a new one** — setting institutional policy on how often content must be reconfirmed is governance in the same vein as compliance verification (both restricted to PRINCIPAL/ADMINISTRATOR/SUPER_ADMIN), and a single settings screen didn't seem to warrant growing the permission matrix for it. |
| 2026-09-14 | **`ReviewPeriodSetting` is not scoped to a `College`** — like `Role`/`Permission`, review cadence is treated as a system-wide admin policy rather than per-tenant content, consistent with how this schema already treats RBAC configuration. |
| 2026-09-14 | **Notices/Faculty/Academic Calendar were removed from the dashboard's older `updatedAt`-heuristic "stale content" registry** now that they have real review tracking, rather than showing both signals side by side for the same records — the older heuristic (renamed "Other content not recently reviewed") still covers the ~15 modules that don't have per-record review dates yet. |
| 2026-09-14 | **Found and fixed a real pre-existing bug surfaced by the full e2e suite, unrelated to this session's own changes**: `getNotices()`/`getImportantAnnouncement()` ordered by `publishDate desc` with no explicit NULLS handling, and Postgres's default for `DESC` is NULLS FIRST — so any notice with no `publishDate` set always outranked every dated notice as "most current" on both the public `/notices` page and the homepage announcement banner. Only surfaced now because a new e2e-created notice happened to have no `publishDate`; fixed with explicit `nulls: "last"` on both queries. A reminder that "the full suite is green" doesn't mean "no latent bugs exist" — it means none have been *triggered* yet by the specific data the suite happens to create. |
| 2026-09-15 | **Accessibility audit implemented** per explicit instruction, covering keyboard nav/focus management/semantic HTML/headings/labels/form errors/table accessibility/alt text/dialogs/buttons-links/responsive/contrast, with automated axe-core coverage added first (`tests/e2e/accessibility.spec.ts`) so findings were verified programmatically rather than by eye. See the 2026-09-15 Completed entry for the full list of what was found and fixed (systemic `/50`-opacity contrast failure, missing current-page indication in all three nav components, invalid `<dl>` nesting on 17 admin detail pages, non-keyboard-focusable scrollable regions, two missing `<main>`/`<header>` landmarks). |
| 2026-09-15 | **Chose `grid-flow-col`/`grid-rows-2` over introducing a shared `<DescriptionList>` component to fix the 17 broken `<dl>`s.** A shared component would be the more scalable long-term answer (this exact "label above value, two side by side" shape is hand-rolled independently in all 32 `[id]/page.tsx` files, not just the 17 broken ones), but rewriting all 32 call sites was a larger, riskier refactor than the accessibility task itself needed; the per-file mechanical fix closes every actual violation today without changing any other page's markup. Worth revisiting as a real DRY cleanup later — flagged, not silently deferred. |
| 2026-09-15 | **A `role="region"` fix attempt (on `DataTable`'s scrollable wrapper) turned out to be a regression, caught and reverted within this same session** — added to close axe's `scrollable-region-focusable` finding, it created a duplicate-named landmark on any page where the table already sits inside a same-named `<section>` (axe `landmark-unique`, e.g. `/academics`). Caught by re-running a broader best-practice axe sweep immediately after the fix as a deliberate verification step, not by chance or by the user — the lesson generalizes: an accessibility fix that adds a new landmark/role needs checking against pages where that component nests inside another already-labeled landmark, not just the one page the original finding came from. |
| 2026-09-15 | **Left one real e2e flake unfixed, on purpose, after tracing it to test-data accumulation rather than an application or accessibility bug**: `dashboard.spec.ts`'s "document expiry warning" test intermittently fails because the dashboard's expiry-warning table is capped at 10 rows ordered soonest-first, and this long session's repeated full-suite/e2e runs against the same shared dev database have accumulated 12 "E2E Dashboard Expiring Doc" rows all clustered on the same 1–2 expiry dates (confirmed via direct `psql` query) — the newest run's own row can fall outside the top 10. Root cause is the e2e suite creating real, uncleaned rows across many runs in one long-lived dev database, not a bug in the reviewed code paths; out of scope for an accessibility audit to fix (would mean adding test teardown/DB reset infrastructure this suite doesn't have anywhere else). Flagged here rather than silently left for the next person to rediscover. |
| 2026-09-15 | **Security review implemented** per explicit instruction. Login's new per-IP rate limit deliberately uses a much higher ceiling outside production (`process.env.NODE_ENV === "production" ? 10 : 500`, both per 15 minutes) rather than one fixed value — discovered the hard way, by the review's own full e2e regression tripping the initial production-sized limit (10/15min) purely from this repo's own test suite logging in repeatedly from one IP (localhost). This is the same shape of trade-off as `DEV_LOGIN_PASSWORD`/dev-seed-account gating (`prisma/seed.ts`) — a defense that must stay strict in production but can't be allowed to cripple the very test suite that verifies it works. |
| 2026-09-15 | **File-upload magic-byte verification (`src/lib/security/file-signature.ts`) checks the byte signature, not full structural validity** — e.g. it confirms a ZIP local-file-header signature for `.docx`/`.xlsx`/`.pptx` without verifying the archive is actually well-formed OOXML, and confirms the OLE2/CFB signature for `.doc`/`.xls`/`.ppt` without distinguishing which of the three it actually is (they share one container format and aren't distinguishable from magic bytes alone). This is a deliberate scope boundary: the actual threat this closes is "attacker uploads a completely different kind of file (HTML/script/executable) disguised as an allow-listed type," not "attacker uploads a subtly malformed Office document" — full parsing of every allow-listed format would be a much larger, format-parser-dependent undertaking for a threat this app doesn't otherwise face (uploaded documents are served for download/embedding, never executed or parsed server-side). |
| 2026-09-15 | **Did not add per-`collegeId` scoping to admin queries (a real IDOR gap if this app is ever deployed multi-tenant) as part of the security review** — see the new Completed entry and the amended multi-tenancy Open Question below. Judged as flagging a real, currently-inert architectural gap correctly rather than either silently ignoring it (leaves a live risk undocumented for whoever answers the multi-tenancy question later) or unilaterally retrofitting ~30 modules' queries for a requirement `CLAUDE.md`/this project's Open Questions explicitly haven't settled (over-scoping a security review into an unrequested architecture change). |
| 2026-09-15 | **Full-application browser-automation walkthrough implemented** per explicit instruction — the public site's 10 main entry points plus the complete admin notice lifecycle and a compliance verification, driven with real Playwright/Chromium browser interaction (typing into the real search box, following the real Edit link) rather than direct URL/Server-Action calls, at both desktop and a real 375×812 mobile viewport. Found and fixed a real horizontal-overflow bug on the admin dashboard at mobile width — see the Completed entry above for the full root-cause trace. This is the second time this exact "grid/flex item won't shrink below its content's intrinsic width without an explicit `min-w-0`" bug class has surfaced in this project (the first was the public header's desktop nav, 2026-09-13) — worth remembering as a standing review checklist item for any *new* `grid`/`flex` section holding variable-length text, not just something fixed once and forgotten. |
| 2026-09-16 | **Added four project-specific Claude Code skills under `.claude/skills/` (`compliance`, `security`, `cms`, `testing`)** per explicit instruction, each documenting purpose/when-it-applies/project rules/implementation rules/validation checklist/common mistakes grounded in the actual current code (`src/lib/content-workflow.ts`, `src/lib/compliance-workflow.ts`, `src/lib/auth/*`, `docs/permission-matrix.md`, `docs/compliance-matrix.md`) rather than generic advice — `compliance` enumerates all 20 circular items plus governance requirements from `docs/requirements.md` §2–3, `security` centers on `requirePermission()`/`requireUser()` as the only real boundary (CLAUDE.md rule 5), `cms` codifies the shared `ContentStatus` state machine and manage/publish separation of duties, `testing` enforces CLAUDE.md rule 10 (never delete/weaken a test to pass it) and keeping `tests.json` honest. These are documentation/process artifacts, not application code — no build/test impact. |
| 2026-09-16 | **Resolved 13 of this file's long-standing Open Questions via direct user Q&A**, closing most of the "is this the right policy" ambiguity that had accumulated: **single-tenant only** (no second `College` row is planned, so the collegeId-scoping IDOR gap flagged by the 2026-09-15 security review stays documented-but-inert rather than being retrofitted now — revisit *before* a second college's data is ever created if this answer ever changes); **English-only** public site (no i18n work needed); **keep the fixed 8-hour session expiry** (no remember-me/refresh-token); **no MFA required for MVP**; **keep the 20-section Phase 4 route consolidation** as-is; **keep `ComplianceEvidence`→`PUBLISHED`-record verification as human judgment**, not an enforced constraint; **keep the 180-day review-cadence default** for all 5 tracked modules (Notices/Timetables/Academic Calendar/Admissions/Faculty), adjustable per-college later via `/admin/content-review-settings`; **keep "editing a PUBLISHED record doesn't revert its status"** as the policy (a reviewer wanting re-review still uses `request_update` explicitly); **defer building a notification system** (authors still check the audit trail for approve/reject/request_update events); **keep local-disk file storage** (`storage/uploads/`) rather than moving to S3-compatible storage now; **college type = Education College** (affects seed data and terminology — e.g. "moot court room" in Infrastructure is a Law-college-only concept); **keep grievance/compliance oversight folded into `PRINCIPAL`/`ADMINISTRATOR`** rather than adding dedicated `GRIEVANCE_OFFICER`/`COMPLIANCE_OFFICER` roles. Two questions were *not* resolved by this round — see Open Questions below. |
| 2026-09-16 | **Built the `ComplianceReportExport` feature** (user chose "build it now" over "leave for later"), implemented as a background agent in parallel with the workflow-banner entry below. `/admin/compliance/reports` generates a durable, timestamped snapshot of every `ComplianceRequirement`'s status for the college plus a live website URL (`generateComplianceReport`), then separately records one-way submission to the Office of the Inspector of Colleges (`recordComplianceReportSubmission` — `submittedAt`/`submittedById`, never re-settable once set). Both actions gated on `compliance:verify` (Principal/Administrator/Super Admin, matching `docs/compliance-matrix.md`'s "Principal signs off before submission") and write `AuditLog` entries (`COMPLIANCE_REPORT_GENERATED`, `COMPLIANCE_REPORT_SUBMITTED`). Generation deliberately does **not** require every requirement to be `VERIFIED` first — partial-progress reports are allowed, with completeness visible in the snapshot, since a college mid-launch still needs to show status. `docs/database-design.md` §9 and `docs/compliance-matrix.md` §2 updated to describe the real implementation (a persisted table, and the real `ComplianceRequirement` model name — the docs' earlier sketch used a draft `ComplianceItem` name and called the export "maybe not a stored table"). **Flagged, not fixed**: `compliance:view` and `compliance:verify` currently map to identical roles in the permission matrix, so there's no seeded dev account that can see the reports list without also being able to generate/submit — a real gap in test coverage granularity, not a security issue, noted in the new tests. |
| 2026-09-16 | **Surfaced the reviewer's `request_update` reason on the record's own admin page** (user chose to surface it over leaving it audit-log-only), implemented as a background agent in parallel with the compliance-report entry above. `WorkflowActions` (`src/components/admin/WorkflowActions.tsx`, shared across all 29 `ContentStatus`-workflow modules) is now an async Server Component taking a new `entityType` prop; when a record's status is `UPDATE_REQUIRED` it looks up and displays the latest `REQUEST_UPDATE` audit comment (new `getLatestActionComment` helper in `src/lib/audit.ts`) as a banner above the action buttons, so the author sees why an update was requested without hunting through the audit trail. **Surfaced a real, previously-unnoticed policy gap while building this**: unlike `reject`, `request_update` does not actually require a non-empty reason today (`REASON_REQUIRED_ACTIONS` in `src/lib/content-workflow.ts` only contains `"reject"`), so the new banner can legitimately have nothing to show. Deliberately not fixed as part of this task (it changes transition *validation*, not just display) — added as a new Open Question below instead of silently patched in. |
| 2026-09-16 | **Entered the user-supplied college dataset (name, address, phone, emails, website, principal, affiliation, founding year) into the seeded College/CollegeProfile/Contact/Location/Affiliation rows** (`prisma/seed.ts`) and re-ran `npm run db:seed` against the dev database — the user explicitly flagged this as demo/test data, not verified official records (their message tagged the affiliation line "(DEMO DATA ONLY)"; the email/website values use RFC 2606 `.example` addresses), so every field kept the existing `[PLACEHOLDER]`-prefix + `isPlaceholder: true` convention (CLAUDE.md rules 1, 13, 14) rather than being marked verified. One exception: `Affiliation.universityName` was set to the real "Shah Abdul Latif University, Khairpur" unprefixed, since that institution's name is itself the real, documented affiliating university from the circular (`docs/requirements.md`), not invented — only the *claim* that this specific demo college holds that affiliation (number, regulatory body, validity) stays placeholder-marked, since that hasn't been verified by a competent authority. Verified end-to-end via a real `next dev` server + `curl`: the data renders correctly on `/about`, `/campus`, `/contact`, and `/affiliation` with the demo/placeholder notice intact. `npm run typecheck`, `npm run lint`, and `npm test` (650/650) all clean after the change. This closes the "college name/type" half of the Open Question below but not the whole thing — real, verified institutional data (to replace this demo set and flip `isPlaceholder: false`) still hasn't been supplied. |

## Open questions

- Real, **verified** institutional data to replace the demo dataset entered 2026-09-16 (see the decisions
  log entry above) — that dataset is explicitly demo/placeholder, not the college's actual official
  records, so `isPlaceholder` stays `true` and content stays out of any real compliance sign-off until an
  authorized person supplies and verifies the real values (name, address, contact, principal, affiliation
  number, history/vision/mission, departments/programs).
- Should `request_update` require a non-empty reason/comment, the same way `reject` already does? Surfaced
  2026-09-16 while building the `request_update`-reason banner (`src/lib/content-workflow.ts`'s
  `REASON_REQUIRED_ACTIONS` currently only contains `"reject"`) — right now a reviewer can request an
  update with no comment, leaving the new banner with nothing to show and the author no wiser than before.
  Not fixed yet since it changes transition validation, not just display, and no role's real-world
  preference has been confirmed either way.
