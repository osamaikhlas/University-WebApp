# Requirements

Source: `docs/cirucular-img1.jpeg`, `docs/circular-img2.jpeg` (Shah Abdul Latif University, Khairpur —
Office of the Inspector of Colleges, Circular No. I.C/SALU/KHP/-662, dated 04.09.2026, Subject:
*"Establishment and Launch of Official Websites of Affiliated Colleges"*, per Syndicate Resolution
No. Syn-93,19) and `docs/source/README.md`.

This document extracts what the circular actually requires and separates it from engineering requirements
derived from `CLAUDE.md`. No institutional facts (names, fees, dates, staff, etc.) are invented anywhere in
this document — see `CLAUDE.md` rule 1.

## 1. Scope and applicability

- Applies to all Government Degree Colleges, Private Degree Colleges, Law Colleges, and Education Colleges
  affiliated with Shah Abdul Latif University (SALU), Khairpur.
- Each affiliated college must establish and launch **its own official website** within **one (1) month**
  of the circular's issuance.
- Purpose stated in the circular: transparency, accessibility of academic information, digital presence,
  and effective dissemination of information about the college's academic and administrative activities.

## 2. The 20 mandatory content requirements

The circular requires the official website to contain, at minimum, the following 20 items:

| # | Circular requirement (as stated) |
|---|---|
| 1 | College Profile and Introduction, including history, vision, mission and objectives. |
| 2 | Day-to-day Academic and Administrative Activities, including important notices, events, seminars, workshops and other activities. |
| 3 | Physical Infrastructure Details, including classrooms, laboratories, libraries, computer labs, moot court room where applicable, offices, sports facilities and other available facilities. |
| 4 | Faculty Details, including names, designations, qualifications, subjects taught and relevant academic information. |
| 5 | Non-Teaching Staff Details, including names and designations. |
| 6 | Programs/Degrees Offered by the College and their affiliation/approval status. |
| 7 | Class-wise/Program-wise Timetable and academic calendar, wherever applicable. |
| 8 | Admission Information, including admission notices, eligibility criteria, fee structure, admission schedule and other relevant information. |
| 9 | Total Student Enrollment/Admissions, preferably program-wise and session-wise. |
| 10 | Examination and Academic Information, including examination notices, results-related information and important academic announcements. |
| 11 | Contact Details of the College, including telephone numbers, official email address and other relevant communication channels. |
| 12 | Complete College Location, including postal address and Google Maps/location link. |
| 13 | Regulatory and Affiliation Status, including affiliation with Shah Abdul Latif University and relevant recognition/approval details of the competent regulatory authorities, where applicable. |
| 14 | Co-curricular and Extra-Curricular Activities, including sports, debates, literary activities, societies, competitions, cultural programs, seminars, workshops and other student activities. |
| 15 | College Notifications and Announcements for timely dissemination of important information. |
| 16 | Photographs/Gallery of academic, administrative, co-curricular and extra-curricular activities. |
| 17 | Scholarships, Financial Assistance and Student Support Services, where applicable. |
| 18 | College Rules, Regulations and Policies relevant to students and staff. |
| 19 | Official Contact/Grievance Mechanism for students and other stakeholders. |
| 20 | Any other information considered necessary by the College or required by Shah Abdul Latif University, Khairpur or the relevant regulatory authorities. |

## 3. Governance requirements (circular, page 2)

Beyond the 20 content items, the circular imposes process/governance obligations that are themselves
system requirements:

- **Accountability**: the Principal/Head of each affiliated college is *personally responsible* for
  establishing, launching, and regularly updating the official website.
- **Accuracy and verification**: information displayed must be accurate, current, authentic, and *duly
  verified by the competent authority of the college* before publication.
- **Currency/freshness**: the website must be regularly updated, particularly regarding admissions,
  academic activities, timetable, faculty/staff, notices, examinations, events, infrastructure, and
  student-related information.
- **Timeline**: establishment and launch within one (1) month of the circular date; strict compliance
  required.
- **Compliance reporting**: a compliance report, together with the live website URL/link, must be
  submitted to the Office of the Inspector of Colleges immediately after launch and within the prescribed
  period.
- **Distribution**: the circular is copied to the Vice Chancellor, Registrar, Controller of Examinations,
  Director Finance, and all Principals/Heads of affiliated Government Degree, Private Degree, Law, and
  Education Colleges — indicating multiple stakeholder levels may need visibility into compliance status.
- Explicitly flagged **MOST URGENT**, to be complied with "in letter and spirit."

## 4. Derived engineering requirements (from `CLAUDE.md` non-negotiable rules)

These are not circular text but system-design obligations that follow from the project's non-negotiable
rules, and shape the architecture:

- **Content management, not hard-coding**: all 20 content categories must be stored as editable data in a
  CMS/database, never hard-coded into templates or components (rules 2, 3).
- **Draft vs. published separation**: content must be authored/edited privately and only exposed publicly
  once explicitly published (rule 4) — this directly implements the circular's "duly verified" requirement.
- **Role-based access and server-side authorization**: since the Principal is personally accountable but
  content will realistically be entered by delegated staff, the system needs role-based access control
  enforced server-side, not just hidden in the UI (rule 5).
- **Confidential grievance handling**: the Grievance Mechanism (item 19) must keep submitter data private
  from the public website (rule 6).
- **Human-gated compliance verification**: the "duly verified by competent authority" clause and the
  compliance-report submission requirement must be modeled as an explicit human approval step, never an
  automated status flip (rule 7).
- **Audit trail**: every change to official content, every approval/rejection, and every compliance
  verification must be attributable and traceable (rule 8).
- **Testing discipline**: important functionality (especially authorization, publication gating, and
  grievance confidentiality) requires tests that are never weakened to force a pass (rules 9, 10).
- **No invented content, explicit placeholders**: until real college data is supplied, all 20 categories
  must render with clearly marked placeholder content rather than fabricated facts (rules 1, 13, 14).

## 5. Out of scope for now

- Actual institutional content for any of the 20 categories (must come from the college; see
  `CLAUDE.md` rule 1).
- Final confirmation of: which specific college this is for (or whether the system is a reusable
  multi-college template), the technology stack, hosting/budget, and required languages. These are tracked
  as open questions in `progress.md`.

## 6. Traceability

Every one of the 20 circular items, plus the governance requirements, is mapped to a concrete software
module in `docs/compliance-matrix.md`, and further mapped to database entities in
`docs/database-design.md`. The architecture in `docs/architecture.md` is organized so that each of these
requirements has an identifiable owning module.
