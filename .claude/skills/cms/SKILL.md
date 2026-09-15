---
name: cms
description: Use when adding or modifying any CMS content module (College Profile, Departments, Programs, Faculty, Staff, Notices, Events, Documents, Gallery, etc.) — enforces the draft/review/approval/publishing workflow and the public-vs-draft visibility boundary.
---

# CMS skill

## Purpose

CLAUDE.md rules 2–4 and 7–8 require that official content is data (not hard-coded), lives in
the CMS/database, is never shown publicly until published, and only reaches "published" via a
human approval step with an audit trail. This skill is the concrete recipe for building any
CMS-backed content module so it complies automatically instead of by manual vigilance.

## When it applies

- Adding a new CMS content module/type (new Prisma model with `ContentStatus`, new admin
  pages under `src/app/admin/<module>/**`, new public page under `src/app/(public)/**`).
- Modifying an existing module's forms, actions, or workflow transitions.
- Adding/changing any public-facing query in `src/lib/content.ts` or similar.
- Any change to `src/lib/content-workflow.ts` itself.

## Project rules

1. **Content is data, not code** (CLAUDE.md rule 2, 3). Institutional content lives in
   Prisma models, never hard-coded into components or config.
2. **Public users see only published information** (CLAUDE.md rule 4). No public route,
   query, sitemap entry, or search index may expose non-`PUBLISHED` content.
3. **No auto-approval** (CLAUDE.md rule 7). Every status transition to `PUBLISHED` passes
   through `APPROVED`, which requires the `publish`-tier permission — never a system default
   or a side effect of another action.
4. **Audit trail on every transition** (CLAUDE.md rule 8) — handled centrally by
   `applyWorkflowTransition`; don't bypass it with a raw `prisma.<model>.update({ status })`.
5. **Placeholder/seed content must be clearly marked** (CLAUDE.md rules 1, 13, 14) — an
   `isPlaceholder` flag (or equivalent) on the model, rendered via a visible notice
   (`DemoDataNotice` pattern) wherever shown.

## Implementation rules — the state machine

Every CMS module reuses the single shared state machine in `src/lib/content-workflow.ts`
(`ContentStatus` in `prisma/schema.prisma`) — do not invent a per-module variant:

```
DRAFT --submit_for_review--> SUBMITTED --start_review--> UNDER_REVIEW
  UNDER_REVIEW --approve--> APPROVED --publish--> PUBLISHED
  UNDER_REVIEW --reject--> DRAFT                    (reason MANDATORY)
PUBLISHED --request_update--> UPDATE_REQUIRED --return_to_draft--> DRAFT
PUBLISHED --unpublish--> APPROVED
any non-ARCHIVED --archive--> ARCHIVED --unarchive--> DRAFT
```

- **Manage-tier actions** (`MANAGE_PERMISSION_ACTIONS`): `submit_for_review`,
  `return_to_draft`, `unarchive` — gated on the module's `manage` permission (author-level).
- **Publish-tier actions** (everything else — `start_review`, `approve`, `reject`, `publish`,
  `unpublish`, `request_update`, `archive`): gated on the module's `publish` permission
  (reviewer-level). This split is what makes self-approval structurally impossible — see
  `docs/permission-matrix.md` "Design principles" §1: **no role holds both `manage` and
  `publish` for the same domain except `SUPER_ADMIN`.**
- `reject` **requires** a non-empty comment (`REASON_REQUIRED_ACTIONS`); it always returns
  to `DRAFT`, never silently discards the submission.
- Only the `publish` transition ever sets `publishedAt`/`publishedBy`.
- Every module's permission triple (`view`/`manage`/`publish`) is declared once in
  `src/lib/admin/module-permissions.ts` (`MODULE_PERMISSIONS`) — add a new module there
  rather than wiring ad hoc permission strings into its Server Actions.

## Implementation rules — wiring a new module

1. **Prisma model**: include a `status ContentStatus @default(DRAFT)` field, plus
   `updatedBy`, `publishedAt`/`publishedBy` if the module supports publish-visible dates, and
   `isPlaceholder Boolean @default(false)` if seed data will exist before real college data
   is supplied.
2. **Server Actions**: call `requirePermission(MODULE_PERMISSIONS.<module>.manage |
   .publish)` (per action, matching the manage/publish tier above) from
   `src/lib/auth/guard.ts` first — this is the actual security boundary, see the
   [[security]] skill. Then call `applyWorkflowTransition({ entityType, entityId,
   currentStatus, action, actorId, comment, update })`; let it validate the transition and
   write the audit entry — don't hand-roll status checks.
3. **Public queries** (`src/lib/content.ts` or module-local equivalent): every read for a
   public page filters `where: { ..., status: "PUBLISHED" }`. There is no public route that
   fetches by ID/slug without this filter, even for a "preview" — previews of unpublished
   content belong in the *admin* UI, gated by the module's `view`/`manage` permission, never
   under `(public)`.
4. **Sitemap/search**: new public content must flow through the same `PUBLISHED`-only query
   layer feeding the sitemap and search index — don't add a second unfiltered path into
   either.
5. **Admin UI**: show available transitions via a helper mirroring
   `getAvailableActions`-style logic (derive from `WORKFLOW_TRANSITIONS[*].from` plus the
   caller's manage/publish grant), so the UI can't offer an action the backend would reject
   — but always re-validate server-side regardless of what the UI offered.

## Validation checklist

- [ ] New content type stores institutional data in the database, not hard-coded in a
      component or config file.
- [ ] Model has a `ContentStatus` field defaulting to `DRAFT`.
- [ ] All status transitions go through `applyWorkflowTransition` — no raw status writes.
- [ ] Manage-tier and publish-tier actions are gated on different permissions
      (`MODULE_PERMISSIONS.<module>.manage` vs `.publish`); no single non-`SUPER_ADMIN` role
      holds both for this module.
- [ ] `reject` (and any other `REASON_REQUIRED_ACTIONS` entry) enforces a non-empty reason.
- [ ] Every public query/page/sitemap/search entry for this content filters to
      `status: "PUBLISHED"`.
- [ ] Placeholder/seed rows are flagged and visibly marked, never presented as verified fact.
- [ ] `docs/compliance-matrix.md` updated if this module maps to one of the 20 circular
      items (see the [[compliance]] skill).
- [ ] `tests.json` updated with coverage for the new module's workflow and publish-gating.

## Common mistakes

- Writing `prisma.<model>.update({ data: { status: "PUBLISHED" } })` directly instead of
  going through `applyWorkflowTransition` — skips the audit trail and transition validation.
- Giving a single role both the `manage` and `publish` permission for a new domain "to keep
  it simple" — breaks separation of duties and effectively allows self-approval.
- A public page or API route that fetches content by ID without a `status: "PUBLISHED"`
  filter, reachable if someone guesses/knows the ID of a draft.
- Treating `UPDATE_REQUIRED` as still fully "live and fine" — it means content is published
  but flagged as needing rework; don't suppress that signal from admin views.
- Forgetting `archive`/`unarchive` when designing a new module's admin UI, leaving no way to
  retire stale content without deleting its history.
- Seeding demo content that reads as authoritative (real-sounding names, dates, fees)
  without `isPlaceholder`/`[PLACEHOLDER]` marking.
