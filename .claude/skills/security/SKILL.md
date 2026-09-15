---
name: security
description: Use for any change touching authentication, session handling, authorization/permission checks, file uploads, rate limiting, grievance confidentiality, or route guards — enforces that server-side authorization is the only real security boundary in this app.
---

# Security skill

## Purpose

CLAUDE.md rule 5 is non-negotiable: **server-side authorization is mandatory, and client-side
checks (hidden nav links, disabled buttons) are never a substitute.** This skill makes sure
every change that touches auth, permissions, file handling, or private data (grievances)
keeps the actual security boundary on the server, matches `docs/permission-matrix.md`, and
doesn't quietly widen access.

## When it applies

- Any change to `src/lib/auth/**` (`permissions.ts`, `guard.ts`, `session.ts`, route
  permissions, password handling).
- Any new or modified `/admin/*` page, layout, or Server Action.
- Any change to `src/lib/security/**` (`file-storage.ts`, `upload-storage.ts`,
  `file-signature.ts`, `rate-limit.ts`, `crypto.ts`).
- Any change touching `Grievance`/`GrievanceNote` data or public grievance submission.
- Any change to session cookies, tokens, or password hashing.

## Project rules

1. **Never rely on client-side checks alone** (CLAUDE.md rule 5). Hiding a link in
   `AdminSidebar` is UX only, not a security control.
2. **Private grievance data must never be publicly exposed** (CLAUDE.md rule 6). Grievance
   submissions are sensitive by default — no public read endpoint, no leaking submitter PII
   into logs, search indexes, or unauthenticated API responses.
3. **Public users see only published information** (CLAUDE.md rule 4). Every public query
   must filter on `status: "PUBLISHED"` (`ContentStatus`) — draft/pending/rejected content
   must be unreachable from public routes even via direct ID/URL guessing.
4. **No secrets in Git** (CLAUDE.md rule 12). New env vars go in `.env.example` as
   placeholders, actual values stay out of the repo.
5. **Audit history is mandatory** (CLAUDE.md rule 8) for anything security-relevant: auth
   changes, permission/role changes, and admin mutations must write to `AuditLog` via
   `logAudit` — don't add a mutation path that bypasses it.

## Implementation rules

- **Every protected page enforces its own requirement server-side.** Call
  `requireUser()` or `requirePermission("<permission>")` from `src/lib/auth/guard.ts` at the
  top of the Server Component/Server Action, before reading or rendering anything —
  `requireUser()` redirects unauthenticated users to `/login`; `requirePermission()` also
  redirects authenticated-but-unauthorized users to `/admin/unauthorized`. Don't invent a new
  ad hoc check — reuse these.
- **Never read roles/permissions from the session cookie.** The cookie holds only a
  high-entropy random token (`SESSION_COOKIE_NAME`); `getCurrentUser()`
  (`src/lib/auth/session.ts`) re-reads roles/permissions from the database on every request.
  Don't cache permissions in a JWT claim, cookie, or client-passed value.
- **New admin routes/permissions must be added to `src/lib/auth/route-permissions.ts` and
  `docs/permission-matrix.md` together**, kept in sync per
  `tests/unit/auth/route-permissions.test.ts`. A route with no entry there has no enforced
  permission.
- **Respect separation of duties.** Per `docs/permission-matrix.md`, no role except
  `SUPER_ADMIN` holds both `:manage` (author) and `:publish` for the same content domain.
  When adding a new content domain/permission pair, preserve this split — don't grant one
  role both halves as a convenience.
- **Tokens/passwords:** session tokens are generated with `crypto.randomBytes` and only a
  SHA-256 hash is persisted (`hashToken` in `session.ts`); mirror this pattern (hash, don't
  store raw secrets) for any new secret-bearing table. Password hashing goes through the
  existing helpers in `src/lib/security` / `src/lib/auth` — don't hand-roll hashing or
  compare secrets with `===` (use constant-time comparison where one already exists).
- **File uploads:** route through `src/lib/security/upload-storage.ts` and
  `file-signature.ts` — validate file type/size and check the actual file signature, not just
  the extension or client-supplied MIME type, before a file becomes linkable from published
  content. An unpublished document's file must not be publicly fetchable even if its URL is
  guessed.
- **Rate limiting:** auth endpoints (login, password reset) and any public write endpoint
  (grievance submission, contact forms) should go through `src/lib/security/rate-limit.ts`
  rather than being left unbounded.
- **Grievance confidentiality:** grievance read/manage access is limited to
  `grievances:view`/`grievances:manage` (Principal/Administrator/Super Admin only, per
  `docs/permission-matrix.md`) — never add a public or lower-privilege read path, and never
  surface submitter-identifying fields outside that boundary (e.g. in audit log summaries
  shown more broadly, or in notifications sent to non-authorized roles).

## Validation checklist

- [ ] Every new/changed `/admin/*` route calls `requireUser()` or `requirePermission(...)`
      server-side, before any data access.
- [ ] The permission used exists in `src/lib/auth/permissions.ts` and matches
      `docs/permission-matrix.md`; new routes are added to `route-permissions.ts`.
- [ ] No authorization decision is made from data the client controls (cookie claims, hidden
      form fields, request body role/permission fields).
- [ ] Public queries/pages filter to `PUBLISHED` content only; draft content isn't reachable
      by direct ID.
- [ ] Grievance data stays behind `grievances:view`/`grievances:manage`; no new public read
      path.
- [ ] File uploads validate signature/type/size via existing `src/lib/security` helpers, not
      ad hoc checks.
- [ ] No plaintext secret/token persisted; no secret committed to the repo or `.env.example`.
- [ ] Security-relevant mutations write an `AuditLog` entry.

## Common mistakes

- Hiding an admin nav link or disabling a button for a role, then treating the route as
  "protected" without a server-side `requirePermission()` call.
- Trusting a role/permission passed in a request body or client state instead of re-deriving
  it from the database via `getCurrentUser()`.
- Adding a new admin route and forgetting to register it in `route-permissions.ts`, leaving
  it reachable by any authenticated user regardless of role.
- Giving one role both `:manage` and `:publish` for a content domain "just for now" —
  breaks the no-self-approval guarantee (rule 7) and the separation-of-duties design.
- Validating uploaded files only by extension or `Content-Type` header instead of checking
  the actual file signature.
- Logging or emailing full grievance content/submitter details to a channel visible to roles
  without `grievances:view`.
