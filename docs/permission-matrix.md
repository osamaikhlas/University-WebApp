# Permission matrix

This is the human-readable view of the authorization model implemented in Phase 3
(authentication & authorization). The single source of truth is
`src/lib/auth/permissions.ts` — `prisma/seed.ts` seeds the `Role`/`Permission`/
`RolePermission` tables directly from that file, and every admin page enforces its own
requirement via `requirePermission()` (`src/lib/auth/guard.ts`), reading the *database*
copy of a signed-in user's roles/permissions on every request (CLAUDE.md rule 5 — never
trust a client-side check alone). If this document and `permissions.ts` ever disagree,
`permissions.ts` is authoritative; update this file to match.

## Roles

| Role | Summary |
|---|---|
| `SUPER_ADMIN` | Full system access across every module. |
| `PRINCIPAL` | Personally accountable for the college website (per the circular). Views and publishes/approves content across every domain, verifies compliance, oversees grievances. Does not author draft content. |
| `ADMINISTRATOR` | System/back-office administration: manages users, roles, permissions. Read-only oversight of all content domains. Shares grievance/compliance oversight with the Principal. |
| `EDITOR` | Authors/edits draft content in the general content domain. Cannot publish its own work. |
| `REVIEWER` | Reviews and publishes/rejects content submitted by Editors and domain officers, across every content domain. Does not author content. |
| `ADMISSION_OFFICER` | Authors/edits Admissions-domain content only. Cannot publish its own work. |
| `EXAMINATION_OFFICER` | Authors/edits Examinations-domain content only. Cannot publish its own work. |
| `FACULTY_EDITOR` | Authors/edits Faculty-domain content (faculty, staff, clubs) only. Cannot publish its own work. |

## Design principles

1. **Separation of duties.** No role holds both `:manage` (author) and `:publish` for the
   same content domain, except `SUPER_ADMIN`. This mirrors the "no self-approval" rule in
   `docs/architecture.md` §5 and CLAUDE.md rule 7 (no auto-approval by the same actor):
   authoring and publishing a piece of content always requires two different accounts.
2. **Domain scoping.** `ADMISSION_OFFICER` / `EXAMINATION_OFFICER` / `FACULTY_EDITOR` are
   each scoped to exactly one content domain; `EDITOR` owns the general/catch-all domain
   (Notices, Events, Programs, Gallery, Documents, Timetables, Academic Calendar, etc.).
   `REVIEWER` can publish across *every* domain, since review/approval is a generic
   function that doesn't need to be split per domain the way authoring does.
3. **Governance is separate from content.** Grievance (CLAUDE.md rule 6 — private by
   default) and Compliance (rule 7 — human approval only) access is limited to
   `PRINCIPAL` / `ADMINISTRATOR` / `SUPER_ADMIN` — the roles with institutional
   accountability — not to content authors or reviewers.
4. **System administration is separate from governance.** Only `ADMINISTRATOR` and
   `SUPER_ADMIN` manage users, roles, and permissions.

## Permission matrix

Permission keys are `<domain>:<action>`. ✅ = granted, — = not granted.

| Permission | SUPER_<br>ADMIN | PRINCIPAL | ADMINIS-<br>TRATOR | EDITOR | REVIEWER | ADMISSION_<br>OFFICER | EXAMINATION_<br>OFFICER | FACULTY_<br>EDITOR |
|---|---|---|---|---|---|---|---|---|
| `dashboard:view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `content_general:view` | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — |
| `content_general:manage` | ✅ | — | — | ✅ | — | — | — | — |
| `content_general:publish` | ✅ | ✅ | — | — | ✅ | — | — | — |
| `content_admissions:view` | ✅ | ✅ | ✅ | — | ✅ | ✅ | — | — |
| `content_admissions:manage` | ✅ | — | — | — | — | ✅ | — | — |
| `content_admissions:publish` | ✅ | ✅ | — | — | ✅ | — | — | — |
| `content_examinations:view` | ✅ | ✅ | ✅ | — | ✅ | — | ✅ | — |
| `content_examinations:manage` | ✅ | — | — | — | — | — | ✅ | — |
| `content_examinations:publish` | ✅ | ✅ | — | — | ✅ | — | — | — |
| `content_faculty:view` | ✅ | ✅ | ✅ | — | ✅ | — | — | ✅ |
| `content_faculty:manage` | ✅ | — | — | — | — | — | — | ✅ |
| `content_faculty:publish` | ✅ | ✅ | — | — | ✅ | — | — | — |
| `grievances:view` | ✅ | ✅ | ✅ | — | — | — | — | — |
| `grievances:manage` | ✅ | ✅ | ✅ | — | — | — | — | — |
| `compliance:view` | ✅ | ✅ | ✅ | — | — | — | — | — |
| `compliance:verify` | ✅ | ✅ | ✅ | — | — | — | — | — |
| `users:manage` | ✅ | — | ✅ | — | — | — | — | — |
| `roles:manage` | ✅ | — | ✅ | — | — | — | — | — |
| `permissions:manage` | ✅ | — | ✅ | — | — | — | — | — |
| `audit_logs:view` | ✅ | ✅ | ✅ | — | — | — | — | — |
| `approval_workflow:view` | ✅ | ✅ | ✅ | — | ✅ | — | — | — |

## Admin route → required permission

See `src/lib/auth/route-permissions.ts` (kept in sync with `ADMIN_NAV_LINKS` by
`tests/unit/auth/route-permissions.test.ts`).

| Route | Required permission |
|---|---|
| `/admin` | `dashboard:view` |
| `/admin/cms`, `/admin/notices`, `/admin/events`, `/admin/programs`, `/admin/timetables`, `/admin/academic-calendar`, `/admin/documents`, `/admin/gallery`, `/admin/scholarships`, `/admin/student-support` | `content_general:view` |
| `/admin/admissions` | `content_admissions:view` |
| `/admin/exams`, `/admin/results` | `content_examinations:view` |
| `/admin/faculty`, `/admin/staff` | `content_faculty:view` |
| `/admin/grievances` | `grievances:view` |
| `/admin/compliance` | `compliance:view` |
| `/admin/users` | `users:manage` |
| `/admin/roles` | `roles:manage` |
| `/admin/permissions` | `permissions:manage` |
| `/admin/audit-logs` | `audit_logs:view` |
| `/admin/approval-workflow` | `approval_workflow:view` |

## Enforcement points

- **`src/app/admin/layout.tsx`** — every `/admin/*` route calls `requireUser()`; no session
  means an immediate redirect to `/login`, before any page-specific code runs.
- **Each `src/app/admin/*/page.tsx`** — calls `requirePermission("<key>")` for its own
  route. An authenticated user missing the permission is redirected to
  `/admin/unauthorized`.
- **`src/components/layout/AdminSidebar.tsx`** — hides links the current user can't access.
  This is a UX convenience only; it is not the security boundary, since the pages
  themselves enforce access independently of what the sidebar renders.
- **Session data itself never carries roles/permissions.** The cookie holds only a random
  token; `getCurrentUser()` (`src/lib/auth/session.ts`) re-reads the user's roles and
  flattens their permissions from the database on every call.

## Test accounts (development only)

`prisma/seed.ts` seeds one `[DEV SEED]` login-capable account per role
(`<role-slug>@example.invalid`, e.g. `editor@example.invalid`), sharing one password
(`DevSeed!Passw0rd1` by default, overridable via `DEV_LOGIN_PASSWORD`). This block is
skipped entirely when `NODE_ENV=production`, so these credentials can never end up in a
production database. `tests/e2e/auth.spec.ts` logs in as each of these accounts to verify
role-specific access end-to-end.
