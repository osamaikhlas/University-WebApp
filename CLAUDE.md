# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

This project is an **official affiliated-college website and administration system**, built to satisfy the
university circular in `docs/source` (Shah Abdul Latif University, Khairpur, Office of the Inspector of
Colleges, No. I.C/SALU/KHP/-662, dated 04.09.2026 — see `docs/source/README.md`). The circular mandates
that affiliated colleges launch an official website containing specific categories of institutional
information, kept accurate and regularly updated under the Principal's personal responsibility.

The system has two halves:

1. **Public website** — the published, citizen/student-facing site.
2. **Admin system** — the CMS and back-office that produces the content shown on the public site, including
   user/role management and a compliance/approval workflow.

## Project state

No application code exists yet. This repo currently holds only planning/reference material (the circular
scans, this file, `progress.md`, `tests.json`). **Do not implement application functionality until
explicitly instructed** — when planning or scaffolding work happens, log it in `progress.md` and keep
`tests.json` in sync. Once a stack is chosen and code is added, this file must be updated with real
build/dev/lint/test commands.

## Required scope

Everything below is the target scope. It does not all need to exist at once, but any implementation work
should be traceable to one of these items, and none of them should be silently dropped.

### Public website

Home, About, College Profile, History, Vision/Mission, Principal's Message, Departments, Programs, Faculty,
Non-teaching Staff, Infrastructure, Admissions, Academic Calendar, Timetable, Examinations, Results,
Notices, Events, Activities, Gallery, Scholarships, Student Support, Rules and Regulations, Affiliation,
Grievance, Contact, Location, Downloads, Search.

### Admin system

Dashboard, CMS, Users, Roles, Permissions, Notices, Events, Faculty, Staff, Programs, Admissions,
Timetables, Academic Calendar, Exams, Results, Documents, Gallery, Scholarships, Student Support,
Grievances, Compliance, Audit logs, Approval workflow.

## Non-negotiable rules

These apply to all work in this repository, regardless of stack or phase:

1. **Never invent official college information.** Names, fees, faculty/staff details, addresses, dates,
   history, etc. must come from real college records supplied by the user, never fabricated. This directly
   follows `docs/source/README.md`: *"Circular = requirements, College records = actual official content."*
2. **Never hard-code official content into application components.** Institutional content is data, not
   code.
3. **Store official content in the database/CMS**, not in source files or config.
4. **Public users see only published information.** Draft/unapproved content must never reach public
   views or public API responses.
5. **Server-side authorization is mandatory.** Never rely on client-side checks alone for access control.
6. **Private grievance data must never be publicly exposed.** Grievance submissions are sensitive by
   default.
7. **Compliance verification must require authorized human approval.** No content or compliance status
   can be auto-approved by the system itself.
8. **Keep audit history.** Changes to official content, approvals, and admin actions must be traceable.
9. **Write tests for important functionality.**
10. **Never delete or weaken tests just to make them pass.** Fix the underlying issue instead.
11. **Verify UI using browser automation where practical.**
12. **Do not store secrets in Git.**
13. **Use placeholder values when real college data is unavailable**, rather than inventing real-sounding
    data.
14. **Clearly mark development placeholder data** so it can never be mistaken for verified official
    content (e.g. obvious `[PLACEHOLDER]` / `TODO` markers, a `isPlaceholder` flag, seed-data tagging).
15. **Keep documentation and progress files updated** — in particular `progress.md` and `tests.json`.

## Repository contents

- `docs/cirucular-img1.jpeg`, `docs/circular-img2.jpeg` — scanned pages of the official circular defining
  the minimum required website content.
- `docs/source/README.md` — the circular-vs-college-records distinction (rule 1's source).
- `progress.md` — living log of project status, decisions, and next steps. Update it as work happens.
- `tests.json` — manifest tracking planned/actual test coverage per feature area. Update it alongside any
  test work; never remove entries to hide failing or missing coverage.
- `CLAUDE.md` — this file.

## Commands

Stack: Next.js (App Router) + TypeScript + Tailwind CSS + PostgreSQL/Prisma.

```bash
npm install                # install deps (also runs `prisma generate`)
cp .env.example .env       # then fill in DATABASE_URL etc. — see docs/user-guide.md §1.2
npm run db:migrate         # apply migrations locally
npm run db:seed            # seed roles/permissions/demo content (idempotent)
npm run dev                # http://localhost:3000
npm run typecheck          # tsc --noEmit
npm run lint                # eslint .
npm test                    # vitest run
npm run test:e2e             # playwright test (needs `npx playwright install` once)
npm run build                 # production build
```

Run a single test: `npx vitest run <path>` or `npx playwright test <path>`. Full reference
(env vars, dev login accounts, every command): `docs/user-guide.md` §1.

## Architecture notes

Built. The data model (`prisma/schema.prisma`) maps directly to the Public website / Admin system
sections above, traceable back to the circular via `docs/compliance-matrix.md`. Every content
module shares one draft → review → publish state machine (`src/lib/content-workflow.ts`, rule 4)
and one audit writer (`src/lib/audit.ts`, rule 8). For what's actually implemented, how the
approval/compliance/grievance workflows work, and a field-level module reference, see
`docs/user-guide.md`; for the permission model, `docs/permission-matrix.md`; for the full ER
model, `docs/database-design.md`. `progress.md` has the phase-by-phase build history and current
gaps (`docs/user-guide.md` §5).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# PUBLIC DESIGN RULE:

1. The public website is a premium institutional experience, not an administration
portal.

2. Never default to "dashboard aesthetics" on public pages.

3. Avoid repetitive card grids, excessive rounded containers, heavy borders,
generic gradients, dense tables, and default component-library styling.

4. Prefer editorial layouts, strong typography, photography, whitespace,
visual hierarchy, sophisticated navigation, subtle motion, and varied section
composition.

5. The admin application may remain functional and utilitarian.