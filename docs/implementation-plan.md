# Implementation Plan

Phased build sequencing for the architecture in `docs/architecture.md` and the schema in
`docs/database-design.md`. **No code has been written yet** — this is planning only, per the current
instruction to design without implementing. Each phase lists goals, key deliverables, exit criteria, and
which `tests.json` entries it should turn from `not_started` toward `passing`.

Sequencing rationale: authorization, RBAC, and audit logging come before any content module, because every
later module depends on them for correctness (rules 5, 8) and because retrofitting security into existing
content modules is riskier than building on top of it. Public-facing surfaces are built module-by-module in
parallel with their admin counterpart, since a content type is only meaningful once it can be authored,
approved, and displayed end-to-end.

## Phase 0 — Decisions & discovery (blocking)

**Goal**: resolve the open questions in `progress.md` that materially change the architecture.

- Confirm: single college vs. multi-tenant template.
- Confirm technology stack (frontend, backend, database, hosting) — `docs/architecture.md` §0 proposes
  defaults; needs sign-off, not silent adoption.
- Confirm required languages (English/Urdu/Sindhi) — affects content schema (§2 in
  `docs/database-design.md`: fields may need per-locale variants) and is far cheaper to decide before the
  schema is built than after.
- Confirm real admin role names/responsibilities for the actual college (the roles in
  `docs/database-design.md` §1 are generic placeholders).
- Begin gathering real content for high-priority sections (College Profile, Programs, Faculty, Contact,
  Location, Affiliation) so Phase 3+ isn't blocked on data.

**Exit criteria**: stack chosen and confirmed; tenancy model confirmed; at least a partial real dataset
available for priority sections (or explicit sign-off to proceed with placeholders).

## Phase 1 — Foundation: auth, RBAC, audit

**Goal**: the security and traceability substrate everything else builds on.

- Project scaffolding for the chosen stack; CI pipeline skeleton (lint + test gate, per
  `docs/architecture.md` §16).
- `User`, `Role`, `Permission`, `RolePermission`, `UserRole`, `College` tables; authentication (login,
  session/token issuance, password hashing, optional MFA scaffolding).
- Server-side permission-check middleware/decorator used by every subsequent API route.
- `AuditLog` table + a write-path helper used by every subsequent mutation.
- Seed the baseline role set from `docs/database-design.md` §1 (as system defaults, not invented college
  data).

**Tests to advance**: `adm-users`, `adm-roles`, `adm-permissions`, `adm-audit-logs` (from `not_started` to
at least `in_progress`/`passing` for the core paths — login works, unauthorized access is rejected
server-side, every mutation produces an audit row).

**Exit criteria**: an authenticated admin can log in; an unauthorized request is rejected server-side even
if the client is tampered with; every write produces an audit entry.

## Phase 2 — Generic content lifecycle & approval workflow

**Goal**: the shared draft → review → approve → publish machinery (`docs/architecture.md` §5,
`docs/database-design.md` §2, §5), built once before any specific content module uses it.

- `ContentItem` / `ContentVersion` generic tables and CRUD.
- `ApprovalRequest` table + state machine (draft → pending_review → approved/rejected).
- Notification triggers (§11) wired to approval state changes (even if the Notifications module itself is
  fully built later, the trigger points belong here).
- `ContentReviewSchedule` / freshness fields (§12) added to the generic model now so every module inherits
  them.

**Tests to advance**: `adm-cms` (draft/publish separation enforced), a cross-cutting authorization test that
no unpublished `ContentItem` is servable via any public-read path (this underpins `pub-*` tests later).

**Exit criteria**: a generic content item can be drafted, submitted, approved by a *different* user, and
becomes visible only to a stub "public read" query after approval — proving the lifecycle before it's
multiplied across 20 modules.

## Phase 3 — Core structured content modules (public + admin, paired)

**Goal**: build the circular's 20 requirements module by module, each as admin CRUD + public display,
reusing Phase 2's lifecycle.

Suggested internal order (highest compliance value / most interdependent first):

1. College Profile, History, Vision/Mission, Principal's Message (circular item 1) — simplest, proves the
   public site shell.
2. Departments, Programs, Affiliation (items 6, 13) — many other modules reference `Program`.
3. Faculty, Staff (items 4, 5).
4. Infrastructure (item 3).
5. Notices, Events, Activities (items 2, 14, 15).
6. Admissions, EnrollmentStat (items 8, 9).
7. Academic Calendar, Timetable (item 7).
8. Examinations, Results (item 10).
9. Contact, Location (items 11, 12).
10. Gallery/MediaAsset (item 16).
11. Scholarships, StudentSupportService (item 17).
12. RuleRegulation/Documents (item 18).
13. Custom/"item 20" generic pages.

Each module ships with: admin CRUD screens, the shared approval flow, a public page/section, and a
`ComplianceItem` linkage (see Phase 5) — not necessarily all four in one PR, but all four before the module
is considered "done" for `tests.json` purposes.

**Tests to advance**: the corresponding `pub-*` and `adm-*` entries in `tests.json`, one module at a time,
honestly reflecting partial progress (`in_progress`) rather than marking a module `passing` before its
public+admin+approval path is actually covered.

**Exit criteria per module**: content authored in admin → approved by a second role → visible on the public
site; unapproved content is verifiably absent from public views (automated test, not manual check only).

## Phase 4 — Document/media management & Search

**Goal**: the shared infrastructure most content modules depend on for attachments/photos, plus the public
search surface.

- `Document`/`MediaAsset` storage pipeline (upload, validation, malware scan, versioning) —
  `docs/architecture.md` §7.
- Retrofit prior modules' attachment/photo fields onto this pipeline if they were stubbed earlier.
- Database full-text search across published content — `docs/architecture.md` §8.
- Public Search and Downloads pages.

**Tests to advance**: `pub-downloads`, `pub-search`, `pub-gallery`, `adm-documents`, `adm-gallery`.

**Exit criteria**: uploaded files are inaccessible while their owning content is unpublished; search never
returns draft content.

## Phase 5 — Grievance system & Compliance dashboard

**Goal**: the two modules with the highest confidentiality/governance stakes (rules 6, 7).

- `Grievance`/`GrievanceNote` tables, public submission form, admin-only case view restricted by RBAC.
- `ComplianceRequirement` seeded from `docs/compliance-matrix.md` (20 content rows + governance rows).
- `ComplianceItem` tracking wired to the evidence already produced in Phase 3 (each module's records become
  `evidenceRefs`).
- Compliance Dashboard UI: per-item status, launch-readiness view, stale-content flags (from Phase 2's
  `ContentReviewSchedule`).
- `ComplianceReportExport` generation (status snapshot + site URL) for submission to the Inspector of
  Colleges.

**Tests to advance**: `pub-grievance`, `adm-grievances`, `adm-compliance`, `adm-approval-workflow` (full
verification path, not just the generic Phase 2 mechanics).

**Exit criteria**: a submitted grievance is provably unreachable via any public/unauthenticated route; a
`ComplianceItem` can only reach `verified` via an explicit action by a `compliance.verify`-permitted user,
never automatically.

## Phase 6 — Notifications (full), Accessibility, SEO polish

**Goal**: cross-cutting quality passes that touch every module already built rather than introducing new
domain entities.

- Full Notification delivery (in-app, optionally email) for all trigger points identified in earlier
  phases.
- Accessibility pass: WCAG 2.1 AA audit across public pages and forms (Grievance, Search), alt-text
  enforcement on `MediaAsset` (already required at the schema level — verify it's enforced in the UI too).
- SEO pass: per-page metadata fields surfaced in the CMS, structured data, sitemap/robots generation from
  published content.

**Tests to advance**: general regression coverage; accessibility/SEO are typically verified via automated
checks (e.g. axe-core style checks, sitemap validity) layered onto existing pages rather than new
`tests.json` rows unless the user wants them tracked separately.

## Phase 7 — Hardening, deployment, backups

**Goal**: production readiness.

- Full CI gate (lint + complete test suite) blocking deploys, per `docs/architecture.md` §16.
- Staging + production environments; secrets via environment/secret manager (rule 12 verified — a
  dedicated check that no secret is committed).
- Automated backups (database + media store) with a **tested restore drill** — `docs/architecture.md` §17.
- Security review pass across §3–§9 of `docs/architecture.md` (auth, RBAC, approval, audit, documents,
  search, grievance) before go-live.

**Exit criteria**: a restore drill succeeds from backup alone; CI blocks a deploy on a failing/red test;
the compliance dashboard shows all 20 items `verified` for the live site.

## Phase 8 — Launch & compliance submission

**Goal**: satisfy the circular's actual deadline and reporting obligation.

- Final content review across all 20 items with the Principal/Compliance Officer.
- Generate the `ComplianceReportExport`, record the live URL, submit to the Office of the Inspector of
  Colleges, and record `submittedAt`.
- Update `progress.md` to reflect launch status.

## Ongoing, every phase

- Keep `tests.json` statuses honest (rule 10) — mark exactly what's covered, not what's merely built.
- Keep `progress.md` updated after each phase (rule 15).
- Never let placeholder data (rule 13/14) leak into a phase's "done" definition — a module isn't complete
  while it's still showing fabricated-looking placeholder content that could be mistaken for verified fact;
  clearly marked placeholders are fine to ship, unmarked ones are not.

## Cross-references

- Requirements: `docs/requirements.md`
- Requirement-to-module mapping: `docs/compliance-matrix.md`
- Architecture detail per subsystem: `docs/architecture.md`
- Schema detail per table: `docs/database-design.md`
