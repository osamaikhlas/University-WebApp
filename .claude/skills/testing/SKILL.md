---
name: testing
description: Use whenever writing, fixing, or reviewing tests, or when a test is failing — enforces that failing/inconvenient tests get the underlying issue fixed, never deleted or weakened, and keeps tests.json honest.
---

# Testing skill

## Purpose

CLAUDE.md rule 10 is absolute: **never delete or weaken a test just to make it pass.** This
skill exists because that temptation is highest under time pressure, and this project's
tests are the only mechanical check that rules 4–8 (draft/publish gating, server-side auth,
grievance confidentiality, human-gated compliance, audit trail) actually hold at runtime.

## When it applies

- Any time a test fails, whether from your own change or pre-existing.
- Writing tests for new functionality (CLAUDE.md rule 9 — "important functionality" always
  includes authorization, publish-gating, and grievance confidentiality per
  `docs/requirements.md` §4).
- Any change to `tests/unit/**`, `tests/e2e/**`, `vitest.config.ts`, `playwright.config.ts`,
  or `tests.json`.
- Reviewing a PR/diff that touches test files.

## Project rules

1. **Never delete or weaken a test to make it pass** (CLAUDE.md rule 10). Fix the underlying
   issue instead — in the implementation, the fixture, or a genuinely outdated assertion (not
   the same thing as an inconvenient one).
2. **Write tests for important functionality** (CLAUDE.md rule 9) — treat authorization
   (server-side permission checks), publish/draft gating, grievance confidentiality, and
   compliance verification gating as always "important."
3. **Verify UI using browser automation where practical** (CLAUDE.md rule 11) — e2e coverage
   via Playwright (`tests/e2e/**`) is expected for user-facing flows, not just unit tests of
   logic.
4. **Keep `tests.json` updated alongside any test work** (CLAUDE.md rule 15). Never remove an
   entry to hide missing or failing coverage — change its `status` honestly instead
   (`not_started`, `planned`, `in_progress`, `passing`, `failing`, `skipped`).

## Implementation rules

- **Diagnose before touching a failing test.** Is the test wrong (asserting behavior the app
  no longer has *by intentional design*, per `tests/unit/routes.test.ts`'s pattern of being
  updated in step with real route changes) or is the app wrong? Default assumption: the app
  is wrong until you've traced the failure to a specific, deliberate behavior change that the
  test simply hasn't caught up to yet.
- **Loosening an assertion is the same violation as deleting the test.** Widening a matcher,
  removing a case from a `describe`/`it`, commenting out an expectation, changing
  `toStrictEqual` to a looser check, or adding `.skip`/`.todo` to dodge a failure all count as
  "weakening" under rule 10 — none of these are acceptable shortcuts to a green run.
- **Unit tests** (`tests/unit/**`, Vitest + jsdom, see `vitest.config.ts`) cover pure logic:
  workflow state machines (`content-workflow.ts`, `compliance-workflow.ts`), permission
  derivation (`tests/unit/auth/*`), security helpers (`tests/unit/security/*`), SEO/sitemap,
  and UI components. `server-only` is aliased to a test stand-in
  (`tests/mocks/server-only.ts`) — server-only modules are testable directly under Vitest via
  this alias, don't work around it.
- **E2E tests** (`tests/e2e/**`, Playwright, `baseURL: http://localhost:3000`) cover full user
  flows against a real running app (`npm run dev` via `webServer`), including auth-gated
  admin flows: `tests/e2e/auth.spec.ts` logs in as each seeded `[DEV SEED]` role account
  (`<role-slug>@example.invalid`) to verify role-specific access end-to-end — extend this
  pattern for new role-gated routes rather than creating a parallel auth mechanism in tests.
- **New CMS module → new tests, minimum:** a workflow/permission unit test (manage-tier vs.
  publish-tier actions correctly gated, reject requires a reason, no direct status-only
  write) and an e2e test that an unpublished item is absent from the public page/route while
  a published one appears (mirrors `tests/e2e/cms-*.spec.ts`).
- **New compliance item/action → test that `VERIFIED` is unreachable without
  `compliance:verify`**, mirroring `tests/unit/compliance-workflow.test.ts`.

## Validation checklist

- [ ] `npm test` (Vitest) and, where relevant, `npm run test:e2e` (Playwright) pass — not
      merely "the specific test I touched" but the surrounding suite.
- [ ] No test was deleted, skipped, or had an assertion loosened as part of "fixing" it,
      unless the underlying behavior it checked was deliberately and correctly changed.
- [ ] Every assertion removed or changed has a one-line justification tying it to a real,
      intentional behavior change (in the commit/PR description) — not just "it was
      failing."
- [ ] New important functionality (auth, publish gating, grievance privacy, compliance
      verification) has corresponding new test coverage.
- [ ] `tests.json` entries added/updated to reflect real status — no entry silently removed.
- [ ] `tests.json`'s `lastUpdated` and any changed item's `notes` accurately describe current
      coverage (file path, case count/summary).

## Common mistakes

- Seeing a failing assertion, concluding "this test must be outdated," and adjusting it to
  match the new (buggy) output instead of checking whether the output is actually correct.
- Adding `.skip`/`.todo`/`test.fixme` to a flaky-looking test instead of finding the actual
  flakiness source (timing, shared state, unseeded data).
- Deleting a `tests.json` entry for a feature that regressed instead of flipping its
  `status` to `failing` and fixing the regression.
- Writing only a unit test for a new permission check and skipping the e2e role-based-access
  test — permission *logic* passing doesn't prove the route actually enforces it end-to-end.
- Narrowing a test's scope (e.g. testing only the happy path) right after it caught a real
  edge-case bug, instead of fixing the bug and keeping the edge case covered.
