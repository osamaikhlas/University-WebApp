# Compliance Matrix

Traceability from each circular requirement (`docs/requirements.md`) to the owning software module,
database entities (`docs/database-design.md`), responsible role, and the field(s) used to prove/verify
compliance. This is the artifact that ultimately backs the **Compliance Dashboard** (`docs/architecture.md`
§10) and the compliance report submitted to the Inspector of Colleges.

## 1. Content requirements (circular items 1–20)

| # | Circular requirement | Public site section(s) | Admin module | Core data entities | Responsible role(s) | Verified by |
|---|---|---|---|---|---|---|
| 1 | College Profile, history, vision/mission, objectives | College Profile, History, Vision/Mission, Principal's Message | CMS | `ContentItem` (type=profile/history/vision_mission/principal_message) | Content Editor drafts; Principal/Approver verifies | `ComplianceItem` linked to these `ContentItem` IDs |
| 2 | Day-to-day academic/admin activities (notices, events, seminars, workshops) | Notices, Events, Activities | Notices, Events | `Notice`, `Event`, `Activity` | Content Editor; Approver | `ComplianceItem` (>=1 published Notice/Event in review window) |
| 3 | Physical infrastructure | Infrastructure | CMS (Infrastructure) | `InfrastructureItem` | Content Editor; Approver | `ComplianceItem` linked to InfrastructureItem set |
| 4 | Faculty details | Faculty | Faculty | `Faculty`, `Department` | Department/HR data entry; Approver | `ComplianceItem` (Faculty records exist per department) |
| 5 | Non-teaching staff details | Non-teaching Staff | Staff | `Staff` | HR data entry; Approver | `ComplianceItem` |
| 6 | Programs/degrees + affiliation/approval status | Programs | Programs | `Program`, `Affiliation` | Registrar office; Approver | `ComplianceItem` (each Program linked to an Affiliation record) |
| 7 | Class/program-wise timetable and academic calendar | Timetable, Academic Calendar | Timetables, Academic Calendar | `Timetable`, `AcademicCalendarEvent` | Registrar/Exams office; Approver | `ComplianceItem` |
| 8 | Admission info (notices, eligibility, fees, schedule) | Admissions | Admissions | `AdmissionCycle`, `Document` (fee structure) | Admissions office; Approver | `ComplianceItem` |
| 9 | Total enrollment/admissions, program- and session-wise | Admissions (stats) | Admissions | `EnrollmentStat` | Registrar office; Approver | `ComplianceItem` |
| 10 | Examination/academic info (notices, results, announcements) | Examinations, Results, Notices | Exams, Results, Notices | `Examination`, `Result`, `Notice` | Controller of Examinations office; Approver | `ComplianceItem` |
| 11 | Contact details | Contact | CMS (Contact) | `ContactInfo` | Admin office; Approver | `ComplianceItem` |
| 12 | Complete location + map link | Location | CMS (Location) | `LocationInfo` | Admin office; Approver | `ComplianceItem` |
| 13 | Regulatory/affiliation status | Affiliation | Programs (Affiliation) | `Affiliation` | Registrar office; Approver | `ComplianceItem` |
| 14 | Co-curricular/extra-curricular activities | Activities | Events/Activities | `Activity` | Student affairs office; Approver | `ComplianceItem` |
| 15 | Notifications and announcements | Notices | Notices | `Notice` | Content Editor; Approver | `ComplianceItem` |
| 16 | Photo gallery | Gallery | Gallery | `GalleryAlbum`, `MediaAsset` | Content Editor; Approver | `ComplianceItem` |
| 17 | Scholarships/financial assistance/student support | Scholarships, Student Support | Scholarships, Student Support | `Scholarship`, `StudentSupportService` | Student affairs office; Approver | `ComplianceItem` |
| 18 | Rules, regulations, policies | Rules and Regulations | Documents | `RuleRegulation`, `Document` | Admin office; Approver | `ComplianceItem` |
| 19 | Grievance mechanism | Grievance | Grievances | `Grievance`, `GrievanceNote` | Grievance Officer; Principal (escalation) | `ComplianceItem` (mechanism exists and is reachable; confidentiality enforced) |
| 20 | Any other required information | (extensible) Custom Pages | CMS (generic content type) | `ContentItem` (type=custom) | Content Editor; Approver | `ComplianceItem` (open-ended, reviewed case by case) |

## 2. Governance requirements (circular, page 2)

| Requirement | System mechanism | Data entities | Verified by |
|---|---|---|---|
| Principal personally responsible for launch/updates | Ownership field on College/ComplianceItem records; Principal role in RBAC | `College`, `Role`, `ComplianceItem.ownerId` | N/A (organizational, reflected in data ownership) |
| Content must be accurate, current, authentic, duly verified | Draft → Pending Review → Approved → Published lifecycle; no auto-publish | `ContentItem.status`, `ApprovalRequest` | Approver role (human) |
| Website regularly updated (admissions, academics, timetable, faculty/staff, notices, exams, events, infrastructure, student info) | Content Review/Freshness module: `reviewDueAt` per content item, stale-content alerts | `ContentReviewSchedule` | Assigned reviewer; surfaced on Compliance Dashboard |
| Launch within 1 month; strict compliance | Compliance Dashboard tracks per-item status against the 20 requirements + an overall launch-readiness view | `ComplianceRequirement`, `ComplianceItem` | Principal/Compliance Officer |
| Compliance report + URL submitted to Inspector of Colleges | Compliance Dashboard exports a compliance report (status of all 20 items + live URL) | `ComplianceItem`, `ComplianceReportExport` (generated, not a stored table — see `database-design.md`) | Principal (signs off before submission) |
| MOST URGENT / strict compliance in letter and spirit | Prioritization only — no distinct system mechanism | — | — |

## 3. Compliance status lifecycle (per requirement item)

Each of the 20 requirements has one `ComplianceItem` row (per college) that moves through:

```
not_started -> in_progress -> submitted_for_review -> verified
                                      |
                                      v
                                  rejected -> in_progress (loop back)
```

- `not_started` — no `ContentItem`/entity exists yet for this requirement.
- `in_progress` — data entry underway (draft content exists, unpublished).
- `submitted_for_review` — editor has requested approval (`ApprovalRequest` created).
- `verified` — a human Approver/Principal has approved; linked content is published; `verifiedBy` and
  `verifiedAt` are recorded (this is the "duly verified" state the circular requires).
- `rejected` — sent back with comments; returns to `in_progress`.

The **Compliance Dashboard** (`docs/architecture.md` §10) is simply an aggregate view over
`ComplianceItem` rows against the 20 seeded `ComplianceRequirement` rows, plus the freshness state from
`ContentReviewSchedule`. A college is "launch ready" when all 20 items are `verified` and no required item
is past its review due date.

## 4. Test coverage cross-reference

Every row above corresponds to one or more entries in `tests.json` (`public_website` and `admin_system`
areas). `tests.json` must stay in sync with this matrix: if a requirement's owning module changes here, its
test entry's `notes` should be updated to match (see `CLAUDE.md` rule 15).
