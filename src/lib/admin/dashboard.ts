import "server-only";

import { prisma } from "@/lib/prisma";
import type { Permission } from "@/lib/auth/permissions";
import { MODULE_PERMISSIONS, type ModuleName } from "@/lib/admin/module-permissions";
import type { ContentStatusValue } from "@/lib/content-workflow";
import type { ComplianceStatusValue } from "@/lib/compliance-workflow";
import { getComplianceOverview } from "@/lib/compliance";
import { getAuditLogPage, type AuditLogListRow } from "@/lib/admin/audit-logs";
import { computeReviewFreshness, type ReviewableRecord } from "@/lib/content-review";
import {
  REVIEWABLE_MODULES,
  REVIEWABLE_MODULE_LABELS,
  getReviewPeriods,
  type ReviewableModule,
} from "@/lib/admin/review-settings";

/**
 * All dashboard numbers are computed live from the database on every request (never cached,
 * never hard-coded) — CLAUDE.md's "do not fabricate statistics; all numbers must come from
 * the database." Every section here is gated by the same permission its own admin module
 * already enforces (`MODULE_PERMISSIONS`, `compliance:view`, `audit_logs:view`), so a
 * signed-in user only ever sees a real count of content they're actually allowed to look at
 * — the dashboard is a summary of *their* admin surface, not a leak of domains they can't
 * open (CLAUDE.md rule 5).
 */

type GroupRow = { status: ContentStatusValue; _count: { _all: number } };
type TitledRow = { id: string; title: string; updatedAt: Date; publishedAt: Date | null };

/**
 * One `groupBy` query per content-authoring module (the same 28 covered by
 * `MODULE_PERMISSIONS`), each as a standalone top-level function — deliberately NOT written
 * inline inside the `CONTENT_SOURCES` array below. Contextually typing an inline arrow
 * function against `ContentSource.groupBy`'s declared return type breaks Prisma's own
 * generic inference for `.groupBy(...)` (its argument and return types are resolved
 * together via conditional types that don't tolerate an externally-imposed expected
 * return type — an easy trap, since it only surfaces as a confusing "argument not
 * assignable" error, not anything mentioning inference at all). A standalone function
 * has no surrounding expected type while its own body is checked, so Prisma infers its
 * real, precise return type first, and only *that* concrete type is later checked for
 * structural compatibility with `GroupRow[]` when the array is assembled.
 */
function collegeProfileGroupBy(collegeId: string) {
  return prisma.collegeProfile.groupBy({ by: ["status"], where: { collegeId }, _count: { _all: true } });
}
function departmentsGroupBy(collegeId: string) {
  return prisma.department.groupBy({ by: ["status"], where: { collegeId }, _count: { _all: true } });
}
function programsGroupBy(collegeId: string) {
  return prisma.program.groupBy({ by: ["status"], where: { collegeId }, _count: { _all: true } });
}
function facultyGroupBy(collegeId: string) {
  return prisma.faculty.groupBy({ by: ["status"], where: { collegeId }, _count: { _all: true } });
}
function staffGroupBy(collegeId: string) {
  return prisma.staff.groupBy({ by: ["status"], where: { collegeId }, _count: { _all: true } });
}
function noticesGroupBy(collegeId: string) {
  return prisma.notice.groupBy({ by: ["status"], where: { collegeId }, _count: { _all: true } });
}
function eventsGroupBy(collegeId: string) {
  return prisma.event.groupBy({ by: ["status"], where: { collegeId }, _count: { _all: true } });
}
function seminarsGroupBy(collegeId: string) {
  return prisma.seminar.groupBy({ by: ["status"], where: { collegeId }, _count: { _all: true } });
}
function workshopsGroupBy(collegeId: string) {
  return prisma.workshop.groupBy({ by: ["status"], where: { collegeId }, _count: { _all: true } });
}
function academicCalendarGroupBy(collegeId: string) {
  return prisma.academicCalendar.groupBy({ by: ["status"], where: { collegeId }, _count: { _all: true } });
}
function timetablesGroupBy(collegeId: string) {
  return prisma.timetable.groupBy({ by: ["status"], where: { collegeId }, _count: { _all: true } });
}
function admissionsGroupBy(collegeId: string) {
  return prisma.admission.groupBy({ by: ["status"], where: { collegeId }, _count: { _all: true } });
}
function feeStructuresGroupBy(collegeId: string) {
  return prisma.feeStructure.groupBy({ by: ["status"], where: { collegeId }, _count: { _all: true } });
}
function enrollmentStatisticsGroupBy(collegeId: string) {
  return prisma.enrollmentStatistic.groupBy({ by: ["status"], where: { collegeId }, _count: { _all: true } });
}
function examinationsGroupBy(collegeId: string) {
  return prisma.examination.groupBy({ by: ["status"], where: { collegeId }, _count: { _all: true } });
}
function resultsGroupBy(collegeId: string) {
  return prisma.result.groupBy({ by: ["status"], where: { collegeId }, _count: { _all: true } });
}
function documentsGroupBy(collegeId: string) {
  return prisma.document.groupBy({ by: ["status"], where: { collegeId }, _count: { _all: true } });
}
function infrastructureGroupBy(collegeId: string) {
  return prisma.infrastructure.groupBy({ by: ["status"], where: { collegeId }, _count: { _all: true } });
}
function activitiesGroupBy(collegeId: string) {
  return prisma.activity.groupBy({ by: ["status"], where: { collegeId }, _count: { _all: true } });
}
function clubsGroupBy(collegeId: string) {
  return prisma.club.groupBy({ by: ["status"], where: { collegeId }, _count: { _all: true } });
}
function galleryGroupBy(collegeId: string) {
  return prisma.galleryAlbum.groupBy({ by: ["status"], where: { collegeId }, _count: { _all: true } });
}
function scholarshipsGroupBy(collegeId: string) {
  return prisma.scholarship.groupBy({ by: ["status"], where: { collegeId }, _count: { _all: true } });
}
function studentSupportGroupBy(collegeId: string) {
  return prisma.studentSupport.groupBy({ by: ["status"], where: { collegeId }, _count: { _all: true } });
}
function policiesGroupBy(collegeId: string) {
  return prisma.policy.groupBy({ by: ["status"], where: { collegeId }, _count: { _all: true } });
}
function regulationsGroupBy(collegeId: string) {
  return prisma.regulation.groupBy({ by: ["status"], where: { collegeId }, _count: { _all: true } });
}
function affiliationGroupBy(collegeId: string) {
  return prisma.affiliation.groupBy({ by: ["status"], where: { collegeId }, _count: { _all: true } });
}
function contactGroupBy(collegeId: string) {
  return prisma.contact.groupBy({ by: ["status"], where: { collegeId }, _count: { _all: true } });
}
function locationGroupBy(collegeId: string) {
  return prisma.location.groupBy({ by: ["status"], where: { collegeId }, _count: { _all: true } });
}

/**
 * One `listPublished` query per module with an actual editorial title (name/title field) —
 * absent for structured/tabular records (fee structures, enrollment statistics, timetables,
 * admissions, examinations, results, affiliations, contacts, location) that don't have one;
 * flagging e.g. a fee-structure row by a synthetic label would be noise, not a useful review
 * prompt, so those stay counted in the status totals but out of the "not recently reviewed"
 * table. Same standalone-function reasoning as the `groupBy` functions above.
 */
async function departmentsListPublished(collegeId: string, before: Date, limit: number): Promise<TitledRow[]> {
  const rows = await prisma.department.findMany({
    where: { collegeId, status: "PUBLISHED", updatedAt: { lt: before } },
    orderBy: { updatedAt: "asc" },
    take: limit,
    select: { id: true, name: true, updatedAt: true, publishedAt: true },
  });
  return rows.map((r) => ({ id: r.id, title: r.name, updatedAt: r.updatedAt, publishedAt: r.publishedAt }));
}
async function programsListPublished(collegeId: string, before: Date, limit: number): Promise<TitledRow[]> {
  const rows = await prisma.program.findMany({
    where: { collegeId, status: "PUBLISHED", updatedAt: { lt: before } },
    orderBy: { updatedAt: "asc" },
    take: limit,
    select: { id: true, name: true, updatedAt: true, publishedAt: true },
  });
  return rows.map((r) => ({ id: r.id, title: r.name, updatedAt: r.updatedAt, publishedAt: r.publishedAt }));
}
async function staffListPublished(collegeId: string, before: Date, limit: number): Promise<TitledRow[]> {
  const rows = await prisma.staff.findMany({
    where: { collegeId, status: "PUBLISHED", updatedAt: { lt: before } },
    orderBy: { updatedAt: "asc" },
    take: limit,
    select: { id: true, name: true, updatedAt: true, publishedAt: true },
  });
  return rows.map((r) => ({ id: r.id, title: r.name, updatedAt: r.updatedAt, publishedAt: r.publishedAt }));
}
async function eventsListPublished(collegeId: string, before: Date, limit: number): Promise<TitledRow[]> {
  const rows = await prisma.event.findMany({
    where: { collegeId, status: "PUBLISHED", updatedAt: { lt: before } },
    orderBy: { updatedAt: "asc" },
    take: limit,
    select: { id: true, title: true, updatedAt: true, publishedAt: true },
  });
  return rows.map((r) => ({ id: r.id, title: r.title, updatedAt: r.updatedAt, publishedAt: r.publishedAt }));
}
async function seminarsListPublished(collegeId: string, before: Date, limit: number): Promise<TitledRow[]> {
  const rows = await prisma.seminar.findMany({
    where: { collegeId, status: "PUBLISHED", updatedAt: { lt: before } },
    orderBy: { updatedAt: "asc" },
    take: limit,
    select: { id: true, title: true, updatedAt: true, publishedAt: true },
  });
  return rows.map((r) => ({ id: r.id, title: r.title, updatedAt: r.updatedAt, publishedAt: r.publishedAt }));
}
async function workshopsListPublished(collegeId: string, before: Date, limit: number): Promise<TitledRow[]> {
  const rows = await prisma.workshop.findMany({
    where: { collegeId, status: "PUBLISHED", updatedAt: { lt: before } },
    orderBy: { updatedAt: "asc" },
    take: limit,
    select: { id: true, title: true, updatedAt: true, publishedAt: true },
  });
  return rows.map((r) => ({ id: r.id, title: r.title, updatedAt: r.updatedAt, publishedAt: r.publishedAt }));
}
async function documentsListPublished(collegeId: string, before: Date, limit: number): Promise<TitledRow[]> {
  const rows = await prisma.document.findMany({
    where: { collegeId, status: "PUBLISHED", updatedAt: { lt: before } },
    orderBy: { updatedAt: "asc" },
    take: limit,
    select: { id: true, title: true, updatedAt: true, publishedAt: true },
  });
  return rows.map((r) => ({ id: r.id, title: r.title, updatedAt: r.updatedAt, publishedAt: r.publishedAt }));
}
async function infrastructureListPublished(collegeId: string, before: Date, limit: number): Promise<TitledRow[]> {
  const rows = await prisma.infrastructure.findMany({
    where: { collegeId, status: "PUBLISHED", updatedAt: { lt: before } },
    orderBy: { updatedAt: "asc" },
    take: limit,
    select: { id: true, name: true, updatedAt: true, publishedAt: true },
  });
  return rows.map((r) => ({ id: r.id, title: r.name, updatedAt: r.updatedAt, publishedAt: r.publishedAt }));
}
async function activitiesListPublished(collegeId: string, before: Date, limit: number): Promise<TitledRow[]> {
  const rows = await prisma.activity.findMany({
    where: { collegeId, status: "PUBLISHED", updatedAt: { lt: before } },
    orderBy: { updatedAt: "asc" },
    take: limit,
    select: { id: true, title: true, updatedAt: true, publishedAt: true },
  });
  return rows.map((r) => ({ id: r.id, title: r.title, updatedAt: r.updatedAt, publishedAt: r.publishedAt }));
}
async function clubsListPublished(collegeId: string, before: Date, limit: number): Promise<TitledRow[]> {
  const rows = await prisma.club.findMany({
    where: { collegeId, status: "PUBLISHED", updatedAt: { lt: before } },
    orderBy: { updatedAt: "asc" },
    take: limit,
    select: { id: true, name: true, updatedAt: true, publishedAt: true },
  });
  return rows.map((r) => ({ id: r.id, title: r.name, updatedAt: r.updatedAt, publishedAt: r.publishedAt }));
}
async function galleryListPublished(collegeId: string, before: Date, limit: number): Promise<TitledRow[]> {
  const rows = await prisma.galleryAlbum.findMany({
    where: { collegeId, status: "PUBLISHED", updatedAt: { lt: before } },
    orderBy: { updatedAt: "asc" },
    take: limit,
    select: { id: true, title: true, updatedAt: true, publishedAt: true },
  });
  return rows.map((r) => ({ id: r.id, title: r.title, updatedAt: r.updatedAt, publishedAt: r.publishedAt }));
}
async function scholarshipsListPublished(collegeId: string, before: Date, limit: number): Promise<TitledRow[]> {
  const rows = await prisma.scholarship.findMany({
    where: { collegeId, status: "PUBLISHED", updatedAt: { lt: before } },
    orderBy: { updatedAt: "asc" },
    take: limit,
    select: { id: true, name: true, updatedAt: true, publishedAt: true },
  });
  return rows.map((r) => ({ id: r.id, title: r.name, updatedAt: r.updatedAt, publishedAt: r.publishedAt }));
}
async function studentSupportListPublished(collegeId: string, before: Date, limit: number): Promise<TitledRow[]> {
  const rows = await prisma.studentSupport.findMany({
    where: { collegeId, status: "PUBLISHED", updatedAt: { lt: before } },
    orderBy: { updatedAt: "asc" },
    take: limit,
    select: { id: true, name: true, updatedAt: true, publishedAt: true },
  });
  return rows.map((r) => ({ id: r.id, title: r.name, updatedAt: r.updatedAt, publishedAt: r.publishedAt }));
}
async function policiesListPublished(collegeId: string, before: Date, limit: number): Promise<TitledRow[]> {
  const rows = await prisma.policy.findMany({
    where: { collegeId, status: "PUBLISHED", updatedAt: { lt: before } },
    orderBy: { updatedAt: "asc" },
    take: limit,
    select: { id: true, title: true, updatedAt: true, publishedAt: true },
  });
  return rows.map((r) => ({ id: r.id, title: r.title, updatedAt: r.updatedAt, publishedAt: r.publishedAt }));
}
async function regulationsListPublished(collegeId: string, before: Date, limit: number): Promise<TitledRow[]> {
  const rows = await prisma.regulation.findMany({
    where: { collegeId, status: "PUBLISHED", updatedAt: { lt: before } },
    orderBy: { updatedAt: "asc" },
    take: limit,
    select: { id: true, title: true, updatedAt: true, publishedAt: true },
  });
  return rows.map((r) => ({ id: r.id, title: r.title, updatedAt: r.updatedAt, publishedAt: r.publishedAt }));
}

/**
 * The registry itself: for each module, its permission-domain key, display label, admin
 * route, and the two standalone query functions above. `satisfies` (not `: ContentSource[]`)
 * preserves each entry's precise inferred type while still validating the whole array
 * against `ContentSource`.
 */
type ContentSource = {
  key: ModuleName;
  label: string;
  adminPath: string;
  groupBy: (collegeId: string) => Promise<GroupRow[]>;
  listPublished?: (collegeId: string, before: Date, limit: number) => Promise<TitledRow[]>;
};

const CONTENT_SOURCES = [
  {
    key: "collegeProfile",
    label: "College Profile",
    adminPath: "/admin/college-profile",
    groupBy: collegeProfileGroupBy,
  },
  {
    key: "departments",
    label: "Departments",
    adminPath: "/admin/departments",
    groupBy: departmentsGroupBy,
    listPublished: departmentsListPublished,
  },
  {
    key: "programs",
    label: "Programs",
    adminPath: "/admin/programs",
    groupBy: programsGroupBy,
    listPublished: programsListPublished,
  },
  {
    key: "faculty",
    label: "Faculty",
    adminPath: "/admin/faculty",
    groupBy: facultyGroupBy,
    // No listPublished here — Faculty has real review-tracking now (getReviewWarnings
    // below), a more precise staleness signal than this table's updatedAt heuristic.
  },
  {
    key: "staff",
    label: "Staff",
    adminPath: "/admin/staff",
    groupBy: staffGroupBy,
    listPublished: staffListPublished,
  },
  {
    key: "notices",
    label: "Notices",
    adminPath: "/admin/notices",
    groupBy: noticesGroupBy,
    // No listPublished here — Notices has real review-tracking now (getReviewWarnings
    // below), a more precise staleness signal than this table's updatedAt heuristic.
  },
  {
    key: "events",
    label: "Events",
    adminPath: "/admin/events",
    groupBy: eventsGroupBy,
    listPublished: eventsListPublished,
  },
  {
    key: "seminars",
    label: "Seminars",
    adminPath: "/admin/seminars",
    groupBy: seminarsGroupBy,
    listPublished: seminarsListPublished,
  },
  {
    key: "workshops",
    label: "Workshops",
    adminPath: "/admin/workshops",
    groupBy: workshopsGroupBy,
    listPublished: workshopsListPublished,
  },
  {
    key: "academicCalendar",
    label: "Academic Calendar",
    adminPath: "/admin/academic-calendar",
    groupBy: academicCalendarGroupBy,
    // No listPublished here — Academic Calendar has real review-tracking now
    // (getReviewWarnings below), a more precise staleness signal than this table's
    // updatedAt heuristic.
  },
  {
    key: "timetables",
    label: "Timetables",
    adminPath: "/admin/timetables",
    groupBy: timetablesGroupBy,
  },
  {
    key: "admissions",
    label: "Admissions",
    adminPath: "/admin/admissions",
    groupBy: admissionsGroupBy,
  },
  {
    key: "feeStructures",
    label: "Fee Structures",
    adminPath: "/admin/fee-structures",
    groupBy: feeStructuresGroupBy,
  },
  {
    key: "enrollmentStatistics",
    label: "Enrollment Statistics",
    adminPath: "/admin/enrollment-statistics",
    groupBy: enrollmentStatisticsGroupBy,
  },
  {
    key: "examinations",
    label: "Examinations",
    adminPath: "/admin/exams",
    groupBy: examinationsGroupBy,
  },
  {
    key: "results",
    label: "Results",
    adminPath: "/admin/results",
    groupBy: resultsGroupBy,
  },
  {
    key: "documents",
    label: "Documents",
    adminPath: "/admin/documents",
    groupBy: documentsGroupBy,
    listPublished: documentsListPublished,
  },
  {
    key: "infrastructure",
    label: "Infrastructure",
    adminPath: "/admin/infrastructure",
    groupBy: infrastructureGroupBy,
    listPublished: infrastructureListPublished,
  },
  {
    key: "activities",
    label: "Activities",
    adminPath: "/admin/activities",
    groupBy: activitiesGroupBy,
    listPublished: activitiesListPublished,
  },
  {
    key: "clubs",
    label: "Clubs",
    adminPath: "/admin/clubs",
    groupBy: clubsGroupBy,
    listPublished: clubsListPublished,
  },
  {
    key: "gallery",
    label: "Gallery",
    adminPath: "/admin/gallery",
    groupBy: galleryGroupBy,
    listPublished: galleryListPublished,
  },
  {
    key: "scholarships",
    label: "Scholarships",
    adminPath: "/admin/scholarships",
    groupBy: scholarshipsGroupBy,
    listPublished: scholarshipsListPublished,
  },
  {
    key: "studentSupport",
    label: "Student Support",
    adminPath: "/admin/student-support",
    groupBy: studentSupportGroupBy,
    listPublished: studentSupportListPublished,
  },
  {
    key: "policies",
    label: "Policies",
    adminPath: "/admin/policies",
    groupBy: policiesGroupBy,
    listPublished: policiesListPublished,
  },
  {
    key: "regulations",
    label: "Regulations",
    adminPath: "/admin/regulations",
    groupBy: regulationsGroupBy,
    listPublished: regulationsListPublished,
  },
  {
    key: "affiliation",
    label: "Affiliation",
    adminPath: "/admin/affiliation",
    groupBy: affiliationGroupBy,
  },
  {
    key: "contact",
    label: "Contact",
    adminPath: "/admin/contact",
    groupBy: contactGroupBy,
  },
  {
    key: "location",
    label: "Location",
    adminPath: "/admin/location",
    groupBy: locationGroupBy,
  },
] satisfies ContentSource[];

export type ContentSummary = {
  published: number;
  draft: number;
  pendingReview: number;
};

/** Site-wide published/draft/pending-review totals, summed only across modules `permissions`
 * grants `:view` on — never the whole site regardless of who's asking. */
export async function getContentSummary(
  collegeId: string,
  permissions: ReadonlySet<Permission>,
): Promise<ContentSummary> {
  const visible = CONTENT_SOURCES.filter((source) => permissions.has(MODULE_PERMISSIONS[source.key].view));
  const groups = await Promise.all(visible.map((source) => source.groupBy(collegeId)));

  let published = 0;
  let draft = 0;
  let pendingReview = 0;
  for (const group of groups) {
    for (const row of group) {
      if (row.status === "PUBLISHED") published += row._count._all;
      else if (row.status === "DRAFT") draft += row._count._all;
      else if (row.status === "SUBMITTED" || row.status === "UNDER_REVIEW") pendingReview += row._count._all;
    }
  }
  return { published, draft, pendingReview };
}

export type StaleContentRow = {
  module: string;
  adminPath: string;
  id: string;
  title: string;
  lastUpdated: Date;
};

export const STALE_CONTENT_THRESHOLD_DAYS = 180;

/** Published content whose `updatedAt` predates the staleness threshold — i.e. it's live but
 * nobody has touched it in a while, so a human should confirm it's still accurate. This is an
 * `updatedAt` heuristic for modules that don't (yet) have real review tracking — Notices,
 * Faculty, Academic Calendar, Timetables, and Admissions have a real `lastReviewedAt` field and
 * a configurable review period instead (`getReviewWarnings` below), which is what CLAUDE.md's
 * "overdue reviews"/named stale-content warnings are actually backed by; this heuristic covers
 * everything else. Sorted oldest-first (most overdue) across every module `permissions`
 * allows, capped to `limit` total rows. */
export async function getStaleContent(
  collegeId: string,
  permissions: ReadonlySet<Permission>,
  limit = 10,
): Promise<StaleContentRow[]> {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - STALE_CONTENT_THRESHOLD_DAYS);

  const visible = CONTENT_SOURCES.filter(
    (source) => source.listPublished && permissions.has(MODULE_PERMISSIONS[source.key].view),
  );
  const perModule = await Promise.all(
    visible.map(async (source) => {
      const rows = await source.listPublished!(collegeId, threshold, limit);
      return rows.map((row) => ({
        module: source.label,
        adminPath: source.adminPath,
        id: row.id,
        title: row.title,
        lastUpdated: row.updatedAt,
      }));
    }),
  );

  return perModule
    .flat()
    .sort((a, b) => a.lastUpdated.getTime() - b.lastUpdated.getTime())
    .slice(0, limit);
}

export type ComplianceSummary = {
  verifiedCount: number;
  totalCount: number;
  percent: number;
  needsAttention: {
    id: string;
    itemNumber: number;
    title: string;
    status: ComplianceStatusValue;
    completenessPercent: number;
    adminPath: string;
  }[];
};

/** "Compliance percentage" is the share of the 20 circular requirements an authorized human
 * has actually VERIFIED (CLAUDE.md rule 7) — not average completeness, which a machine can
 * compute without anyone signing off, and which would overstate how "done" compliance really
 * is. "Needing attention" is every requirement not already VERIFIED or explicitly marked
 * NOT_APPLICABLE, ordered worst-first: a previously-VERIFIED item now flagged NEEDS_UPDATE is
 * the most urgent regression, ahead of items that were simply never started. */
export async function getComplianceSummary(limit = 10): Promise<ComplianceSummary> {
  const overview = await getComplianceOverview();
  const verifiedCount = overview.filter((r) => r.status === "VERIFIED").length;
  const totalCount = overview.length;
  const percent = totalCount === 0 ? 0 : Math.round((verifiedCount / totalCount) * 100);

  const priority: Record<string, number> = {
    NEEDS_UPDATE: 0,
    READY_FOR_REVIEW: 1,
    IN_PROGRESS: 2,
    NOT_STARTED: 3,
  };

  const needsAttention = overview
    .filter((r) => r.status !== "VERIFIED" && r.status !== "NOT_APPLICABLE")
    .sort((a, b) => (priority[a.status] ?? 9) - (priority[b.status] ?? 9) || a.itemNumber - b.itemNumber)
    .slice(0, limit)
    .map((r) => ({
      id: r.id,
      itemNumber: r.itemNumber,
      title: r.title,
      status: r.status,
      completenessPercent: r.completeness.percent,
      adminPath: `/admin/compliance/${r.id}`,
    }));

  return { verifiedCount, totalCount, percent, needsAttention };
}

export type DocumentExpiryRow = {
  id: string;
  title: string;
  expiryDate: Date;
  isExpired: boolean;
};

export const DOCUMENT_EXPIRY_WARNING_DAYS = 30;

/** Published documents whose `expiryDate` has already passed (still marked PUBLISHED —
 * quietly stale) or falls within the next `DOCUMENT_EXPIRY_WARNING_DAYS` days, expiring-soonest
 * first. Documents with no `expiryDate` never appear here — they were never meant to expire. */
export async function getDocumentExpiryWarnings(collegeId: string, limit = 10): Promise<DocumentExpiryRow[]> {
  const now = new Date();
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + DOCUMENT_EXPIRY_WARNING_DAYS);

  const documents = await prisma.document.findMany({
    where: { collegeId, status: "PUBLISHED", expiryDate: { not: null, lte: horizon } },
    orderBy: { expiryDate: "asc" },
    take: limit,
    select: { id: true, title: true, expiryDate: true },
  });

  return documents.map((d) => ({
    id: d.id,
    title: d.title,
    expiryDate: d.expiryDate as Date,
    isExpired: (d.expiryDate as Date) < now,
  }));
}

/**
 * Content review/freshness warnings (CLAUDE.md task: "overdue reviews" + the 5 named
 * stale-<module> warnings) for the 5 modules with real review tracking
 * (src/lib/content-review.ts, src/lib/admin/review-settings.ts). Only PUBLISHED records are
 * considered — a draft's staleness isn't a public-facing accuracy risk the way live content's
 * is. Each fetcher is a standalone top-level function for the same Prisma-inference reason the
 * `groupBy` functions above are (see that comment); Timetable/Admission have no editorial
 * title field of their own, so their candidate rows synthesize one from the related Program.
 */
type ReviewCandidateRow = ReviewableRecord & { id: string; title: string; lastReviewedById: string | null };

async function noticesReviewCandidates(collegeId: string): Promise<ReviewCandidateRow[]> {
  return prisma.notice.findMany({
    where: { collegeId, status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      publishedAt: true,
      lastReviewedAt: true,
      lastReviewedById: true,
    },
  });
}

async function facultyReviewCandidates(collegeId: string): Promise<ReviewCandidateRow[]> {
  const rows = await prisma.faculty.findMany({
    where: { collegeId, status: "PUBLISHED" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
      publishedAt: true,
      lastReviewedAt: true,
      lastReviewedById: true,
    },
  });
  return rows.map((r) => ({ ...r, title: r.name }));
}

async function academicCalendarReviewCandidates(collegeId: string): Promise<ReviewCandidateRow[]> {
  return prisma.academicCalendar.findMany({
    where: { collegeId, status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      publishedAt: true,
      lastReviewedAt: true,
      lastReviewedById: true,
    },
  });
}

async function timetablesReviewCandidates(collegeId: string): Promise<ReviewCandidateRow[]> {
  const rows = await prisma.timetable.findMany({
    where: { collegeId, status: "PUBLISHED" },
    select: {
      id: true,
      classGroup: true,
      createdAt: true,
      updatedAt: true,
      publishedAt: true,
      lastReviewedAt: true,
      lastReviewedById: true,
      program: { select: { name: true } },
    },
  });
  return rows.map((r) => ({ ...r, title: `${r.program.name} — ${r.classGroup}` }));
}

async function admissionsReviewCandidates(collegeId: string): Promise<ReviewCandidateRow[]> {
  const rows = await prisma.admission.findMany({
    where: { collegeId, status: "PUBLISHED" },
    select: {
      id: true,
      academicYear: true,
      createdAt: true,
      updatedAt: true,
      publishedAt: true,
      lastReviewedAt: true,
      lastReviewedById: true,
      program: { select: { name: true } },
    },
  });
  return rows.map((r) => ({ ...r, title: `${r.program.name} — ${r.academicYear}` }));
}

type ReviewSource = {
  key: ReviewableModule;
  label: string;
  adminPath: string;
  fetch: (collegeId: string) => Promise<ReviewCandidateRow[]>;
};

const REVIEW_SOURCES: ReviewSource[] = [
  { key: "notices", label: REVIEWABLE_MODULE_LABELS.notices, adminPath: "/admin/notices", fetch: noticesReviewCandidates },
  { key: "faculty", label: REVIEWABLE_MODULE_LABELS.faculty, adminPath: "/admin/faculty", fetch: facultyReviewCandidates },
  {
    key: "academicCalendar",
    label: REVIEWABLE_MODULE_LABELS.academicCalendar,
    adminPath: "/admin/academic-calendar",
    fetch: academicCalendarReviewCandidates,
  },
  {
    key: "timetables",
    label: REVIEWABLE_MODULE_LABELS.timetables,
    adminPath: "/admin/timetables",
    fetch: timetablesReviewCandidates,
  },
  {
    key: "admissions",
    label: REVIEWABLE_MODULE_LABELS.admissions,
    adminPath: "/admin/admissions",
    fetch: admissionsReviewCandidates,
  },
];

export type OverdueReviewRow = {
  moduleKey: ReviewableModule;
  module: string;
  adminPath: string;
  id: string;
  title: string;
  lastReviewedAt: Date | null;
  nextReviewDue: Date;
  reviewerName: string | null;
};

export type ReviewWarningSummary = {
  /** Most-overdue-first, capped to `limit` — for the dashboard's combined table. */
  overdue: OverdueReviewRow[];
  /** Full overdue count per module (not capped by `limit`) — for the 5 named
   * stale-<module> warning cards, so a card's count is always accurate even when the
   * combined table above only shows the top `limit` rows across all 5 modules. */
  countsByModule: Record<ReviewableModule, number>;
};

/** The real "overdue reviews" + 5 named stale-content warnings, computed from actual
 * `lastReviewedAt` data and each module's configured review period — not an `updatedAt`
 * heuristic. Only scans modules `permissions` grants `:view` on. */
export async function getReviewWarnings(
  collegeId: string,
  permissions: ReadonlySet<Permission>,
  limit = 10,
): Promise<ReviewWarningSummary> {
  const periods = await getReviewPeriods();
  const now = new Date();
  const visible = REVIEW_SOURCES.filter((source) => permissions.has(MODULE_PERMISSIONS[source.key].view));

  const perModule = await Promise.all(
    visible.map(async (source) => {
      const rows = await source.fetch(collegeId);
      const overdue = rows
        .map((row) => ({ row, freshness: computeReviewFreshness(row, periods[source.key], now) }))
        .filter((x) => x.freshness.isOverdue);
      return { source, overdue };
    }),
  );

  const reviewerIds = new Set<string>();
  for (const { overdue } of perModule) {
    for (const { row } of overdue) if (row.lastReviewedById) reviewerIds.add(row.lastReviewedById);
  }
  const reviewers = reviewerIds.size
    ? await prisma.user.findMany({ where: { id: { in: [...reviewerIds] } }, select: { id: true, name: true } })
    : [];
  const reviewerNames = new Map(reviewers.map((u) => [u.id, u.name]));

  const countsByModule = Object.fromEntries(REVIEWABLE_MODULES.map((key) => [key, 0])) as Record<
    ReviewableModule,
    number
  >;

  const allRows: OverdueReviewRow[] = [];
  for (const { source, overdue } of perModule) {
    countsByModule[source.key] = overdue.length;
    for (const { row, freshness } of overdue) {
      allRows.push({
        moduleKey: source.key,
        module: source.label,
        adminPath: source.adminPath,
        id: row.id,
        title: row.title,
        lastReviewedAt: row.lastReviewedAt,
        nextReviewDue: freshness.nextReviewDue,
        reviewerName: row.lastReviewedById ? (reviewerNames.get(row.lastReviewedById) ?? null) : null,
      });
    }
  }

  allRows.sort((a, b) => a.nextReviewDue.getTime() - b.nextReviewDue.getTime());
  return { overdue: allRows.slice(0, limit), countsByModule };
}

export type RecentNoticeRow = {
  id: string;
  title: string;
  status: ContentStatusValue;
  updatedAt: Date;
};

/** The most recently touched notices regardless of status — staff reviewing the dashboard
 * want to see draft/pending work too, not only what's already public (the public site's own
 * `getNotices()` in src/lib/content.ts is the PUBLISHED-only equivalent of this). */
export async function getRecentNotices(collegeId: string, limit = 5): Promise<RecentNoticeRow[]> {
  return prisma.notice.findMany({
    where: { collegeId },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: { id: true, title: true, status: true, updatedAt: true },
  });
}

export type UpcomingEventRow = {
  id: string;
  title: string;
  status: ContentStatusValue;
  startDate: Date;
  location: string | null;
};

/** Events starting from now onward, regardless of status — same "staff need to see
 * not-yet-published work too" reasoning as `getRecentNotices`. */
export async function getUpcomingEventsForAdmin(collegeId: string, limit = 5): Promise<UpcomingEventRow[]> {
  return prisma.event.findMany({
    where: { collegeId, startDate: { gte: new Date() } },
    orderBy: { startDate: "asc" },
    take: limit,
    select: { id: true, title: true, status: true, startDate: true, location: true },
  });
}

export type RecentAuditEntry = AuditLogListRow;

/** The most recent audit trail entries across every module — logins aside, this is the one
 * place "what just happened across the whole admin system" is visible at a glance. Delegates
 * to the same query the full `/admin/audit-logs` viewer uses (unfiltered, page 1), rather
 * than a second hand-rolled query, so the two can never show inconsistent results. */
export async function getRecentAuditActivity(limit = 10): Promise<AuditLogListRow[]> {
  const { rows } = await getAuditLogPage({ page: 1 });
  return rows.slice(0, limit);
}
