---
name: compliance
description: Use when touching anything related to the 20 mandatory circular content requirements, the ComplianceRequirement/ComplianceItem lifecycle, the Compliance Dashboard, or a compliance report/export — ensures work stays traceable to the SALU circular and never auto-verifies.
---

# Compliance skill

## Purpose

This project exists to satisfy one external document: the SALU Khairpur circular
(`docs/cirucular-img1.jpeg`, `docs/circular-img2.jpeg`, indexed in `docs/requirements.md`).
Every content feature and every compliance-module change must be traceable back to a
specific circular item. This skill keeps that traceability intact and keeps
"duly verified" meaning what the circular says it means: a human decision, not a system
default.

## When it applies

- Any change touching `src/lib/compliance.ts`, `src/lib/compliance-workflow.ts`,
  `src/app/admin/compliance/**`, `ComplianceRequirement`, `ComplianceItem`,
  `ComplianceEvidence`, `ComplianceVerification`, or `ComplianceStatus`/`VerificationDecision`.
- Any change to `docs/requirements.md`, `docs/compliance-matrix.md`, or the Compliance
  Dashboard UI.
- Any time a new content type, admin module, or public page is added — check whether it
  maps to one of the 20 items and whether `docs/compliance-matrix.md` needs a row updated.
- Any work that touches the compliance report/export sent to the Office of the Inspector of
  Colleges.

## The 20 mandatory requirements (circular items 1–20)

Full text is in `docs/requirements.md` §2 — do not paraphrase from memory, re-read that file
before writing compliance-related code, since it is the authoritative extraction of the
circular and already separates circular text from derived engineering requirements.

| # | Item | # | Item |
|---|---|---|---|
| 1 | College profile, history, vision/mission, objectives | 11 | Contact details |
| 2 | Day-to-day academic/admin activities (notices, events, seminars, workshops) | 12 | Complete location + map link |
| 3 | Physical infrastructure | 13 | Regulatory/affiliation status |
| 4 | Faculty details | 14 | Co-curricular/extra-curricular activities |
| 5 | Non-teaching staff details | 15 | Notifications and announcements |
| 6 | Programs/degrees + affiliation status | 16 | Photo gallery |
| 7 | Class/program-wise timetable + academic calendar | 17 | Scholarships/financial assistance/student support |
| 8 | Admission info (notices, eligibility, fees, schedule) | 18 | Rules, regulations, policies |
| 9 | Total enrollment/admissions, program- and session-wise | 19 | Grievance mechanism |
| 10 | Examination/academic info (notices, results, announcements) | 20 | Any other required information (extensible) |

Plus governance requirements (circular page 2, `docs/requirements.md` §3): Principal is
personally accountable; content must be accurate/current/authentic and **duly verified by
competent authority before publication**; the site must be regularly updated; launch is due
within 1 month of the circular date; a compliance report + live URL must go to the Inspector
of Colleges.

## Project rules

1. **Never invent official college information** while building or seeding compliance data
   (CLAUDE.md rule 1). Requirement titles/descriptions/`circularReference` come from the
   circular; actual evidence content comes from real college records or an explicit
   placeholder (rule 13/14).
2. **No auto-verification, ever** (CLAUDE.md rule 7). A `ComplianceRequirement.status` may
   only reach `VERIFIED` through the `verify` action in `src/lib/compliance-workflow.ts`,
   performed by a human holding `compliance:verify` (Principal/Administrator/Super Admin —
   see `docs/permission-matrix.md`). `NOT_STARTED`/`IN_PROGRESS` are the only statuses the
   system may set automatically (e.g. via `syncAutomaticStatus`).
3. **Every verify/request_update writes an append-only `ComplianceVerification` row**
   (CLAUDE.md rule 8) — who decided, when, and the decision (`VerificationDecision`:
   `VERIFIED` | `NEEDS_UPDATE`). Never mutate or delete these rows.
4. **`request_update` and `mark_not_applicable` require a non-empty reason** — see
   `REASON_REQUIRED_ACTIONS` in `src/lib/compliance-workflow.ts`. Don't let a form or action
   skip this.
5. **Keep `docs/compliance-matrix.md` and `docs/requirements.md` in sync with the code.** If
   a requirement's owning module, entities, or responsible role changes, update the matrix
   row — CLAUDE.md rule 15.
6. **`tests.json` must stay in sync** with compliance coverage — never remove an entry to
   hide missing/failing coverage (CLAUDE.md rules 10, 15).

## Implementation rules

- Use the exact lifecycle from `src/lib/compliance-workflow.ts`:
  `NOT_STARTED ↔ IN_PROGRESS → READY_FOR_REVIEW → VERIFIED`, with `NEEDS_UPDATE` reachable
  from either `READY_FOR_REVIEW` or `VERIFIED`, and `NOT_APPLICABLE` reachable from
  `NOT_STARTED`/`IN_PROGRESS` (reopen returns to `NOT_STARTED`). Do not invent new statuses
  or shortcut transitions — extend `COMPLIANCE_ACTIONS`/`WORKFLOW_TRANSITIONS`-style tables
  rather than branching ad hoc in a Server Action.
- `submit_for_review` is the only compliance action gated on `compliance:view`
  (`VIEW_PERMISSION_ACTIONS`); every other action requires `compliance:verify`. Don't widen
  that set without updating `docs/permission-matrix.md` to match.
- A `ComplianceRequirement` row is seeded per college, one per circular item (1–20) plus
  governance items — `itemNumber`, `category: ComplianceCategory`, `circularReference` should
  map straight back to the requirements table above. When adding item 20-style "any other
  information" entries, still cite the circular clause in `circularReference`.
- New admin modules or public pages for an existing requirement should link back to it via
  the entities listed in `docs/compliance-matrix.md` (e.g. a new content type under item 1's
  `ContentItem` family) rather than creating an untracked parallel structure.
- The Compliance Dashboard is a read/aggregate view over `ComplianceRequirement`/
  `ComplianceItem` rows — don't give it its own separate source of truth for status.

## Validation checklist

- [ ] Change maps to a specific numbered circular item or governance requirement — cite it.
- [ ] `docs/compliance-matrix.md` row updated if the owning module/entities/role changed.
- [ ] No code path sets `ComplianceStatus.VERIFIED` except the `verify` action gated on
      `compliance:verify`.
- [ ] `request_update` / `mark_not_applicable` reject empty reasons.
- [ ] A `ComplianceVerification` row is written on every `verify`/`request_update`.
- [ ] No fabricated institutional facts introduced; placeholders are explicitly marked
      (`isPlaceholder`, `[PLACEHOLDER]`, etc.).
- [ ] `tests.json` updated if compliance test coverage changed.

## Common mistakes

- Adding a "quick approve" path that flips status to `VERIFIED` without going through
  `compliance:verify` and a `ComplianceVerification` row — this silently violates rule 7.
- Letting an owner both submit and verify their own requirement — verification is meant for
  Principal/Administrator/Super Admin, distinct from whoever is progressing the item day to
  day.
- Treating `docs/compliance-matrix.md` as historical documentation instead of a live
  contract — it must move when the code moves.
- Filling seed/demo compliance evidence with realistic-sounding but fabricated college facts
  instead of clearly marked placeholders.
- Forgetting item 20 ("any other information") is open-ended by design — don't assume the
  20-item list is closed when a college or the university adds something new.
