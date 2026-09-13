# Database Design

Explicit data model backing `docs/architecture.md`. Assumes a relational database (see
`docs/architecture.md` §0). No college-specific data is included — every example value below is a schema
definition, not real content (rule 1). All record-level content tables include `isPlaceholder BOOLEAN` so
seed/dev data can never be mistaken for verified content (rule 14).

Conventions used below: every table has `id` (primary key), `createdAt`, `updatedAt` unless noted; most
content tables carry `collegeId` (tenant-ready per `docs/architecture.md` §0).

## 1. Tenancy & identity

**College**
`id, name, type (govt_degree | private_degree | law | education), createdAt, updatedAt`
One row today; the schema does not assume a single row.

**User**
`id, collegeId, name, email (unique), passwordHash, mfaEnabled, status (active|suspended), lastLoginAt`

**Role**
`id, name (e.g. super_admin, principal, content_editor, approver, compliance_officer, grievance_officer,
auditor), description`

**Permission**
`id, key (e.g. faculty.create, faculty.publish, grievance.view, compliance.verify), description`

**RolePermission**
`roleId, permissionId` (composite key) — join table making permissions data-driven, not hard-coded
(`docs/architecture.md` §4).

**UserRole**
`userId, roleId, collegeId` (composite key) — a user's role(s), scoped per college for multi-tenant
readiness.

## 2. Generic content lifecycle (shared by every content module)

Two patterns are used across the schema:

**A. Freeform/document-like content** (Home, About, College Profile, History, Vision/Mission, Principal's
Message, custom "item 20" pages) uses one generic table:

**ContentItem**
`id, collegeId, moduleType (profile|history|vision_mission|principal_message|custom|...), slug, title,
body (JSON or rich text), status (draft|pending_review|approved|published|archived), currentVersionId,
authorId, reviewDueAt, isPlaceholder`

**ContentVersion**
`id, contentItemId, versionNumber, dataSnapshot (full JSON snapshot), editedBy, editedAt, changeSummary`
— every save creates a new version; `ContentItem.currentVersionId` points at the latest, and published
state always refers to a specific, immutable version (audit requirement, rule 8).

**B. Structured content** (Faculty, Programs, Notices, etc.) uses dedicated tables (below) but **every one
of them carries the same lifecycle columns**: `status (draft|pending_review|approved|published|archived)`,
`reviewDueAt`, `isPlaceholder`, `createdBy`, `updatedBy` — so the Approval workflow (§5) and Content
Review/Freshness (§12) logic in `docs/architecture.md` is uniform across modules rather than reimplemented
per table.

## 3. Structured domain tables

**Department** — `id, collegeId, name, description, status, isPlaceholder`

**Program** — `id, collegeId, departmentId, name, level, durationYears, affiliationId, status,
isPlaceholder` (circular item 6)

**Affiliation** — `id, collegeId, programId (nullable — a college-level affiliation may also exist),
universityName, affiliationNumber, regulatoryBody, approvalDocumentId, validFrom, validTo, status`
(circular items 6, 13)

**Faculty** — `id, collegeId, departmentId, name, designation, qualifications, subjectsTaught, photoId
(→ MediaAsset), status, isPlaceholder` (circular item 4)

**Staff** (non-teaching) — `id, collegeId, name, designation, status, isPlaceholder` (circular item 5)

**InfrastructureItem** — `id, collegeId, category (classroom|lab|library|computer_lab|moot_court|office|
sports|other), name, description, mediaIds (→ MediaAsset[]), status, isPlaceholder` (circular item 3)

**Notice** — `id, collegeId, title, body, category, publishDate, expiryDate, attachmentIds (→ Document[]),
status, isPlaceholder` (circular items 2, 10, 15)

**Event** — `id, collegeId, title, description, startDate, endDate, location, mediaIds, status,
isPlaceholder` (circular items 2, 14)

**Activity** (co-curricular/extra-curricular) — `id, collegeId, title, description, category, mediaIds,
status, isPlaceholder` (circular item 14)

**AdmissionCycle** — `id, collegeId, programId, academicYear, eligibilityCriteria, feeStructureDocId
(→ Document), scheduleDocId (→ Document), status, isPlaceholder` (circular item 8)

**EnrollmentStat** — `id, collegeId, programId, academicYear, sessionType, totalEnrolled, status`
(circular item 9)

**AcademicCalendarEvent** — `id, collegeId, title, startDate, endDate, category, status, isPlaceholder`
(circular item 7)

**Timetable** — `id, collegeId, programId, classGroup, effectiveFrom, documentId (→ Document) or
structuredSchedule (JSON), status, isPlaceholder` (circular item 7)

**Examination** — `id, collegeId, programId, examType, scheduleDocumentId (→ Document), noticeId
(→ Notice, nullable), status, isPlaceholder` (circular item 10)

**Result** — `id, collegeId, programId, examinationId, publishDate, documentId (→ Document) or externalLink,
isPublic, status` (circular item 10)

**Document** — `id, collegeId, category, title, fileUrl, mimeType, sizeBytes, version, uploadedBy,
uploadedAt, isPlaceholder` (shared by many modules; see `docs/architecture.md` §7)

**GalleryAlbum** — `id, collegeId, title, category, status`

**MediaAsset** — `id, collegeId, albumId (nullable), url, altText (required), caption, uploadedBy,
uploadedAt, isPlaceholder` (circular item 16; `altText` required to satisfy Accessibility, §13)

**Scholarship** — `id, collegeId, name, description, eligibility, documentId (→ Document), status,
isPlaceholder` (circular item 17)

**StudentSupportService** — `id, collegeId, name, description, contactInfo, status, isPlaceholder`
(circular item 17)

**RuleRegulation** — `id, collegeId, title, category, documentId (→ Document), status, isPlaceholder`
(circular item 18)

**ContactInfo** — `id, collegeId, type (phone|email|other), value, label, status` (circular item 11)

**LocationInfo** — `id, collegeId, address, latitude, longitude, mapEmbedUrl, status` (circular item 12)

## 4. Grievance system (private data — rule 6)

**Grievance** — `id, collegeId, submitterName (nullable — anonymous allowed), submitterContact (nullable,
encrypted at rest), category, description, attachmentIds (→ Document[]), status (new|in_review|resolved|
closed), assignedTo (→ User), createdAt, resolvedAt`
— **never** exposed through any public API route; access restricted to `grievance.view` permission holders
only (RBAC, §4). Enforced at the query layer, not just hidden in the UI.

**GrievanceNote** — `id, grievanceId, authorId, note, createdAt` — internal-only case notes, never shown to
the submitter or the public.

## 5. Approval workflow

**ApprovalRequest** — `id, entityType (references any content table above), entityId, requestedBy,
requestedAt, approverId (nullable until decided), status (pending|approved|rejected), decidedAt, comments`
— generic across all modules so the same workflow code path serves every content type
(`docs/architecture.md` §5). A `status=approved` decision is what flips the referenced entity's `status`
to `published`; nothing else may do so.

## 6. Audit logging

**AuditLog** — `id, actorId, action (create|update|delete|publish|approve|reject|login|role_change|...),
entityType, entityId, beforeSnapshot (JSON, nullable), afterSnapshot (JSON, nullable), ipAddress,
createdAt`
— append-only; no update/delete endpoint exists for this table (`docs/architecture.md` §6). Every row in
every table above that has a `status` column produces an `AuditLog` entry on every status transition.

## 7. Notifications

**Notification** — `id, userId, type, message, relatedEntityType, relatedEntityId, read (boolean),
createdAt` — derived/triggered from the same events that write `AuditLog`, never itself a source of truth
for entity state (`docs/architecture.md` §11).

## 8. Content review / freshness

**ContentReviewSchedule** — `id, entityType, entityId, reviewFrequencyDays, lastReviewedAt, nextReviewDueAt,
assignedReviewerId`
— alternative to storing `reviewDueAt` directly on every table when a module needs a distinct reviewer
assignment separate from its author; either approach is acceptable per module, but one must be chosen
consistently at implementation time.

## 9. The compliance model (explicit)

This is the data model behind `docs/compliance-matrix.md` and the Compliance Dashboard
(`docs/architecture.md` §10).

**ComplianceRequirement** (seeded once from the circular; not editable by normal admin users)
`id, itemNumber (1–20, or a governance-item code), description, circularReference
("I.C/SALU/KHP/-662, 04.09.2026")`
— one row per circular requirement (20 content rows + governance rows), acting as the fixed checklist
against which every college is measured.

**ComplianceItem** (per college, per requirement)
`id, collegeId, requirementId (→ ComplianceRequirement), status (not_started|in_progress|
submitted_for_review|verified|rejected), ownerId (→ User, typically the Principal or delegated owner),
evidenceRefs (list of {entityType, entityId} pointing at the ContentItem/records satisfying this
requirement), verifiedBy (→ User, nullable), verifiedAt (nullable), rejectionReason (nullable)`

Rules encoded around this table (matching `docs/requirements.md` §4 and rule 7):

- `status` can only become `verified` through an explicit action by a user holding the
  `compliance.verify` permission (Principal or Compliance Officer) — never derived automatically from
  "at least one evidence record exists." Existence of evidence is a precondition the UI can check, but the
  transition itself is a human decision, recorded with `verifiedBy`/`verifiedAt` (audit-backed via
  `AuditLog`).
- `evidenceRefs` must point at records whose own `status = published` — a `ComplianceItem` cannot be marked
  `verified` while its evidence is still in draft, tying this model directly to the shared content
  lifecycle in §2.
- A college's overall launch-readiness = `COUNT(ComplianceItem WHERE status='verified') = COUNT(*
  ComplianceRequirement)` for that college — i.e. all 20 (+ governance) items verified.

**ComplianceReportExport** (generated artifact, not necessarily a persisted table — may instead be a
generated document + a log entry)
`id, collegeId, generatedAt, generatedBy, snapshotOfComplianceItems (JSON), websiteUrl, submittedAt
(nullable)`
— represents the report + live URL submitted to the Office of the Inspector of Colleges. Recording
`submittedAt` closes the loop on the circular's explicit reporting requirement.

## 10. Relationship overview (textual ER summary)

```
College 1---* User
College 1---* Department 1---* Program *---1 Affiliation
College 1---* Faculty (→ Department)
College 1---* Staff
College 1---* InfrastructureItem
College 1---* Notice / Event / Activity
College 1---* AdmissionCycle (→ Program) 1---* EnrollmentStat
College 1---* AcademicCalendarEvent
College 1---* Timetable (→ Program)
College 1---* Examination (→ Program) 1---* Result
College 1---* Document *---* (referenced by many modules)
College 1---* GalleryAlbum 1---* MediaAsset
College 1---* Scholarship / StudentSupportService
College 1---* RuleRegulation
College 1---* ContactInfo / LocationInfo
College 1---* Grievance 1---* GrievanceNote
College 1---* ContentItem 1---* ContentVersion

Any content table ---1 ApprovalRequest (per pending change)
Any content table ---* AuditLog (per state transition)
Any content table ---1 ContentReviewSchedule (freshness tracking)

ComplianceRequirement 1---* ComplianceItem *---1 College
ComplianceItem *---* (ContentItem | Faculty | Program | ... via evidenceRefs)
ComplianceItem 1---* ComplianceReportExport (via snapshot, not a hard FK)

User *---* Role (via UserRole, scoped per College)
Role *---* Permission (via RolePermission)
```

## 11. Cross-references

- Module ownership per table: `docs/compliance-matrix.md`
- Architectural rationale for each subsystem: `docs/architecture.md`
- Build order for this schema: `docs/implementation-plan.md`
