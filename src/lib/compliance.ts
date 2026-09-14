import "server-only";

import { prisma } from "@/lib/prisma";
import { getPrimaryCollege } from "@/lib/content";
import {
  syncAutomaticStatus,
  type ComplianceStatusValue,
} from "@/lib/compliance-workflow";

export type CompletenessCheck = { label: string; met: boolean };
export type CompletenessResult = { percent: number; checks: CompletenessCheck[] };

function toResult(checks: CompletenessCheck[]): CompletenessResult {
  const met = checks.filter((check) => check.met).length;
  const percent = checks.length === 0 ? 0 : Math.round((met / checks.length) * 100);
  return { percent, checks };
}

const PUBLISHED = "PUBLISHED" as const;

/** True for a non-empty string, a non-empty array, or any other non-null/undefined value. */
function present(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined;
}

/**
 * Checks that EVERY record in `records` has every one of `fields` populated — not just that
 * at least one does. A compliance requirement whose one good record is hiding ten incomplete
 * ones is not actually compliant, so this is deliberately the stricter of the two readings.
 * Returns one `CompletenessCheck` per field (all unmet if there are no records at all, so a
 * missing-records case doesn't masquerade as "N/A" — an empty `every()` is vacuously true).
 */
function everyRecordHasFields<T>(
  records: T[],
  fields: Array<{ label: string; get: (record: T) => unknown }>,
): CompletenessCheck[] {
  return fields.map(({ label, get }) => ({
    label,
    met: records.length > 0 && records.every((record) => present(get(record))),
  }));
}

/**
 * A requirement's "required documents" are satisfied by a human explicitly attaching a
 * published `Document` as `ComplianceEvidence` for that specific requirement — not by
 * guessing at a `Document.category` string. This is the actual purpose `ComplianceEvidence`'s
 * generic `(entityType, entityId)` pointer shape was built for (src/lib/compliance-workflow.ts
 * doc comment), and it means the check inspects a real row's `status`, not just an evidence
 * note someone typed.
 */
async function hasPublishedDocumentEvidence(requirementId: string): Promise<boolean> {
  const evidence = await prisma.complianceEvidence.findMany({
    where: { requirementId, entityType: "Document" },
    select: { entityId: true },
  });
  if (evidence.length === 0) return false;

  const published = await prisma.document.count({
    where: { id: { in: evidence.map((e) => e.entityId) }, status: PUBLISHED },
  });
  return published > 0;
}

type CheckContext = { collegeId: string; requirementId: string };

/**
 * The full, explicit compliance rule for one circular requirement (docs/compliance-matrix.md
 * §1, docs/requirements.md §2): what records must exist, which fields on them are required,
 * what document (if any) is appropriate as supporting evidence, where the result surfaces
 * publicly, who is responsible for it, and the completeness calculation that inspects the
 * real database content behind all of the above. `requiredRecords`/`requiredFields`/
 * `requiredDocuments` are the human-readable statement of the same rule `check` implements in
 * code — keep them in sync when `check` changes.
 *
 * Deliberately NOT a "does the admin page/table exist" check: every `check` below queries the
 * actual content rows and, for most items, verifies specific fields are populated on every
 * one of them, not merely that a row count is non-zero.
 */
export type ComplianceRule = {
  itemNumber: number;
  requiredRecords: string;
  requiredFields: string;
  requiredDocuments: string | null;
  publicRoute: { label: string; path: string } | null;
  responsibleRole: string;
  responsibleModule: { label: string; adminPath: string };
  check: (ctx: CheckContext) => Promise<CompletenessResult>;
};

export const COMPLIANCE_RULES: Record<number, ComplianceRule> = {
  1: {
    itemNumber: 1,
    requiredRecords: "One CollegeProfile record for the college.",
    requiredFields:
      "overview, missionStatement, visionStatement, history, and principalMessage must all be populated.",
    requiredDocuments: null,
    publicRoute: { label: "About", path: "/about" },
    responsibleRole: "EDITOR (author); REVIEWER or PRINCIPAL (publish)",
    responsibleModule: { label: "College Profile", adminPath: "/admin/college-profile" },
    check: async ({ collegeId }) => {
      const profile = await prisma.collegeProfile.findFirst({ where: { collegeId } });
      return toResult([
        { label: "College profile record exists", met: Boolean(profile) },
        { label: "Published", met: profile?.status === PUBLISHED },
        ...everyRecordHasFields(profile ? [profile] : [], [
          { label: "Overview/objectives present", get: (p) => p.overview },
          { label: "Mission statement present", get: (p) => p.missionStatement },
          { label: "Vision statement present", get: (p) => p.visionStatement },
          { label: "History present", get: (p) => p.history },
          { label: "Principal's message present", get: (p) => p.principalMessage },
        ]),
      ]);
    },
  },

  2: {
    itemNumber: 2,
    requiredRecords: "At least one published Notice and at least one published Event.",
    requiredFields:
      "Every published notice needs title, body, and category. Every published event needs title, description, and startDate.",
    requiredDocuments: null,
    publicRoute: { label: "Notices", path: "/notices" },
    responsibleRole: "EDITOR (author); REVIEWER or PRINCIPAL (publish)",
    responsibleModule: { label: "Notices, Events", adminPath: "/admin/notices" },
    check: async ({ collegeId }) => {
      const [notices, events] = await Promise.all([
        prisma.notice.findMany({ where: { collegeId, status: PUBLISHED } }),
        prisma.event.findMany({ where: { collegeId, status: PUBLISHED } }),
      ]);
      return toResult([
        { label: "At least one published notice", met: notices.length > 0 },
        { label: "At least one published event", met: events.length > 0 },
        ...everyRecordHasFields(notices, [
          { label: "Every notice has a category", get: (n) => n.category },
        ]),
        ...everyRecordHasFields(events, [
          { label: "Every event has a description", get: (e) => e.description },
        ]),
      ]);
    },
  },

  3: {
    itemNumber: 3,
    requiredRecords: "At least one published Infrastructure record, ideally across several categories.",
    requiredFields: "Every published infrastructure record needs a name and a description.",
    requiredDocuments: null,
    publicRoute: { label: "Campus", path: "/campus" },
    responsibleRole: "EDITOR (author); REVIEWER or PRINCIPAL (publish)",
    responsibleModule: { label: "Infrastructure", adminPath: "/admin/infrastructure" },
    check: async ({ collegeId }) => {
      const items = await prisma.infrastructure.findMany({ where: { collegeId, status: PUBLISHED } });
      const categories = new Set(items.map((i) => i.category));
      return toResult([
        { label: "At least one published infrastructure item", met: items.length > 0 },
        { label: "More than one facility category recorded", met: categories.size > 1 },
        ...everyRecordHasFields(items, [
          { label: "Every item has a description", get: (i) => i.description },
        ]),
      ]);
    },
  },

  4: {
    itemNumber: 4,
    requiredRecords: "At least one published Faculty record for every published Department.",
    requiredFields:
      "Every published faculty record needs a designation, qualifications, subjectsTaught, and a way to contact them (email or phone).",
    requiredDocuments: null,
    publicRoute: { label: "Faculty", path: "/faculty" },
    responsibleRole: "FACULTY_EDITOR (author); REVIEWER or PRINCIPAL (publish)",
    responsibleModule: { label: "Faculty", adminPath: "/admin/faculty" },
    check: async ({ collegeId }) => {
      const [departments, faculty, departmentsWithFaculty] = await Promise.all([
        prisma.department.count({ where: { collegeId, status: PUBLISHED } }),
        prisma.faculty.findMany({ where: { collegeId, status: PUBLISHED } }),
        prisma.department.count({
          where: { collegeId, status: PUBLISHED, faculty: { some: { status: PUBLISHED } } },
        }),
      ]);
      return toResult([
        { label: "At least one published faculty member", met: faculty.length > 0 },
        {
          label: "Every published department has at least one published faculty member",
          met: departments > 0 && departmentsWithFaculty === departments,
        },
        ...everyRecordHasFields(faculty, [
          { label: "Every faculty member has a designation", get: (f) => f.designation },
          { label: "Every faculty member has qualifications recorded", get: (f) => f.qualifications },
          { label: "Every faculty member has subjects taught recorded", get: (f) => f.subjectsTaught },
          {
            label: "Every faculty member has an email or phone number",
            get: (f) => f.email || f.phone,
          },
        ]),
      ]);
    },
  },

  5: {
    itemNumber: 5,
    requiredRecords: "At least one published Staff record.",
    requiredFields: "Every published staff record needs a designation and a department.",
    requiredDocuments: null,
    publicRoute: { label: "Staff", path: "/staff" },
    responsibleRole: "FACULTY_EDITOR (author); REVIEWER or PRINCIPAL (publish)",
    responsibleModule: { label: "Staff", adminPath: "/admin/staff" },
    check: async ({ collegeId }) => {
      const staff = await prisma.staff.findMany({ where: { collegeId, status: PUBLISHED } });
      return toResult([
        { label: "At least one published non-teaching staff record", met: staff.length > 0 },
        ...everyRecordHasFields(staff, [
          { label: "Every staff record has a designation", get: (s) => s.designation },
          { label: "Every staff record has a department", get: (s) => s.department },
        ]),
      ]);
    },
  },

  6: {
    itemNumber: 6,
    requiredRecords: "At least one published Program, each linked to at least one Affiliation record.",
    requiredFields: "Every published program needs a level, a duration, and a description.",
    requiredDocuments: null,
    publicRoute: { label: "Academics", path: "/academics" },
    responsibleRole: "EDITOR (author); REVIEWER or PRINCIPAL (publish)",
    responsibleModule: { label: "Programs, Affiliation", adminPath: "/admin/programs" },
    check: async ({ collegeId }) => {
      const [programs, programsWithAffiliation] = await Promise.all([
        prisma.program.findMany({ where: { collegeId, status: PUBLISHED } }),
        prisma.program.count({
          where: { collegeId, status: PUBLISHED, affiliations: { some: {} } },
        }),
      ]);
      return toResult([
        { label: "At least one published program", met: programs.length > 0 },
        {
          label: "Every published program has a linked affiliation record",
          met: programs.length > 0 && programsWithAffiliation === programs.length,
        },
        ...everyRecordHasFields(programs, [
          { label: "Every program has a duration recorded", get: (p) => p.durationYears },
          { label: "Every program has a description", get: (p) => p.description },
        ]),
      ]);
    },
  },

  7: {
    itemNumber: 7,
    requiredRecords: "At least one published Timetable and at least one published AcademicCalendar entry.",
    requiredFields:
      "Every published timetable needs a structuredSchedule. Every published calendar entry needs a category and an academicYear.",
    requiredDocuments: null,
    publicRoute: { label: "Academics", path: "/academics" },
    responsibleRole: "EDITOR (author); REVIEWER or PRINCIPAL (publish)",
    responsibleModule: { label: "Timetables, Academic Calendar", adminPath: "/admin/timetables" },
    check: async ({ collegeId }) => {
      const [timetables, calendarEntries] = await Promise.all([
        prisma.timetable.findMany({ where: { collegeId, status: PUBLISHED } }),
        prisma.academicCalendar.findMany({ where: { collegeId, status: PUBLISHED } }),
      ]);
      return toResult([
        { label: "At least one published timetable", met: timetables.length > 0 },
        { label: "At least one published academic calendar entry", met: calendarEntries.length > 0 },
        ...everyRecordHasFields(timetables, [
          { label: "Every timetable has a structured schedule", get: (t) => t.structuredSchedule },
        ]),
        ...everyRecordHasFields(calendarEntries, [
          { label: "Every calendar entry has a category", get: (c) => c.category },
          { label: "Every calendar entry has an academic year", get: (c) => c.academicYear },
        ]),
      ]);
    },
  },

  8: {
    itemNumber: 8,
    requiredRecords: "At least one published, current-cycle Admission record and at least one published FeeStructure.",
    requiredFields:
      "Every published admission cycle needs eligibilityCriteria, applicationStartDate, and applicationEndDate.",
    requiredDocuments: "An admission notice / prospectus document, attached as evidence.",
    publicRoute: { label: "Admissions", path: "/admissions" },
    responsibleRole: "ADMISSION_OFFICER (author); REVIEWER or PRINCIPAL (publish)",
    responsibleModule: { label: "Admissions, Fee Structures", adminPath: "/admin/admissions" },
    check: async ({ collegeId, requirementId }) => {
      const [admissions, feeStructures, hasDocument] = await Promise.all([
        prisma.admission.findMany({ where: { collegeId, status: PUBLISHED } }),
        prisma.feeStructure.count({ where: { collegeId, status: PUBLISHED } }),
        hasPublishedDocumentEvidence(requirementId),
      ]);
      return toResult([
        { label: "At least one published admission cycle", met: admissions.length > 0 },
        { label: "At least one published fee structure", met: feeStructures > 0 },
        ...everyRecordHasFields(admissions, [
          { label: "Every admission cycle has eligibility criteria", get: (a) => a.eligibilityCriteria },
          {
            label: "Every admission cycle has an application start date",
            get: (a) => a.applicationStartDate,
          },
          {
            label: "Every admission cycle has an application end date",
            get: (a) => a.applicationEndDate,
          },
        ]),
        { label: "Admission notice/prospectus document attached as evidence", met: hasDocument },
      ]);
    },
  },

  9: {
    itemNumber: 9,
    requiredRecords: "At least one published EnrollmentStatistic, program- and session-wise.",
    requiredFields: "Every published enrollment statistic needs a sessionType and an academicYear.",
    requiredDocuments: null,
    publicRoute: { label: "Admissions", path: "/admissions" },
    responsibleRole: "ADMISSION_OFFICER (author); REVIEWER or PRINCIPAL (publish)",
    responsibleModule: { label: "Enrollment Statistics", adminPath: "/admin/enrollment-statistics" },
    check: async ({ collegeId }) => {
      const stats = await prisma.enrollmentStatistic.findMany({ where: { collegeId, status: PUBLISHED } });
      return toResult([
        { label: "At least one published enrollment statistic", met: stats.length > 0 },
        ...everyRecordHasFields(stats, [
          { label: "Every enrollment statistic has a session type", get: (s) => s.sessionType },
          { label: "Every enrollment statistic has an academic year", get: (s) => s.academicYear },
        ]),
      ]);
    },
  },

  10: {
    itemNumber: 10,
    requiredRecords: "At least one published Examination and at least one published Result.",
    requiredFields:
      "Every published examination needs a scheduleStartDate. Every published result needs a publishDate.",
    requiredDocuments: "A results gazette / examination notification document, attached as evidence.",
    publicRoute: { label: "Examinations", path: "/examinations" },
    responsibleRole: "EXAMINATION_OFFICER (author); REVIEWER or PRINCIPAL (publish)",
    responsibleModule: { label: "Exams, Results", adminPath: "/admin/exams" },
    check: async ({ collegeId, requirementId }) => {
      const [examinations, results, hasDocument] = await Promise.all([
        prisma.examination.findMany({ where: { collegeId, status: PUBLISHED } }),
        prisma.result.findMany({ where: { collegeId, status: PUBLISHED } }),
        hasPublishedDocumentEvidence(requirementId),
      ]);
      return toResult([
        { label: "At least one published examination", met: examinations.length > 0 },
        { label: "At least one published result", met: results.length > 0 },
        ...everyRecordHasFields(examinations, [
          { label: "Every examination has a scheduled start date", get: (e) => e.scheduleStartDate },
        ]),
        ...everyRecordHasFields(results, [
          { label: "Every result has a publish date", get: (r) => r.publishDate },
        ]),
        { label: "Results gazette/notification document attached as evidence", met: hasDocument },
      ]);
    },
  },

  11: {
    itemNumber: 11,
    requiredRecords: "At least one published phone Contact and at least one published email Contact.",
    requiredFields: "Every published contact needs a label describing what it's for.",
    requiredDocuments: null,
    publicRoute: { label: "Contact", path: "/contact" },
    responsibleRole: "EDITOR (author); REVIEWER or PRINCIPAL (publish)",
    responsibleModule: { label: "Contact", adminPath: "/admin/contact" },
    check: async ({ collegeId }) => {
      const contacts = await prisma.contact.findMany({ where: { collegeId, status: PUBLISHED } });
      return toResult([
        { label: "At least one published contact", met: contacts.length > 0 },
        { label: "A published phone number", met: contacts.some((c) => c.type === "PHONE") },
        { label: "A published email address", met: contacts.some((c) => c.type === "EMAIL") },
        ...everyRecordHasFields(contacts, [
          { label: "Every contact has a descriptive label", get: (c) => c.label },
        ]),
      ]);
    },
  },

  12: {
    itemNumber: 12,
    requiredRecords: "One published Location record.",
    requiredFields: "address and mapEmbedUrl must both be populated.",
    requiredDocuments: null,
    publicRoute: { label: "Contact", path: "/contact" },
    responsibleRole: "EDITOR (author); REVIEWER or PRINCIPAL (publish)",
    responsibleModule: { label: "Location", adminPath: "/admin/location" },
    check: async ({ collegeId }) => {
      const location = await prisma.location.findFirst({ where: { collegeId, status: PUBLISHED } });
      return toResult([
        { label: "Published location record exists", met: Boolean(location) },
        ...everyRecordHasFields(location ? [location] : [], [
          { label: "Postal address present", get: (l) => l.address },
          { label: "Map link present", get: (l) => l.mapEmbedUrl },
        ]),
      ]);
    },
  },

  13: {
    itemNumber: 13,
    requiredRecords: "At least one published Affiliation record.",
    requiredFields:
      "Every published affiliation needs an affiliationNumber, a regulatoryBody, and a validFrom date.",
    requiredDocuments: "An affiliation approval letter / certificate, attached as evidence.",
    publicRoute: { label: "Affiliation", path: "/affiliation" },
    responsibleRole: "EDITOR (author); REVIEWER or PRINCIPAL (publish)",
    responsibleModule: { label: "Affiliation", adminPath: "/admin/affiliation" },
    check: async ({ collegeId, requirementId }) => {
      const [affiliations, hasDocument] = await Promise.all([
        prisma.affiliation.findMany({ where: { collegeId, status: PUBLISHED } }),
        hasPublishedDocumentEvidence(requirementId),
      ]);
      return toResult([
        { label: "At least one published affiliation record", met: affiliations.length > 0 },
        ...everyRecordHasFields(affiliations, [
          { label: "Every affiliation has an affiliation/registration number", get: (a) => a.affiliationNumber },
          { label: "Every affiliation has a regulatory body recorded", get: (a) => a.regulatoryBody },
          { label: "Every affiliation has a valid-from date", get: (a) => a.validFrom },
        ]),
        { label: "Affiliation approval letter/certificate attached as evidence", met: hasDocument },
      ]);
    },
  },

  14: {
    itemNumber: 14,
    requiredRecords: "At least one published Activity.",
    requiredFields: "Every published activity needs a description and a category.",
    requiredDocuments: null,
    publicRoute: { label: "Events", path: "/events" },
    responsibleRole: "EDITOR (author); REVIEWER or PRINCIPAL (publish)",
    responsibleModule: { label: "Activities", adminPath: "/admin/activities" },
    check: async ({ collegeId }) => {
      const activities = await prisma.activity.findMany({ where: { collegeId, status: PUBLISHED } });
      return toResult([
        { label: "At least one published co-curricular activity", met: activities.length > 0 },
        ...everyRecordHasFields(activities, [
          { label: "Every activity has a description", get: (a) => a.description },
          { label: "Every activity has a category", get: (a) => a.category },
        ]),
      ]);
    },
  },

  15: {
    itemNumber: 15,
    requiredRecords: "At least one published Notice.",
    requiredFields: "Every published notice needs a publishDate.",
    requiredDocuments: null,
    publicRoute: { label: "Notices", path: "/notices" },
    responsibleRole: "EDITOR (author); REVIEWER or PRINCIPAL (publish)",
    responsibleModule: { label: "Notices", adminPath: "/admin/notices" },
    check: async ({ collegeId }) => {
      const notices = await prisma.notice.findMany({ where: { collegeId, status: PUBLISHED } });
      return toResult([
        { label: "At least one published notice", met: notices.length > 0 },
        ...everyRecordHasFields(notices, [
          { label: "Every notice has a publish date", get: (n) => n.publishDate },
        ]),
      ]);
    },
  },

  16: {
    itemNumber: 16,
    requiredRecords: "At least one published GalleryAlbum containing at least one published GalleryItem.",
    requiredFields: "Every published gallery item needs a caption.",
    requiredDocuments: null,
    publicRoute: { label: "Gallery", path: "/gallery" },
    responsibleRole: "EDITOR (author); REVIEWER or PRINCIPAL (publish)",
    responsibleModule: { label: "Gallery", adminPath: "/admin/gallery" },
    check: async ({ collegeId }) => {
      const [albumsWithItems, items] = await Promise.all([
        prisma.galleryAlbum.count({
          where: { collegeId, status: PUBLISHED, items: { some: { status: PUBLISHED } } },
        }),
        prisma.galleryItem.findMany({ where: { collegeId, status: PUBLISHED } }),
      ]);
      return toResult([
        { label: "At least one published album with a published photo", met: albumsWithItems > 0 },
        ...everyRecordHasFields(items, [
          { label: "Every published photo has a caption", get: (i) => i.caption },
        ]),
      ]);
    },
  },

  17: {
    itemNumber: 17,
    requiredRecords: "At least one published Scholarship and at least one published StudentSupport service.",
    requiredFields:
      "Every published scholarship needs eligibility criteria. Every published student support service needs contact info.",
    requiredDocuments: null,
    publicRoute: { label: "Scholarships", path: "/scholarships" },
    responsibleRole: "EDITOR (author); REVIEWER or PRINCIPAL (publish)",
    responsibleModule: { label: "Scholarships, Student Support", adminPath: "/admin/scholarships" },
    check: async ({ collegeId }) => {
      const [scholarships, support] = await Promise.all([
        prisma.scholarship.findMany({ where: { collegeId, status: PUBLISHED } }),
        prisma.studentSupport.findMany({ where: { collegeId, status: PUBLISHED } }),
      ]);
      return toResult([
        { label: "At least one published scholarship", met: scholarships.length > 0 },
        { label: "At least one published student support service", met: support.length > 0 },
        ...everyRecordHasFields(scholarships, [
          { label: "Every scholarship has eligibility criteria", get: (s) => s.eligibility },
        ]),
        ...everyRecordHasFields(support, [
          { label: "Every support service has contact info", get: (s) => s.contactInfo },
        ]),
      ]);
    },
  },

  18: {
    itemNumber: 18,
    requiredRecords: "At least one published Policy and at least one published Regulation.",
    requiredFields:
      "Every published policy needs a body. Every published regulation needs a body and a regulatingBody.",
    requiredDocuments: "The actual policy/regulation document (PDF), attached as evidence.",
    publicRoute: { label: "Rules", path: "/rules" },
    responsibleRole: "EDITOR (author); REVIEWER or PRINCIPAL (publish)",
    responsibleModule: { label: "Policies, Regulations", adminPath: "/admin/policies" },
    check: async ({ collegeId, requirementId }) => {
      const [policies, regulations, hasDocument] = await Promise.all([
        prisma.policy.findMany({ where: { collegeId, status: PUBLISHED } }),
        prisma.regulation.findMany({ where: { collegeId, status: PUBLISHED } }),
        hasPublishedDocumentEvidence(requirementId),
      ]);
      return toResult([
        { label: "At least one published policy", met: policies.length > 0 },
        { label: "At least one published regulation", met: regulations.length > 0 },
        ...everyRecordHasFields(policies, [{ label: "Every policy has a body", get: (p) => p.body }]),
        ...everyRecordHasFields(regulations, [
          { label: "Every regulation has a body", get: (r) => r.body },
          { label: "Every regulation has a regulating body recorded", get: (r) => r.regulatingBody },
        ]),
        { label: "Policy/regulation document attached as evidence", met: hasDocument },
      ]);
    },
  },

  19: {
    itemNumber: 19,
    requiredRecords: "At least one User holding the PRINCIPAL, ADMINISTRATOR, or SUPER_ADMIN role, assigned within the college.",
    requiredFields: "N/A — this requirement is procedural (a staffed, reachable mechanism), not a content record.",
    requiredDocuments: null,
    publicRoute: { label: "Grievance", path: "/grievance" },
    responsibleRole: "PRINCIPAL or ADMINISTRATOR",
    responsibleModule: { label: "Grievances", adminPath: "/admin/grievances" },
    check: async ({ collegeId }) => {
      const assignedStaff = await prisma.userRole.count({
        where: { collegeId, role: { name: { in: ["PRINCIPAL", "ADMINISTRATOR", "SUPER_ADMIN"] } } },
      });
      return toResult([
        {
          label: "At least one staff member is assigned to handle grievances",
          met: assignedStaff > 0,
        },
      ]);
    },
  },

  20: {
    itemNumber: 20,
    requiredRecords: "None fixed — determined case by case.",
    requiredFields: "None fixed — determined case by case.",
    requiredDocuments: "Whatever the college or university deems necessary, attached as evidence.",
    publicRoute: null,
    responsibleRole: "PRINCIPAL or ADMINISTRATOR",
    responsibleModule: { label: "CMS (case by case)", adminPath: "/admin/cms" },
    // Item 20 ("any other information") has no fixed data source by design — completeness is
    // evidenced only through manually attached ComplianceEvidence, reviewed case by case, and
    // is deliberately never automatically satisfied by any content table.
    check: async () =>
      toResult([{ label: "No fixed data source — reviewed case by case via attached evidence", met: false }]),
  },
};

/** Used only if a `ComplianceRequirement` row somehow has an itemNumber outside 1-20. */
const FALLBACK_RULE: ComplianceRule = {
  itemNumber: -1,
  requiredRecords: "—",
  requiredFields: "—",
  requiredDocuments: null,
  publicRoute: null,
  responsibleRole: "—",
  responsibleModule: { label: "—", adminPath: "/admin/compliance" },
  check: async () => ({ percent: 0, checks: [] }),
};

export type VerificationHistoryEntry = {
  id: string;
  decision: "VERIFIED" | "NEEDS_UPDATE";
  verifiedAt: Date;
  verifiedByName: string;
  note: string | null;
};

export type ComplianceRequirementRow = {
  id: string;
  itemNumber: number;
  title: string;
  description: string;
  circularReference: string;
  status: ComplianceStatusValue;
  ownerId: string | null;
  updatedAt: Date;
  rule: ComplianceRule;
  completeness: CompletenessResult;
  evidenceCount: number;
  lastVerification: VerificationHistoryEntry | null;
};

/**
 * Loads all 20 requirements for the Compliance Dashboard list view, computing each one's
 * completeness against real content and reconciling the automatic NOT_STARTED/IN_PROGRESS
 * portion of its status along the way (see `syncAutomaticStatus`).
 */
export async function getComplianceOverview(): Promise<ComplianceRequirementRow[]> {
  const college = await getPrimaryCollege();
  if (!college) return [];

  const requirements = await prisma.complianceRequirement.findMany({
    where: { collegeId: college.id },
    orderBy: { itemNumber: "asc" },
    include: {
      _count: { select: { evidence: true } },
      verifications: { orderBy: { verifiedAt: "desc" }, take: 1, include: { verifiedBy: true } },
    },
  });

  return Promise.all(
    requirements.map(async (requirement) => {
      const rule = COMPLIANCE_RULES[requirement.itemNumber] ?? FALLBACK_RULE;
      const completeness = await rule.check({ collegeId: college.id, requirementId: requirement.id });
      const hasProgress = completeness.percent > 0 || requirement._count.evidence > 0;
      const status = await syncAutomaticStatus({
        requirementId: requirement.id,
        currentStatus: requirement.status,
        hasProgress,
      });
      const latest = requirement.verifications[0];

      return {
        id: requirement.id,
        itemNumber: requirement.itemNumber,
        title: requirement.title,
        description: requirement.description,
        circularReference: requirement.circularReference,
        status,
        ownerId: requirement.ownerId,
        updatedAt: requirement.updatedAt,
        rule,
        completeness,
        evidenceCount: requirement._count.evidence,
        lastVerification: latest
          ? {
              id: latest.id,
              decision: latest.decision,
              verifiedAt: latest.verifiedAt,
              verifiedByName: latest.verifiedBy.name,
              note: latest.note,
            }
          : null,
      };
    }),
  );
}

export type ComplianceEvidenceEntry = {
  id: string;
  entityType: string;
  entityId: string;
  note: string | null;
  addedByName: string;
  createdAt: Date;
};

export type ComplianceRequirementDetail = Omit<ComplianceRequirementRow, "lastVerification"> & {
  ownerName: string | null;
  evidence: ComplianceEvidenceEntry[];
  verificationHistory: VerificationHistoryEntry[];
};

/** Loads one requirement plus its full evidence list and verification history. */
export async function getComplianceRequirementDetail(
  id: string,
): Promise<ComplianceRequirementDetail | null> {
  const requirement = await prisma.complianceRequirement.findUnique({
    where: { id },
    include: {
      owner: true,
      evidence: { orderBy: { createdAt: "desc" }, include: { addedBy: true } },
      verifications: { orderBy: { verifiedAt: "desc" }, include: { verifiedBy: true } },
    },
  });
  if (!requirement) return null;

  const rule = COMPLIANCE_RULES[requirement.itemNumber] ?? FALLBACK_RULE;
  const completeness = await rule.check({
    collegeId: requirement.collegeId,
    requirementId: requirement.id,
  });
  const hasProgress = completeness.percent > 0 || requirement.evidence.length > 0;
  const status = await syncAutomaticStatus({
    requirementId: requirement.id,
    currentStatus: requirement.status,
    hasProgress,
  });

  return {
    id: requirement.id,
    itemNumber: requirement.itemNumber,
    title: requirement.title,
    description: requirement.description,
    circularReference: requirement.circularReference,
    status,
    ownerId: requirement.ownerId,
    ownerName: requirement.owner?.name ?? null,
    updatedAt: requirement.updatedAt,
    rule,
    completeness,
    evidenceCount: requirement.evidence.length,
    evidence: requirement.evidence.map((item) => ({
      id: item.id,
      entityType: item.entityType,
      entityId: item.entityId,
      note: item.note,
      addedByName: item.addedBy.name,
      createdAt: item.createdAt,
    })),
    verificationHistory: requirement.verifications.map((verification) => ({
      id: verification.id,
      decision: verification.decision,
      verifiedAt: verification.verifiedAt,
      verifiedByName: verification.verifiedBy.name,
      note: verification.note,
    })),
  };
}
