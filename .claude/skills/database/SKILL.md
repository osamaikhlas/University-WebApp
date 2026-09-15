---
name: database
description: Use when changing prisma/schema.prisma, writing a migration, or writing/modifying a Prisma query — enforces the schema's tenancy, lifecycle, placeholder, and audit conventions and the migrate-don't-hand-edit workflow.
---

# Database skill

## Purpose

`prisma/schema.prisma` is the single source of truth for every module's shape (see the
[[architecture]] skill). Its conventions exist to make CLAUDE.md rules 1–4, 7, 8, 13, 14
mechanically checkable at the data layer rather than trusted-by-convention in application
code: tenancy (`collegeId`), draft/publish (`ContentStatus`), placeholder marking
(`isPlaceholder`), and an append-only audit trail (`AuditLog`). This skill keeps new schema
and query work consistent with that.

## When it applies

- Any change to `prisma/schema.prisma`.
- Writing or running a migration (`npm run db:migrate`, `db:migrate:deploy`).
- Any change to `prisma/seed.ts`.
- Writing a new Prisma query, especially one feeding a public page, search, or the sitemap.
- Any change to `src/lib/prisma.ts`.

## Project rules

1. **Multi-tenant by convention** (`docs/architecture.md` §0). Every content-bearing model
   carries `collegeId String` with `@relation` to `College` and `@@index([collegeId])` — add
   it to any new model even though only one `College` row exists today.
2. **Publishable content uses the shared `ContentStatus` enum**, never a module-local status
   field or a boolean `published`. See the [[cms]] skill for the state machine that writes
   it — the schema only defines the enum and default (`@default(DRAFT)`), it doesn't enforce
   transitions; that lives in `src/lib/content-workflow.ts`.
3. **Placeholder data is a schema-level fact, not a UI convention** (CLAUDE.md rules 13, 14).
   `isPlaceholder Boolean @default(false)` on any model that will hold seed/dev data before
   real college records exist. Never rely on a naming convention or a comment instead.
4. **Audit history is append-only** (CLAUDE.md rule 8). `AuditLog` rows are written via
   `logAudit` (`src/lib/audit.ts`) and never updated or deleted — there is no
   `prisma.auditLog.update`/`.delete` call anywhere in application code, and there shouldn't
   be one in yours either.
5. **No secrets in schema or seed data** (CLAUDE.md rule 12). Connection strings/keys come
   from `src/lib/env.ts`-validated environment variables (`src/lib/prisma.ts`), never
   hard-coded.
6. **Sensitive fields are encrypted at rest, not just access-controlled.**
   `Grievance.submitterEmail`/`submitterPhone` are stored via `encryptSecret`
   (`src/lib/security/crypto.ts`) — mirror this for any new field holding grievance-submitter
   or similarly private PII, rather than assuming permission checks alone are sufficient
   (CLAUDE.md rule 6, [[security]] skill).

## Implementation rules

- **Every schema change goes through a real migration.** Run `npm run db:migrate` (dev) to
  generate and apply it; never hand-edit files under `prisma/migrations/**` or resolve schema
  drift by editing a past migration. `npm run db:migrate:deploy` is the non-interactive
  variant for CI/production — don't run `db push` against an environment with real data.
- **Follow the existing column conventions** (see `Notice`, `AuditLog`, `College` in
  `prisma/schema.prisma` for the canonical shapes): `id String @id @default(cuid())`,
  `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`, `createdBy`/
  `updatedBy` (nullable actor id strings, not a hard FK requirement, so system/seed writes
  don't need a synthetic user) on mutable content, `publishedAt`/`publishedBy` set only by
  the `publish` transition, `lastReviewedAt`/`lastReviewedById` for content-freshness tracking.
  Table names are explicit and snake_case via `@@map("...")`.
- **Index what you'll actually filter or sort by.** At minimum `@@index([collegeId])` on
  tenant-scoped models; add indexes for columns used in public-page ordering (e.g. `Notice`'s
  `@@index([publishDate])`) or lookup (`AuditLog`'s `@@index([entityType, entityId])`,
  `@@index([actorId])`, `@@index([createdAt])`).
- **Public queries always filter `status: "PUBLISHED"` at the Prisma call site**, in the
  `src/lib/**` helper the [[architecture]] skill designates for that domain — never rely on
  the caller (a page) to remember the filter, and never add a second query path for the same
  data that skips it (this is the mechanism behind CLAUDE.md rule 4).
- **The Prisma client is a lazy-connecting singleton** (`src/lib/prisma.ts`, via
  `@prisma/adapter-pg`) — import `{ prisma }` from there; don't instantiate a second
  `PrismaClient`, and don't add connection-time side effects (the module must stay
  import-safe with no reachable database, since `next build` relies on that).
- **Seed data** (`prisma/seed.ts`) must set `isPlaceholder: true` on every fabricated record
  and never seed real institutional data. Dev-only seed login accounts follow the existing
  `[DEV SEED]` / `<role-slug>@example.invalid` pattern and must stay gated so they are never
  created when `NODE_ENV=production` (see `.env.example`'s `DEV_LOGIN_PASSWORD` note).
- **Encrypted fields are stored as opaque strings** (ciphertext), never as plaintext with
  encryption applied only in a display layer — encrypt at the Server Action before the
  `prisma.create`/`update` call, decrypt only where an authorized reader needs the value.

## Validation checklist

- [ ] New model has `collegeId` (+ relation, + `@@index([collegeId])`) unless it is
      genuinely global (e.g. `Permission`).
- [ ] Publishable content uses `status ContentStatus @default(DRAFT)`, not a bespoke field.
- [ ] Models that will hold seed/dev data before real records exist have `isPlaceholder`.
- [ ] Schema change shipped as a real migration under `prisma/migrations/**`, not a hand
      edit or an uncommitted `db push`.
- [ ] No new `AuditLog` update/delete path introduced.
- [ ] New PII-adjacent fields (grievance submitter details or equivalent) are encrypted at
      rest, matching the `crypto.ts` pattern.
- [ ] Public-facing query filters `PUBLISHED` status at the query layer.
- [ ] `docs/database-design.md` updated if the change diverges from or extends its documented
      model (CLAUDE.md rule 15) — note where the implemented schema has evolved past that
      design doc (e.g. per-module tables instead of a generic `ContentItem`/`ContentVersion`
      pair) rather than silently contradicting it.

## Common mistakes

- Adding a new content model without `collegeId` because "there's only one college" — breaks
  the tenant-ready convention every other model follows.
- Using a plain `Boolean published` or a module-specific status string instead of the shared
  `ContentStatus` enum, fragmenting the draft/publish logic the [[cms]] skill centralizes.
- Editing a migration file after it's been applied/committed, or running `prisma db push`
  against a database with real data, instead of a new forward migration.
- Seeding fixture data without `isPlaceholder: true`, or writing seed institutional facts
  that read as real (specific fee amounts, real-sounding names) — violates rules 1 and 14.
- Storing a new sensitive field in plaintext and only gating it with a permission check,
  instead of encrypting it at rest the way `Grievance.submitterEmail` is.
- Writing a public query directly against a model without a `status: "PUBLISHED"` filter,
  reachable by a direct ID/slug lookup even if the listing page filters correctly.
