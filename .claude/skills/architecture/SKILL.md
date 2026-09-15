---
name: architecture
description: Use when adding a new module, deciding where a piece of logic/data should live, or making any structural change that spans public site, admin, and database layers — keeps the codebase traceable to docs/architecture.md and the circular-derived module list in CLAUDE.md.
---

# Architecture skill

## Purpose

CLAUDE.md's "Required scope" section enumerates every public and admin module this project
must eventually cover, each traceable back to the SALU circular
(`docs/requirements.md`/`docs/compliance-matrix.md`). `docs/architecture.md` is the design
document that shape decisions (tenancy, module lifecycle, layering) were made against. This
skill keeps new/changed code consistent with that shape instead of each module reinventing
its own structure.

## When it applies

- Adding a new content module (a new domain the public site and admin CMS both need to
  reflect) rather than a fix inside an existing one.
- Any decision about where logic belongs: Server Component vs. Server Action vs. `src/lib/**`
  helper vs. database constraint.
- Any change that touches more than one of: Prisma schema, an admin module, and a public
  page/query for the same domain.
- Introducing a new cross-cutting concern (a new kind of workflow, a new admin sidebar
  section, a new top-level `src/lib/**` directory).

## Project rules

This repo is a single Next.js App Router application — public site and admin CMS are two
route groups (`src/app/(public)/**`, `src/app/admin/**`) over one database, not the separate
public-site/admin-API/backend split `docs/architecture.md` §0 first sketched. Treat that
document as the rationale trail (why draft/publish, why RBAC, why audit logs), not a literal
service topology to re-derive.

1. **Every module traces to the required scope.** A new admin/public module should map to an
   item in CLAUDE.md's Public website / Admin system lists, or to `docs/compliance-matrix.md`
   — don't add a module with no circular/CLAUDE.md anchor without flagging it as such.
2. **Tenant-ready by convention.** Every content-bearing Prisma model carries `collegeId`
   (see `prisma/schema.prisma` — 100+ fields already do). New models follow this even though
   only one `College` row exists today ([[database]] skill).
3. **Institutional content is data, not code** (CLAUDE.md rule 2, 3) — a new module means a
   Prisma model plus admin/public routes over it, never content literals in a component.
4. **Draft/publish and audit are structural, not per-module inventions** — reuse
   `ContentStatus`/`applyWorkflowTransition` ([[cms]] skill) and `logAudit` ([[security]]
   skill) rather than a module-local status enum or a bespoke history table.

## Implementation rules — where new code belongs

- **`prisma/schema.prisma`**: the source of truth for a module's shape. Add the model here
  first, including `collegeId`, `status ContentStatus @default(DRAFT)` if it's publishable
  content, and `isPlaceholder Boolean @default(false)` if seed data will exist before real
  college data. Run a real migration (`npm run db:migrate`) — don't hand-edit
  `prisma/migrations/**`.
- **`src/lib/<domain>.ts` or `src/lib/<domain>/**`**: business logic and public-facing
  queries for a domain (e.g. `src/lib/content.ts`, `src/lib/compliance.ts`,
  `src/lib/grievance-workflow.ts`). Server Components and Server Actions call into these
  rather than embedding Prisma queries inline in a page, so the same query logic (especially
  `status: "PUBLISHED"` filtering) isn't duplicated and drifted across routes.
- **`src/lib/admin/**`**: admin-only cross-module helpers (dashboard aggregation, audit log
  formatting, module permission tables) — not a place for public-facing logic.
- **`src/lib/auth/**` / `src/lib/security/**`**: the only places session, permission, upload,
  rate-limit, and crypto logic live — see the [[security]] skill before adding anything here
  or duplicating a check elsewhere.
- **`src/app/(public)/<section>/page.tsx`**: Server Component, reads through the domain's
  public query helper, renders `PagePlaceholder`/`DemoDataNotice` for missing/placeholder
  content rather than fabricating or omitting the section silently.
- **`src/app/admin/<module>/**`**: list page, `[id]/page.tsx` detail/edit, `<Module>Form.tsx`
  client form component, `actions.ts` Server Actions — mirror the structure of an existing
  module (e.g. `src/app/admin/notices/**`) rather than inventing a new file layout per
  module. See the [[frontend]] and [[backend]] skills for the internals of each piece.
- **`src/components/ui/**`**: shared, content-agnostic primitives (`Button`, `Card`, `Table`,
  `Badge`, …). A new one-off UI element used by a single module belongs beside that module,
  not here.
- **`src/components/admin/**`**: shared admin-only widgets that read workflow/permission
  state (`WorkflowActions`, `StatusBadge`, `ComplianceActions`, …) — extend these for a new
  module's status/workflow UI before writing a module-local variant.

## Validation checklist

- [ ] New module has a clear anchor: a CLAUDE.md scope item and/or a
      `docs/compliance-matrix.md` row.
- [ ] New Prisma model carries `collegeId`; carries `status`/`isPlaceholder` if it's
      publishable content.
- [ ] Business/query logic lives in `src/lib/**`, not inlined in a page or Server Action.
- [ ] Draft/publish uses the shared `ContentStatus` machine; nothing reinvents its own status
      enum or bypasses `applyWorkflowTransition`.
- [ ] Admin module's file layout mirrors an existing module (list / `[id]` / form / actions).
- [ ] `docs/architecture.md`, `docs/compliance-matrix.md`, and `progress.md` updated if the
      change introduces a new module or changes a documented structural decision
      (CLAUDE.md rule 15).

## Common mistakes

- Treating `docs/architecture.md` §0–2's "separate public app / admin app / backend API"
  sketch as the literal target shape — the implemented app is one Next.js app; check the real
  route groups and `src/lib/**` layout before assuming a document from before Phase 2 still
  describes the code.
- Building a new module without `collegeId`, "because there's only one college," then having
  to retrofit every query later.
- Putting a Prisma query directly in a page component for convenience instead of a
  `src/lib/**` helper, so the public/draft filter ends up duplicated (and eventually
  inconsistent) across routes.
- Inventing a new admin file layout for a module instead of mirroring an existing one,
  making the codebase harder to navigate by pattern-matching.
- Adding a whole new module with no traceability to CLAUDE.md's required scope or the
  circular — scope creep the project's own rules are designed to prevent.
