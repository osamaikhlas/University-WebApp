# User & Operations Guide

How to run this application, what each user flow actually does, and a field-level reference for
every module. This is the "how do I actually use it" companion to the design docs
(`docs/architecture.md`, `docs/compliance-matrix.md`, `docs/database-design.md`,
`docs/permission-matrix.md`) — those explain *why* the system is shaped this way; this explains
*how to operate it*. Where this guide and the code disagree, the code is authoritative — see
`docs/permission-matrix.md`'s same rule for `src/lib/auth/permissions.ts`.

## Contents

1. [Running it locally](#1-running-it-locally)
2. [Roles at a glance](#2-roles-at-a-glance)
3. [User flows](#3-user-flows)
4. [Module reference](#4-module-reference)
5. [What's real vs. not yet built](#5-whats-real-vs-not-yet-built)
6. [Where to go deeper](#6-where-to-go-deeper)

---

## 1. Running it locally

### 1.1 Prerequisites

- Node.js + npm
- A local PostgreSQL server (16+; the project's own dev machine uses `brew install postgresql@16`
  — see `progress.md`'s Phase 2 entry)

### 1.2 Install & configure

```bash
npm install                      # also runs `prisma generate` via postinstall
cp .env.example .env
```

Fill in `.env`:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | `postgresql://postgres:postgres@localhost:5432/university_portal?schema=public` for local dev |
| `NODE_ENV` | Yes | `development` locally. **Production disables the 8 `[DEV SEED]` test-role accounts automatically** when this is `production`. |
| `NEXT_PUBLIC_SITE_NAME` | No | Defaults to `[PLACEHOLDER] Affiliated College Portal` until real branding is supplied |
| `NEXT_PUBLIC_SITE_URL` | No | Defaults to `http://localhost:3000`; set this for real before going live — it feeds `sitemap.xml`, `robots.txt`, and canonical/Open Graph tags |
| `GRIEVANCE_ENCRYPTION_KEY` | For grievances | 64 hex chars (32 bytes). Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Without it, the public grievance form fails at submit time. Never rotate it in place — old submissions become undecryptable. |
| `DEV_LOGIN_PASSWORD` | No | Overrides the shared password for the 8 dev test accounts (default `DevSeed!Passw0rd1`). Never used in production regardless. |

### 1.3 Database

```bash
npm run db:migrate     # applies prisma/migrations/* to your local DB (prisma migrate dev)
npm run db:seed        # seeds roles/permissions, one placeholder college, demo content, the
                        # 20 ComplianceRequirement rows, and (non-production only) 9 login accounts
```

Re-running `db:seed` is safe — every row is an idempotent `upsert`.

### 1.4 Run it

```bash
npm run dev             # http://localhost:3000, Turbopack
```

- Public site: `http://localhost:3000/`
- Admin login: `http://localhost:3000/login`
- Health check: `http://localhost:3000/api/health` (`ok`/`degraded` based on a live DB ping)

**Dev login accounts** (never present when `NODE_ENV=production`) — one per role, all sharing the
same password:

| Email | Role |
|---|---|
| `super-admin@example.invalid` | `SUPER_ADMIN` — full access |
| `principal@example.invalid` | `PRINCIPAL` |
| `administrator@example.invalid` | `ADMINISTRATOR` |
| `editor@example.invalid` | `EDITOR` |
| `reviewer@example.invalid` | `REVIEWER` |
| `admission-officer@example.invalid` | `ADMISSION_OFFICER` |
| `examination-officer@example.invalid` | `EXAMINATION_OFFICER` |
| `faculty-editor@example.invalid` | `FACULTY_EDITOR` |

Password: `DevSeed!Passw0rd1` (or your `DEV_LOGIN_PASSWORD` override).

### 1.5 Tests, lint, build

```bash
npm run typecheck       # tsc --noEmit
npm run lint             # eslint .
npm test                 # vitest run — unit/component tests
npm run test:e2e         # playwright test — needs `npx playwright install` once, and the dev
                          # server + a seeded database running (playwright.config.ts reuses an
                          # already-running `npm run dev` if one exists)
npm run build             # next build — production bundle
npm run start              # serve the production build
```

Run a single test file: `npx vitest run <path>` or `npx playwright test <path>`.

### 1.6 Database maintenance commands

```bash
npm run db:generate         # regenerate the Prisma Client after a schema change
npm run db:migrate           # prisma migrate dev — create + apply a new migration locally
npm run db:migrate:deploy     # prisma migrate deploy — apply existing migrations, no new ones (CI/prod)
```

Never hand-edit a generated migration or the database schema directly — always go through
`prisma migrate dev`, per `docs/database-design.md`'s migrate-don't-hand-edit convention.

---

## 2. Roles at a glance

Full matrix: `docs/permission-matrix.md`. The short version:

| Role | Can author (`:manage`) | Can publish/approve (`:publish`) | Governance access |
|---|---|---|---|
| `SUPER_ADMIN` | Everything | Everything | Everything |
| `PRINCIPAL` | Nothing (never authors drafts) | Everything | Grievances, Compliance |
| `ADMINISTRATOR` | Nothing | Nothing (view-only on content) | Users, Roles, Permissions, Grievances, Compliance, Audit logs |
| `EDITOR` | General content domain | — | — |
| `REVIEWER` | — | Everything (every domain) | Approval-workflow view |
| `ADMISSION_OFFICER` | Admissions domain only | — | — |
| `EXAMINATION_OFFICER` | Examinations domain only | — | — |
| `FACULTY_EDITOR` | Faculty domain only | — | — |

The rule that shapes everything: **no role except `SUPER_ADMIN` holds both `:manage` and
`:publish` for the same content domain.** Whoever writes a draft can never be the one who
publishes it — that's what makes self-approval structurally impossible rather than merely
discouraged (`docs/permission-matrix.md` "Design principles" §1).

The four content **domains** — general, admissions, examinations, faculty — are what determine
which of the 28 CMS modules an `EDITOR`/`ADMISSION_OFFICER`/`EXAMINATION_OFFICER`/`FACULTY_EDITOR`
can touch. See §4 for which module is in which domain.

---

## 3. User flows

### 3.1 Signing in

1. Go to `/login`, enter email + password.
2. On success you land on `/admin` (the Dashboard). The sidebar (`AdminSidebar`) only shows links
   you have permission for — but that's a convenience, not the security boundary: every
   `/admin/*` page independently calls `requirePermission()` server-side, so navigating to a URL
   you can't use redirects to `/admin/unauthorized` regardless of what the sidebar showed.
3. Sessions last **8 hours**, server-side (a random token in an httpOnly cookie; the actual
   session record — and your roles/permissions — are re-read from the database on every request,
   never trusted from the cookie itself).
4. **5 wrong passwords locks the account for 15 minutes** (`src/lib/auth/lockout.ts`). There's
   also a per-IP login rate limit independent of the per-account lockout, closing a
   credential-stuffing gap the lockout alone doesn't cover. Failed/locked attempts don't reveal
   whether the email exists — the error is always "invalid email or password."
5. Every login, failed login, and logout writes an `AuditLog` row.

### 3.2 Authoring and publishing content (the core flow, shared by all 28 CMS modules)

This is one shared state machine (`src/lib/content-workflow.ts`) reused by every content module —
learn it once, it works identically everywhere from Notices to Faculty to Timetables.

```
DRAFT --submit_for_review--> SUBMITTED --start_review--> UNDER_REVIEW
  UNDER_REVIEW --approve--> APPROVED --publish--> PUBLISHED
  UNDER_REVIEW --reject--> DRAFT                    (reason required)
PUBLISHED --unpublish--> APPROVED                    (take down without flagging for rework)
PUBLISHED --request_update--> UPDATE_REQUIRED --return_to_draft--> DRAFT
any non-archived status --archive--> ARCHIVED --unarchive--> DRAFT
```

Only `PUBLISHED` records ever appear on the public site — every public query filters on
`status: "PUBLISHED"` (`src/lib/content.ts`), and reaching `PUBLISHED` always means the record
passed through `APPROVED` first.

**Typical path, e.g. an `EDITOR` publishing a Notice, with a `REVIEWER` publishing:**

1. `EDITOR` signs in, goes to `/admin/notices`, clicks **New**, fills the form, saves — record is
   created as `DRAFT`.
2. `EDITOR` opens the record and clicks **Submit for review** → status becomes `SUBMITTED`.
   (`submit_for_review` needs only the `:manage` permission — the author can do this themselves.)
3. A `REVIEWER` (or `PRINCIPAL`) opens the record, clicks **Start review** → `UNDER_REVIEW`, reads
   it, then either:
   - **Approve** → `APPROVED`, then **Publish** → `PUBLISHED` (now live on the public site), or
   - **Reject** (comment required) → back to `DRAFT`, with the reason visible to the original editor.
4. Every transition writes an `AuditLog` entry (actor, action, before/after status, timestamp,
   optional comment) — visible at `/admin/audit-logs`.

**Available action buttons on any record are computed live** from its current status and your own
permissions (`WorkflowActions` component) — you only ever see buttons for transitions that are
both legal from the current state *and* something your role is allowed to do. That's a UX
convenience; the Server Action behind each button re-validates both independently, so a stale page
or a tampered request can't skip a step.

**Taking something down / asking for a fix after publish:**

- **Unpublish** (`PUBLISHED → APPROVED`): pulls it off the public site immediately, no re-review
  needed to put it back — use this for "take this down right now, but it's still fine as-is."
- **Request update** (`PUBLISHED → UPDATE_REQUIRED`): also pulls it off the public site immediately
  (public queries only ever select `status: "PUBLISHED"`, and `UPDATE_REQUIRED` isn't that) — the
  difference from Unpublish is that it flags the record as needing a fix, not just a clean
  takedown. The assigned editor **Return to draft**s it to actually edit it, and the whole
  submit→review→publish cycle repeats.
- **Archive**: reachable from any non-archived status, pulls it from active management entirely.
  **Unarchive** puts it back as a fresh `DRAFT`.

### 3.3 Uploading and publishing a Document or Gallery photo

Documents and Gallery are the two modules with real file upload (not paste-a-URL):

- **Documents** (`/admin/documents`): upload a file, it's stored outside `public/` (local disk,
  `storage/uploads/`, at least for now — see `progress.md`'s 2026-09-16 open-questions resolution
  on file storage) and only ever served through a permission-checked route
  (`/api/files/documents/[id]`) that's public exactly when the record is `PUBLISHED` **and**
  currently inside its `publishDate`/`expiryDate` window (a document can be `PUBLISHED` status yet
  not currently downloadable if it hasn't hit its `publishDate` yet, or has passed its
  `expiryDate`). Replacing a file keeps the old version retrievable (`version` increments) rather
  than silently overwriting.
- **Gallery** (`/admin/gallery`): create a `GalleryAlbum`, then add `GalleryItem`s, each wrapping
  an uploaded `Media` asset with its own caption/order/publish state. A photo's public visibility
  is governed entirely by whether *any* `PUBLISHED` `GalleryItem` currently wraps it — `Media`
  itself carries no status of its own.
- Every upload is magic-byte-verified (not just trusted by file extension/MIME header) before it's
  accepted.
- `Media.altText` is a required field, not optional — enforced for accessibility regardless of
  which module the image is attached to.

### 3.4 Verifying compliance (the 20 circular requirements)

Separate state machine (`src/lib/compliance-workflow.ts`) from content — a compliance item tracks
whether a *circular requirement* is satisfied, which is a judgment call about real content, not a
publish action in itself.

```
NOT_STARTED <-> IN_PROGRESS                        (automatic, from live completeness — see below)
IN_PROGRESS/NEEDS_UPDATE --submit_for_review--> READY_FOR_REVIEW
READY_FOR_REVIEW --verify--> VERIFIED
READY_FOR_REVIEW/VERIFIED --request_update--> NEEDS_UPDATE     (reason required)
NOT_STARTED/IN_PROGRESS --mark_not_applicable--> NOT_APPLICABLE (reason required)
NOT_APPLICABLE --reopen--> NOT_STARTED
```

1. Go to `/admin/compliance` (`compliance:view` — `PRINCIPAL`/`ADMINISTRATOR`/`SUPER_ADMIN`). Each
   of the 20 requirements shows its circular item number/title/description, owning module,
   **completeness computed live** against real database content (not a checkbox someone ticks),
   status, last updated/verified, verifier, evidence, and reviewer notes.
2. Whoever owns the requirement clicks **Submit for review** once the underlying content is in
   good shape (`IN_PROGRESS → READY_FOR_REVIEW`).
3. An authorized reviewer (`compliance:verify`) reviews the actual linked content — not just the
   dashboard — and either:
   - **Verify** → `VERIFIED`, recorded as a `ComplianceVerification` row (who, when, optional
     note) — this is the "duly verified by the competent authority" state the circular requires.
     **A requirement can never reach `VERIFIED` any other way** — never automatically, never as a
     side effect of content existing (CLAUDE.md rule 7).
   - **Request update** (reason required) → `NEEDS_UPDATE`, sent back with a note.
4. A requirement that genuinely doesn't apply to this college can be marked **Not applicable**
   (reason required) rather than left perpetually incomplete; **Reopen** brings it back if that
   changes.
5. **Submitting the compliance report**: at `/admin/compliance/reports`, generate a report
   snapshot once the college's status is where it wants it (not necessarily all 20 `VERIFIED` —
   partial-progress reports are allowed), then separately record its submission to the Office of
   the Inspector of Colleges. The snapshot freezes every requirement's status at that moment —
   later status changes never rewrite what was actually submitted — and
   `submittedAt`/`submittedById` is a one-way flag, never re-settable once set.

### 3.5 Handling a public grievance

Grievances are private by default and never shown publicly at any point.

**Public side** (`/grievance`, no login required): name, email (required), phone (optional),
category (`Academic`/`Administrative`/`Faculty`/`Facilities`/`Harassment`/`Financial`/`Other`),
subject, description, optional attachment. On success the submitter gets a non-guessable
**reference number** — that's the only confirmation shown; nothing is ever listed back publicly.
The form is rate-limited and honeypot-protected. Email/phone are AES-256-GCM encrypted before
they ever reach the database (`GRIEVANCE_ENCRYPTION_KEY`).

**Admin side** (`/admin/grievances`, `grievances:view`/`:manage` — `PRINCIPAL`/`ADMINISTRATOR`/
`SUPER_ADMIN` only): its own state machine (`src/lib/grievance-workflow.ts`), deliberately
separate from the content and compliance engines:

```
NEW/ASSIGNED --start_review--> UNDER_REVIEW
UNDER_REVIEW --request_action--> ACTION_REQUIRED          (reason required)
ACTION_REQUIRED --resume_review--> UNDER_REVIEW
UNDER_REVIEW/ACTION_REQUIRED --resolve--> RESOLVED         (resolution summary required)
RESOLVED --close--> CLOSED
any non-terminal status --close--> CLOSED                  (administrative close, e.g. duplicate)
RESOLVED/CLOSED --reopen--> UNDER_REVIEW                    (reason required)
```

1. A new submission lands as `NEW`. Assign it to a staff member (`assignGrievance`, a separate
   action from the status transitions above) — this alone moves it toward `ASSIGNED`.
2. **Start review** → `UNDER_REVIEW`. Add internal-only case notes as you work (never shown to the
   submitter). If you need the submitter to do something first, **Request action** (reason
   required); **Resume review** once they have.
3. **Resolve** (resolution summary required) once it's handled, optionally recording a response
   sent back to the submitter. **Close** when there's nothing further to do (including an
   administrative close for duplicates/invalid submissions, from almost any status). **Reopen**
   (reason required) if a resolved/closed case needs to come back.
4. Every view of encrypted contact details and every status change is audit-logged, given the
   data's sensitivity.

### 3.6 Managing users and their roles

`/admin/users` (`users:manage` — `ADMINISTRATOR`/`SUPER_ADMIN`): list users, view a user's current
roles, **assign or revoke a role** — this is the one real "permission change" the current data
model supports, and it's fully audited (who changed whose roles, when). Creating brand-new user
accounts and editing profile fields beyond roles isn't part of this page yet — see §5.

### 3.7 Keeping content fresh (review/freshness tracking)

Five modules track staleness explicitly: **Notices, Faculty, Academic Calendar, Timetables,
Admissions** (each has its own `lastReviewedAt`/`lastReviewedById` columns). On each record's admin
page you'll see last updated, last reviewed (and by whom), and a computed next-review-due date —
click **Mark reviewed** to reset the clock without necessarily changing the content itself.

- Review cadence per module is configurable at `/admin/content-review-settings` (`periodDays` per
  module key; a module with no explicit override uses the system default).
- Overdue items surface on the Dashboard (`/admin`) under content review warnings — this **flags**
  staleness for a human to act on; nothing is ever auto-unpublished for going stale.

### 3.8 Reviewing audit history

`/admin/audit-logs` (`audit_logs:view` — `PRINCIPAL`/`ADMINISTRATOR`/`SUPER_ADMIN`): read-only,
filterable/paginated view over every mutating action in the system — content transitions,
compliance decisions, grievance status changes and notes, document replacements, role
assignments, logins/logouts/failed logins. Each entry shows the actor, action, entity, a
before/after snapshot where applicable, an optional comment, and a timestamp.

This table is **append-only at every layer** — no edit/delete Server Action exists, and a
Postgres trigger rejects any `UPDATE`/`DELETE` on the table outright even if some future code
tried.

### 3.9 Browsing and searching the public site

No login. `/search` is a real global search (works without JS — it's a plain GET form) across 8
categories: **pages, notices, events, programs, faculty, documents, policies, regulations** —
always published-content-only, relevance-ranked, paginated, with category filtering. Every other
public route (`/about`, `/academics`, `/admissions`, `/faculty`, `/staff`, `/campus`, `/notices`,
`/events`, `/gallery`, `/examinations`, `/results`, `/scholarships`, `/student-support`, `/rules`,
`/affiliation`, `/grievance`, `/contact`, `/downloads`) renders a real "content not yet available"
empty state rather than fabricating anything when a section has no published content yet.

---

## 4. Module reference

Every module follows §3.2's shared workflow unless noted. "Domain" is the permission domain from
`src/lib/admin/module-permissions.ts` — see §2 for who can `:manage` vs `:publish` each domain.

### General content domain (`content_general`) — `EDITOR` authors, `REVIEWER`/`PRINCIPAL` publish

| Module | Route | Key fields | Feeds public page |
|---|---|---|---|
| College Profile | `/admin/college-profile` | overview, mission/vision statements, history, principal name/message, established year — **singleton**, one row per college | `/about` |
| Departments | `/admin/departments` | name, description | `/academics` |
| Programs | `/admin/programs` | name, level (`UNDERGRADUATE`/`GRADUATE`/`DIPLOMA`/`CERTIFICATE`), duration (years), description, department | `/academics` |
| Notices | `/admin/notices` | title, body, category, publish/expiry dates — **review-tracked** | `/notices`, homepage banner |
| Events | `/admin/events` | title, description, start/end date, location | `/events` |
| Seminars | `/admin/seminars` | title, speaker, start/end date, venue, department (optional) | `/events` (day-to-day activities) |
| Workshops | `/admin/workshops` | title, facilitator, start/end date, venue, department (optional) | `/events` (day-to-day activities) |
| Academic Calendar | `/admin/academic-calendar` | title, description, start/end date, category, academic year — **review-tracked** | `/academics` |
| Timetables | `/admin/timetables` | class group, effective-from date, structured schedule (JSON), program — **review-tracked** | `/academics` |
| Documents | `/admin/documents` | title, description, category, uploaded file, publish/expiry window — real file upload (§3.3) | `/downloads` |
| Infrastructure | `/admin/infrastructure` | category (`CLASSROOM`/`LAB`/`LIBRARY`/`COMPUTER_LAB`/`MOOT_COURT`/`OFFICE`/`SPORTS`/`OTHER`), name, description | `/campus` |
| Activities | `/admin/activities` | title, description, category | `/events` (co-curricular) |
| Gallery | `/admin/gallery` | albums + items, captions, ordering — real file upload (§3.3) | `/gallery` |
| Scholarships | `/admin/scholarships` | name, description, eligibility | `/scholarships` |
| Student Support | `/admin/student-support` | name, description, contact info | `/student-support` |
| Policies | `/admin/policies` | title, category, body | `/rules` |
| Regulations | `/admin/regulations` | title, body | `/rules` |
| Affiliation | `/admin/affiliation` | affiliating university, affiliation number, regulatory body, validity dates, linked program (optional) | `/affiliation` |
| Contact | `/admin/contact` | type (`PHONE`/`EMAIL`/`OTHER`), label, value | `/contact` |
| Location | `/admin/location` | address, latitude/longitude, map embed URL | `/contact` (Location section) |

### Admissions domain (`content_admissions`) — `ADMISSION_OFFICER` authors, `REVIEWER`/`PRINCIPAL` publish

| Module | Route | Key fields | Feeds public page |
|---|---|---|---|
| Admissions | `/admin/admissions` | academic year, eligibility criteria, application start/end dates, program — **review-tracked** | `/admissions` |
| Fee Structures | `/admin/fee-structures` | fee type, amount, currency (defaults `PKR`), academic year, program, linked admission cycle (optional) | `/admissions` |
| Enrollment Statistics | `/admin/enrollment-statistics` | academic year, session type, total/male/female enrolled, program | `/admissions` (stats) |

### Examinations domain (`content_examinations`) — `EXAMINATION_OFFICER` authors, `REVIEWER`/`PRINCIPAL` publish

| Module | Route | Key fields | Feeds public page |
|---|---|---|---|
| Exams | `/admin/exams` | exam type, academic year, schedule start/end date, linked notice, program | `/examinations` |
| Results | `/admin/results` | publish date, external link — **also needs `isPublic: true` independently of `status`, both flags must allow it** | `/results` |

### Faculty domain (`content_faculty`) — `FACULTY_EDITOR` authors, `REVIEWER`/`PRINCIPAL` publish

| Module | Route | Key fields | Feeds public page |
|---|---|---|---|
| Faculty | `/admin/faculty` | name, designation, qualifications, subjects taught (comma-separated), email, phone, department — **review-tracked** | `/faculty` |
| Staff | `/admin/staff` | name, designation, department (free text) | `/staff` |
| Clubs | `/admin/clubs` | name, description, faculty advisor (optional link to a Faculty record) | `/events` (co-curricular) |

### Governance (not tied to a content domain)

| Module | Route | Who | What it does |
|---|---|---|---|
| Dashboard | `/admin` | everyone (`dashboard:view`) | Content status totals, compliance %, requirements needing attention, recent notices/events, content overdue for review, document expiry warnings, recent audit activity — every number a live, role-scoped query |
| Grievances | `/admin/grievances` | `PRINCIPAL`/`ADMINISTRATOR`/`SUPER_ADMIN` | §3.5 |
| Compliance | `/admin/compliance` | `PRINCIPAL`/`ADMINISTRATOR`/`SUPER_ADMIN` | §3.4 |
| Users | `/admin/users` | `ADMINISTRATOR`/`SUPER_ADMIN` | §3.6 |
| Content Review Settings | `/admin/content-review-settings` | (same as Compliance/Users tier) | §3.7 — per-module review period in days |
| Audit logs | `/admin/audit-logs` | `PRINCIPAL`/`ADMINISTRATOR`/`SUPER_ADMIN` | §3.8, read-only |

---

## 5. What's real vs. not yet built

Everything in §4 is real, working admin UI backed by the live database and the permission system
— not placeholders. Three admin routes still render `PagePlaceholder` and have no real
functionality behind them yet:

| Route | Currently | What you can do instead |
|---|---|---|
| `/admin/roles` | Placeholder | Role/permission grants are edited in code — `src/lib/auth/permissions.ts` (`ROLE_PERMISSIONS`) — and applied to the database by re-running `npm run db:seed`, which wholesale-replaces every role's grants from that file. |
| `/admin/permissions` | Placeholder | Same as above — `permissions.ts` is the single source of truth; there's no separate permissions-list UI yet. |
| `/admin/approval-workflow` | Placeholder | There's no single cross-module "everything pending my review" queue yet — check each module's own list page and filter by status (`?status=SUBMITTED` / `?status=UNDER_REVIEW`) instead. |
| `/admin/cms` | Placeholder ("hub" page, description-only) | Go directly to the specific module in the sidebar (Notices, Programs, Faculty, etc.) — there's no unified cross-module content list yet. |

Two more gaps worth knowing about:

- **`Course`** exists as a full Prisma model (code, title, credit hours, semester, linked to a
  Program) but has **no admin UI at all** yet — not even a placeholder route. Course-level detail
  currently has to live in a Program's own description field, if needed.
- **Creating brand-new user accounts** isn't in `/admin/users` yet — only assigning/revoking roles
  on existing accounts is. New accounts currently have to be created directly (e.g. via a seed
  script or a database insert with a properly hashed password), not through the admin UI.

---

## 6. Where to go deeper

- **Full permission matrix, route→permission table, enforcement points**: `docs/permission-matrix.md`
- **Circular requirement → module → data-entity traceability**: `docs/compliance-matrix.md`
- **Entity relationships, tenancy/audit conventions**: `docs/database-design.md`
- **Target architecture (some sections describe the aspirational design; this guide and the code
  itself are authoritative for what's actually built today)**: `docs/architecture.md`
- **Public-site visual design system**: `docs/public-design-system.md`
- **Build history, phase-by-phase decisions, known gaps**: `progress.md`
- **Test coverage tracker**: `tests.json`
- **What content the college needs to supply before launch**: the College Content Register
  checklist (shared separately — ask whoever is coordinating with the college for the link)
