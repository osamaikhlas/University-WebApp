# Architecture

This describes the target production-grade architecture for the affiliated-college website and
administration system. **No code exists yet** — this is a design document. Requirement traceability lives
in `docs/compliance-matrix.md`; the data model backing this architecture lives in
`docs/database-design.md`.

## 0. Design assumptions (proposed, pending confirmation)

`progress.md` lists open questions that are not yet answered (specific college, stack, hosting, languages).
To make this architecture concrete rather than vague, it proposes defaults for the parts that are pure
engineering decisions, while leaving all *institutional* unknowns (content, roles' real-world names, etc.)
untouched:

- **Tenancy**: design as tenant-ready (every core table carries a `collegeId`) even if only one college is
  deployed initially. This costs little now and avoids a rewrite if the system is later reused across
  affiliated colleges. Whether it is actually operated as multi-tenant is a business decision, not a
  technical blocker.
- **Application shape**: a server-rendered/SEO-friendly public site + a separate authenticated admin
  application, both talking to one backend API, backed by one relational database. This is the conventional
  shape for a CMS-driven institutional site and satisfies the SEO (§14) and draft/publish (rule 4)
  requirements cleanly.
- **Data store**: a relational database (e.g. PostgreSQL) is assumed throughout `database-design.md`
  because the domain is highly relational (colleges → departments → programs → faculty, approval chains,
  audit trails) and needs transactional integrity for the approval/compliance workflow.
- These are recommendations to confirm with the user before scaffolding, not final commitments.

## 1. Public website

**Purpose**: serve the 20 circular-mandated content categories (see `docs/requirements.md` §2) to the
public, showing only published, human-verified content (rule 4).

- Server-rendered (or statically generated + revalidated) pages for SEO and fast first paint, one route
  per public section (Home, About, College Profile, History, Vision/Mission, Principal's Message,
  Departments, Programs, Faculty, Non-teaching Staff, Infrastructure, Admissions, Academic Calendar,
  Timetable, Examinations, Results, Notices, Events, Activities, Gallery, Scholarships, Student Support,
  Rules and Regulations, Affiliation, Grievance, Contact, Location, Downloads, Search).
- Reads exclusively through a **public read API** that filters to `status = published` at the query layer
  (not in application code paths that can be bypassed) — see §4/§5.
- Renders explicit "content not yet available" placeholders for sections without published content, rather
  than omitting the section or fabricating content (rule 13/14).
- Media/documents served via signed/public URLs from the document/media store (§7), never proxied through
  application logic unnecessarily.
- No authentication required for browsing; the Grievance form (§9) and Downloads/Search are the only
  interactive surfaces.

## 2. Admin CMS

**Purpose**: the authoring surface for all 20 content categories, used by delegated staff under the
Principal's accountability.

- Authenticated single-page application (or equivalent), organized around the Admin System module list in
  `CLAUDE.md` (Dashboard, CMS, Users, Roles, Permissions, Notices, Events, Faculty, Staff, Programs,
  Admissions, Timetables, Academic Calendar, Exams, Results, Documents, Gallery, Scholarships, Student
  Support, Grievances, Compliance, Audit logs, Approval workflow).
- Every content module follows the same lifecycle: **create/edit draft → submit for review → approve/reject
  → publish**, backed by `ContentItem`/module-specific tables + `ApprovalRequest` (see
  `database-design.md`).
- Every write goes through the backend API — the admin app holds no direct database access and no
  privileged logic that isn't re-checked server-side (rule 5).
- Placeholder/seed data is visibly flagged in the CMS UI (rule 14), e.g. a persistent badge on any record
  with `isPlaceholder = true`.

## 3. Authentication

- Centralized identity for all admin users (public users are anonymous; the Grievance form may optionally
  capture a submitter identity but does not require an account).
- Credentials: hashed with a strong adaptive algorithm (e.g. Argon2/bcrypt), never stored or logged in
  plaintext.
- Session/token-based auth (e.g. server-side sessions or short-lived JWTs + refresh tokens); all admin API
  routes require a valid, non-expired credential.
- Recommend mandatory MFA for high-privilege roles (Principal, Approver, Compliance Officer, Super Admin)
  given they can approve/publish official content.
- Account lockout/backoff on repeated failed logins; password reset via verified channel only.
- No secrets (DB credentials, signing keys, SMTP credentials, storage keys) committed to Git — sourced from
  environment/secret manager (rule 12).

## 4. RBAC (Role-Based Access Control)

- Roles are data (`Role`, `Permission`, `RolePermission` — see `database-design.md`), not hard-coded
  conditionals, so they can be adjusted per college without a deploy.
- Baseline role set (generic system roles, not specific people): **Super Admin**, **Principal**, **Content
  Editor**, **Approver**, **Compliance Officer**, **Grievance Officer**, **Auditor (read-only)**. Real
  assignment of people to roles is college data, not invented here.
- Every permission check happens **server-side**, at the API/service layer, on every request — the admin
  UI hiding a button is a UX convenience only, never the security boundary (rule 5). This is a dedicated,
  explicit test surface (`tests.json`: `adm-permissions`).
- Fine-grained permissions are scoped per module and per action (e.g. `faculty.create`, `faculty.publish`,
  `grievance.view`, `compliance.verify`) so the Approval workflow (§5) and Compliance verification (§10)
  can require specific roles rather than blanket "admin" access.

## 5. Approval workflow

- Implements the circular's "duly verified by the competent authority" requirement (rule 7) as a first-class
  workflow, not a status flag an editor can set themselves.
- Generic state machine reused by every content module: `draft → pending_review → approved (published) |
  rejected (back to draft)`.
- An `ApprovalRequest` record captures who requested review, who decided, when, and any comments —
  feeding directly into Audit logging (§6) and the Compliance dashboard (§10).
- **No self-approval**: the system enforces that the approver of a change cannot be the same account that
  authored it (configurable per role, e.g. Principal may be exempt if they are also the sole editor for a
  small college — a decision to confirm, not assumed here).
- Rejection requires a reason, surfaced back to the original editor as a Notification (§11).

## 6. Audit logging

- Every mutating action (create/update/delete/publish/approve/reject on any content, and all RBAC/user
  changes) writes an immutable `AuditLog` entry: actor, action, entity type/id, before/after snapshot,
  timestamp, and request metadata (e.g. IP) — rule 8.
- Audit logs are **append-only** at the application layer (no update/delete endpoints exposed for them) and
  ideally protected at the database layer too (e.g. no `UPDATE`/`DELETE` grants on the audit table for the
  application's normal role).
- Audit logs are readable by the Auditor role and relevant admins, but are never publicly exposed.
- Content history is additionally kept as full version snapshots (`ContentVersion`), not just diffs, so any
  past published version can be reconstructed for compliance review.

## 7. Document/media management

- Central store for all uploaded assets referenced by content modules: gallery photos, faculty photos,
  fee-structure/rules/affiliation PDFs, timetables, result notices, etc.
- Stored in object storage (not directly in the database), with the database holding metadata (`Document`,
  `MediaAsset`: filename, mime type, size, uploader, uploadedAt, version, `isPlaceholder`, association to
  its owning content record).
- Upload pipeline validates file type/size and scans for malware before making a file linkable from
  published content.
- Access control mirrors the owning content's status: an unpublished document's file is not publicly
  fetchable even if its URL is guessed (signed/expiring URLs or an authorization check on download,
  depending on final stack).
- Versioning: replacing a document (e.g. an updated fee structure) keeps prior versions retrievable for
  audit purposes rather than overwriting in place.

## 8. Search

- Public search covers only published content across all public modules (Notices, Events, Programs,
  Faculty, Downloads, etc.) — never draft/unapproved content (rule 4; dedicated test `pub-search`).
- Implementation starts with the relational database's native full-text search over indexed published
  content (sufficient at this scale and avoids an extra moving part); an external search engine (e.g.
  Elasticsearch/OpenSearch) is a later optimization if content volume or relevance needs grow, not a day-one
  requirement.
- Search results link back to canonical public pages; no separate content duplication beyond the search
  index itself.

## 9. Grievance system

- Implements circular item 19 (Official Contact/Grievance Mechanism).
- Public submission form (optionally anonymous, or with contact info if the submitter wants a response) —
  the college decides its own policy on anonymity; the system supports both.
- Submitted grievances are **never publicly listed or visible** (rule 6) — they land directly in the
  Grievances admin module, visible only to the Grievance Officer role (and escalation roles such as
  Principal) via RBAC (§4).
- Status lifecycle: `new → in_review → resolved → closed`, with internal-only notes (`GrievanceNote`)
  separate from any (optional) response sent back to the submitter.
- All access to grievance records is logged (§6), given their sensitivity.

## 10. Compliance dashboard

- Aggregates `ComplianceItem` status (see `docs/compliance-matrix.md` §3) against the 20 seeded
  `ComplianceRequirement` rows, showing per-item state: `not_started / in_progress / submitted_for_review /
  verified / rejected`.
- Surfaces launch-readiness at a glance (all 20 verified = ready) and flags stale content via the Content
  Review/Freshness module (§12).
- Verification of a `ComplianceItem` requires an explicit action by an authorized human role (Principal or
  Compliance Officer) — never automatically derived from "a record exists" (rule 7). Existence of content
  is necessary but not sufficient for `verified`.
- Supports generating a compliance report (status of all 20 items + the live site URL) for submission to
  the Office of the Inspector of Colleges, matching the circular's explicit reporting requirement.

## 11. Notifications

- In-app notifications (and optionally email) for: content submitted for review (→ Approver), approved/
  rejected (→ original editor), new grievance received (→ Grievance Officer), content past its review-due
  date (→ assigned reviewer/Compliance Officer), compliance item state changes (→ Principal/Compliance
  Officer).
- Notifications are a thin, decoupled layer (triggered by the same events that write `AuditLog` entries) so
  they never become the source of truth for state — the underlying `status` fields are.

## 12. Content review/freshness

- Directly implements the circular's "regularly updated" requirement.
- Each `ContentItem` (and key structured records like `Program`, `Faculty`, `Timetable`) carries a
  `reviewDueAt` date, set on publish based on a configurable review interval per content type (e.g. Notices
  reviewed weekly, Faculty/Programs reviewed each semester, Rules/Affiliation reviewed annually — exact
  cadences are a policy decision for the college to confirm, not invented here).
- Items past due surface on the Compliance Dashboard (§10) and generate a Notification (§11) to the
  assigned reviewer, but do **not** auto-unpublish content — staleness is flagged for human action, not
  silently acted on.

## 13. Accessibility

- Public site targets WCAG 2.1 AA as a baseline: semantic HTML, sufficient color contrast, keyboard
  navigability, alt text required on gallery/media uploads (enforced as a required field, not optional),
  accessible forms (Grievance, Search) with proper labels/error messaging.
- Admin CMS should also be reasonably accessible (keyboard operability, labeled form controls) since it is
  a daily-use tool for college staff, though the public site is the higher-priority target given its wider,
  less controllable audience.
- Accessibility checks are part of the Testing strategy (§15), not a one-time audit.

## 14. SEO

- Server-rendered/pre-rendered public pages (per §1) so content is crawlable without requiring JavaScript
  execution.
- Per-page metadata (title, description, canonical URL, Open Graph tags) driven by CMS fields on each
  `ContentItem`, not hard-coded per page.
- Structured data (schema.org `CollegeOrUniversity`/`EducationalOrganization`, `Event`, `NewsArticle` for
  notices where applicable) to improve search-engine understanding of institutional info.
- `sitemap.xml` and `robots.txt` generated from the set of currently published content, updated
  automatically as content is published/unpublished — never manually maintained lists that go stale.

## 15. Testing

- Every module in `tests.json` needs coverage before being considered done, per rule 9; failing or missing
  coverage is tracked honestly there (rule 10), never deleted to force green.
- Layers: unit tests (business logic, especially the approval/compliance state machines), integration tests
  (API authorization — every permission boundary in §4 gets an explicit "role X cannot do Y" test, not just
  "role X can do X"), and end-to-end/browser tests for critical user journeys (publish flow, grievance
  submission-and-confidentiality, public site never showing draft content) — satisfying rule 11's browser
  verification requirement.
- Security-sensitive behaviors (rule 4 draft/publish leakage, rule 6 grievance confidentiality, rule 5
  server-side authorization) are treated as required tests, not optional ones.

## 16. Deployment

- Containerized services (public site, admin app/API, background jobs if any) behind a reverse proxy with
  HTTPS enforced everywhere (no plaintext admin login).
- At least two environments: staging (for verifying content and approvals before go-live, and for
  reviewing UI changes) and production.
- CI pipeline runs lint + full test suite (§15) before any deploy; deploys are blocked on failing tests
  (rule 10 applies at the pipeline level too — no bypassing a red pipeline to ship).
- Configuration and secrets (§3, rule 12) injected via environment/secret manager, never committed.
- Zero/low-downtime deploy strategy so notices/admissions/exam updates aren't blocked by release timing.

## 17. Backups

- Automated, scheduled backups of the database (including audit logs, compliance state, and all content)
  and the document/media store.
- Defined retention policy and a periodically **tested restore procedure** — an untested backup is not a
  backup.
- Backups stored separately from the primary environment (different region/account where feasible) to
  survive a full environment loss.
- Given the compliance/audit requirements (§6, §10), backup integrity is itself a compliance-relevant
  concern: losing audit history would undermine the "duly verified" trail the circular effectively requires.

## Cross-references

- Requirement source: `docs/requirements.md`
- Requirement → module → data mapping: `docs/compliance-matrix.md`
- Entity definitions and relationships: `docs/database-design.md`
- Build sequencing: `docs/implementation-plan.md`
