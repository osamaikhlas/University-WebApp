---
name: backend
description: Use when writing or modifying a Server Action, route handler, or src/lib/** business logic — enforces the validate-authorize-mutate-audit sequence and this app's Server Action conventions.
---

# Backend skill

## Purpose

This app has no separate backend API — Server Actions and Server Components under
`src/app/**` *are* the backend, running server-side in the same Next.js process
(`docs/architecture.md`'s original separate-API sketch was superseded — see the
[[architecture]] skill). That makes every Server Action the actual security and data-integrity
boundary (CLAUDE.md rule 5): there is no other layer downstream re-checking permissions or
input. This skill is the concrete sequence every mutating action follows so that boundary
holds consistently.

## When it applies

- Writing or modifying any `"use server"` Server Action (`src/app/**/actions.ts` or inline).
- Writing or modifying a route handler under `src/app/api/**`.
- Adding logic to `src/lib/**` that a Server Action or Server Component calls into.
- Any change to how a form submits data (action wiring, `useActionState` usage).

## Project rules

1. **Server-side authorization is mandatory** (CLAUDE.md rule 5) — every mutating action
   calls `requireUser()`/`requirePermission()` (`src/lib/auth/guard.ts`) or, for public
   write endpoints with no login (grievance submission, contact forms), applies rate limiting
   instead. See the [[security]] skill for the full authorization model.
2. **Validate all input with zod before touching the database** — every existing Server
   Action defines a schema (e.g. `grievanceSchema` in
   `src/app/(public)/grievance/actions.ts`) and calls `.safeParse`, returning a typed error
   state rather than throwing on bad input.
3. **Status transitions never write `status` directly** — content/compliance/grievance status
   changes go through their workflow helper (`applyWorkflowTransition`,
   `src/lib/compliance-workflow.ts`, `src/lib/grievance-workflow.ts`), never a raw
   `prisma.<model>.update({ data: { status } })` ([[cms]], [[compliance]] skills).
4. **Every mutation of official content or admin state writes an audit entry** (CLAUDE.md
   rule 8) via `logAudit` (`src/lib/audit.ts`) — actor (or `null` for an unauthenticated
   public write, with a hashed IP instead), action, entity type/id, before/after snapshot.
5. **Institutional content is data** (CLAUDE.md rules 2, 3) — a Server Action persists to
   Prisma; it never hard-codes college-specific facts as literals.

## Implementation rules — the Server Action shape

Follow the sequence used throughout the codebase (see
`src/app/(public)/grievance/actions.ts`, and any `src/app/admin/*/actions.ts`):

1. `"use server"` at the top of the file (or function, for colocated actions).
2. Anti-abuse/cheap rejects first, before any DB work: honeypot fields on public forms,
   `checkRateLimit` (`src/lib/security/rate-limit.ts`) for public write endpoints.
3. **Authorize** — `requireUser()`/`requirePermission(<permission>)` for admin actions. For
   admin actions specifically, use the module's declared manage/publish-tier permission from
   `MODULE_PERMISSIONS` (`src/lib/admin/module-permissions.ts`), matching the manage/publish
   split the [[cms]] skill describes — don't invent an ad hoc permission string.
4. **Validate** — parse `FormData` (or a plain object) through a zod schema; return a typed
   `{ status: "error", error }` state on failure rather than throwing, so the client form can
   render it (see the [[frontend]] skill for the corresponding `useActionState` usage).
5. **Mutate** — call the domain's `src/lib/**` helper or a direct `prisma` call for
   simple creates; encrypt any sensitive field first (`encryptSecret`,
   `src/lib/security/crypto.ts`) if it's PII-adjacent; run multi-step writes that must be
   atomic inside `prisma.$transaction`.
6. **Audit** — `logAudit({ actorId, action, entityType, entityId, before?, after, comment?,
   ipAddress? })` after a successful mutation.
7. Return a typed state object (`{ status: "idle" | "error" | "success", ... }`) — the
   convention this codebase uses for `useActionState`, not a thrown redirect for form
   submissions (redirects are reserved for guard-level auth failures in
   `src/lib/auth/guard.ts` and post-success navigation).

## Implementation rules — route handlers (`src/app/api/**`)

- Reserved for endpoints that aren't form submissions from a React tree: health checks
  (`src/app/api/health/route.ts`), machine-consumed responses. Apply the same
  authorize-then-validate ordering as Server Actions when a route handler is
  privileged/mutating.
- Never let a route handler become a second, unfiltered path to data a Server
  Component/Action already serves correctly (e.g. a JSON export of content that skips the
  `PUBLISHED` filter a page's query applies).

## Validation checklist

- [ ] Admin action calls `requirePermission(<module's manage/publish permission>)` before any
      read/write; public write endpoints are rate-limited.
- [ ] Input is validated with a zod schema; no unvalidated `formData.get(...)` value reaches
      Prisma.
- [ ] Status changes go through the domain's workflow helper, not a raw status write.
- [ ] Mutation is followed by a `logAudit` call with a meaningful `entityType`/`entityId`/
      action and, where relevant, before/after snapshots.
- [ ] Sensitive fields (grievance submitter PII or equivalent) are encrypted before the
      `prisma` call, not after.
- [ ] Action returns a typed state object matching the calling form's `useActionState` type,
      not an uncaught throw for expected validation/authorization failures.
- [ ] Multi-step writes that must be atomic are wrapped in `prisma.$transaction`.

## Common mistakes

- Skipping `requirePermission` on an action because "the page it's called from is already
  gated" — a Server Action is a public network endpoint in its own right; the page's guard
  doesn't protect it.
- Trusting a hidden form field or client-passed value for something authorization-relevant
  (role, ownership, entity id used for a scoping check) instead of re-deriving it server-side.
- Doing the mutation before validation, so a partially-invalid submission still writes
  something.
- Forgetting `logAudit` on an admin mutation, silently breaking the audit trail CLAUDE.md
  rule 8 requires.
- Writing `prisma.<model>.update({ data: { status: "PUBLISHED" } })` (or equivalent) directly
  instead of the domain's workflow transition helper.
- Throwing raw errors for expected validation failures instead of returning the typed error
  state the form expects, producing an ugly unhandled error instead of an inline message.
