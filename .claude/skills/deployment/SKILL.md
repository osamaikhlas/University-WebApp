---
name: deployment
description: Use when touching build/CI configuration, environment variables, next.config.ts security headers, migration deploy steps, or anything that affects how this app ships to staging/production — enforces no-secrets-in-git and blocked-on-red-tests before any deploy path is set up.
---

# Deployment skill

## Purpose

No CI pipeline, Dockerfile, or hosting config exists in this repo yet (`progress.md` tracks
this as open). This skill governs both what already exists that deploy-adjacent work must not
regress (env validation, security headers, migration workflow) and the non-negotiables from
`docs/architecture.md` §16–17 and CLAUDE.md rules 10 and 12 that any CI/deploy setup added
later must satisfy from the start, rather than being bolted on after an incident.

## When it applies

- Adding or modifying CI configuration (currently none — e.g. a first `.github/workflows/**`
  file).
- Adding a Dockerfile, hosting config, or process manager setup.
- Any change to `.env.example`, `src/lib/env.ts`, or how an environment variable is read.
- Any change to `next.config.ts`'s security headers.
- Any change to the migration-deploy step (`npm run db:migrate:deploy`) or seed gating.
- Any change to `package.json` scripts that a deploy pipeline would invoke.

## Project rules

1. **No secrets in Git, ever** (CLAUDE.md rule 12). `.env.example` holds only placeholder
   values and documentation comments — a real `DATABASE_URL`, `GRIEVANCE_ENCRYPTION_KEY`, or
   any future credential is sourced from the deploy environment/secret manager, never
   committed, never hard-coded as a fallback in `src/lib/env.ts`.
2. **CI must block deploy on red tests, not bypass it** (CLAUDE.md rule 10 applied at the
   pipeline level, `docs/architecture.md` §16). A CI setup that allows `--no-verify`-style
   skips, `continue-on-error` on the test job, or a manual "deploy anyway" default defeats
   the point.
3. **Dev-only fixtures never reach production.** The `[DEV SEED]` login accounts
   (`prisma/seed.ts`) are already gated off when `NODE_ENV=production`
   (see `.env.example`'s `DEV_LOGIN_PASSWORD` note) — any new seed/fixture data must preserve
   that gate, not weaken it for deploy convenience.
4. **Migrations deploy non-interactively and are never edited retroactively** — `npm run
   db:migrate:deploy` (`prisma migrate deploy`) is the correct step for CI/production, not
   `db:migrate` (interactive/dev) or `db push`. See the [[database]] skill.
5. **Security headers are a deployment-relevant contract, not incidental config** —
   `next.config.ts`'s CSP/HSTS/frame/referrer headers were added deliberately (see its own
   inline rationale comment) and apply to every response; don't relax them to unblock a
   deploy without addressing the actual underlying issue (e.g. a new external script host
   needs to be added to `script-src` explicitly, not covered by widening `'unsafe-inline'`
   further or adding a wildcard).

## Implementation rules

- **Environment variables are validated through `src/lib/env.ts`, not read raw.** Any new
  required variable gets a zod field there (presence/format checked, connectivity checked
  separately at runtime by an actual consumer — see that file's own comment on why) and a
  documented placeholder entry in `.env.example`, following the existing entries' comment
  style (what it's for, format, how to generate a dev value, which CLAUDE.md rule it
  supports).
- **`next build` must never require a live database or other external service.** `src/lib/
  prisma.ts`'s lazy-connecting singleton is deliberate — preserve that property in anything
  added to the build/deploy path; a health-check-style connectivity probe belongs at runtime
  (`src/app/api/health/route.ts`), not at module load or build time.
- **A first CI pipeline, when added, should at minimum run**: `npm run lint`, `npm run
  typecheck`, `npm test` (Vitest), and `npm run test:e2e` (Playwright, which itself spins up
  `npm run dev` per `playwright.config.ts`'s `webServer` block) — mirroring
  `docs/architecture.md` §16's "CI runs lint + full test suite before any deploy." Only merge
  to a deployable branch on green.
- **Staging before production** (`docs/architecture.md` §16) — any environment config added
  should support at least two distinct environments with separate `DATABASE_URL`/secrets, not
  assume a single production target.
- **Backups and restore testing** (`docs/architecture.md` §17) are a compliance-relevant
  concern here specifically because `AuditLog`/`ComplianceVerification` rows are the evidence
  trail the circular's "duly verified" requirement depends on — losing them to an untested
  backup is a compliance regression, not just an ops one. Flag this explicitly if
  deploy/infra work is scoped without it.
- **HTTPS/HSTS is enforced in production only** (`next.config.ts` conditionally adds
  `Strict-Transport-Security` when `NODE_ENV === "production"`) — preserve that conditional
  rather than forcing HSTS in local dev, which would break `http://localhost`.

## Validation checklist

- [ ] No new secret, credential, or real connection string appears in a committed file —
      check `.env.example`, config files, and any new script for accidental real values.
- [ ] New required env vars are added to both `src/lib/env.ts` (validated) and `.env.example`
      (documented placeholder).
- [ ] Any new/changed CI step keeps lint + typecheck + unit + e2e tests as a hard gate, with
      no skip/bypass flag.
- [ ] Migration deploy step uses `prisma migrate deploy`, not `migrate dev` or `db push`.
- [ ] `[DEV SEED]` accounts and other dev fixtures remain gated off in production.
- [ ] Security headers in `next.config.ts` are unchanged, or changed with an inline rationale
      comment matching the existing one's level of specificity.
- [ ] `progress.md` updated with the deployment decision made (stack, hosting, CI provider)
      per CLAUDE.md rule 15, since these are exactly the kind of open questions it tracks.

## Common mistakes

- Committing a working `.env` or a real API key "just for staging" instead of wiring it
  through the deploy platform's secret store.
- Adding a CI job that reports success even when tests fail (misconfigured `continue-on-error`,
  swallowed exit code), quietly reintroducing rule 10's failure mode at the pipeline level.
- Using `prisma db push` or hand-running SQL against a production database instead of a
  committed migration, causing schema drift between environments and an un-auditable change.
- Loosening `next.config.ts`'s CSP (e.g. adding `'unsafe-eval'` in production, or a broad
  external `script-src`) to unblock a new third-party script instead of scoping the addition
  precisely.
- Leaving `DEV_LOGIN_PASSWORD`-gated seed accounts reachable because a deploy script sets
  `NODE_ENV` inconsistently (e.g. only for the build step, not the running server).
