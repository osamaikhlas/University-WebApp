import "server-only";

import type { ContentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPrimaryCollege } from "@/lib/content";
import type { Permission } from "@/lib/auth/permissions";

/**
 * The cross-module "things waiting on me" queue (progress.md's long-standing Next step —
 * previously a REVIEWER could only discover pending work by manually filtering each of ~28
 * modules' own list to `?status=SUBMITTED`/`?status=UNDER_REVIEW`). Any status short of
 * PUBLISHED that still requires a *publish-tier* action to move forward — SUBMITTED (needs
 * `start_review`), UNDER_REVIEW (needs `approve`/`reject`), APPROVED (needs `publish`) —
 * counts as "pending," scoped to exactly the content domains the current user actually holds
 * `<domain>:publish` for (src/lib/admin/module-permissions.ts), so an EDITOR (manage-tier
 * only) never sees this queue at all — matches `approval_workflow:view`'s real audience
 * (PRINCIPAL/ADMINISTRATOR/REVIEWER/SUPER_ADMIN, all publish-tier roles).
 */

const PENDING_STATUSES: ContentStatus[] = ["SUBMITTED", "UNDER_REVIEW", "APPROVED"];

export type ApprovalQueueItem = {
  id: string;
  title: string;
  moduleLabel: string;
  status: ContentStatus;
  updatedAt: Date;
  href: string;
};

type Domain = "content_general" | "content_admissions" | "content_examinations" | "content_faculty";

type QueueModule = {
  domain: Domain;
  moduleLabel: string;
  findPending: (collegeId: string) => Promise<Array<{ id: string; title: string; status: ContentStatus; updatedAt: Date; href: string }>>;
};

const QUEUE_MODULES: QueueModule[] = [
  {
    domain: "content_general",
    moduleLabel: "Departments",
    findPending: async (collegeId) =>
      prisma.department.findMany({
        where: { collegeId, status: { in: PENDING_STATUSES } },
        select: { id: true, name: true, status: true, updatedAt: true },
      }).then((rows) => rows.map((r) => ({ id: r.id, title: r.name, status: r.status, updatedAt: r.updatedAt, href: `/admin/departments/${r.id}` }))),
  },
  {
    domain: "content_general",
    moduleLabel: "Programs",
    findPending: async (collegeId) =>
      prisma.program.findMany({
        where: { collegeId, status: { in: PENDING_STATUSES } },
        select: { id: true, name: true, status: true, updatedAt: true },
      }).then((rows) => rows.map((r) => ({ id: r.id, title: r.name, status: r.status, updatedAt: r.updatedAt, href: `/admin/programs/${r.id}` }))),
  },
  {
    domain: "content_general",
    moduleLabel: "Notices",
    findPending: async (collegeId) =>
      prisma.notice.findMany({
        where: { collegeId, status: { in: PENDING_STATUSES } },
        select: { id: true, title: true, status: true, updatedAt: true },
      }).then((rows) => rows.map((r) => ({ ...r, href: `/admin/notices/${r.id}` }))),
  },
  {
    domain: "content_general",
    moduleLabel: "Events",
    findPending: async (collegeId) =>
      prisma.event.findMany({
        where: { collegeId, status: { in: PENDING_STATUSES } },
        select: { id: true, title: true, status: true, updatedAt: true },
      }).then((rows) => rows.map((r) => ({ ...r, href: `/admin/events/${r.id}` }))),
  },
  {
    domain: "content_general",
    moduleLabel: "Seminars",
    findPending: async (collegeId) =>
      prisma.seminar.findMany({
        where: { collegeId, status: { in: PENDING_STATUSES } },
        select: { id: true, title: true, status: true, updatedAt: true },
      }).then((rows) => rows.map((r) => ({ ...r, href: `/admin/seminars/${r.id}` }))),
  },
  {
    domain: "content_general",
    moduleLabel: "Workshops",
    findPending: async (collegeId) =>
      prisma.workshop.findMany({
        where: { collegeId, status: { in: PENDING_STATUSES } },
        select: { id: true, title: true, status: true, updatedAt: true },
      }).then((rows) => rows.map((r) => ({ ...r, href: `/admin/workshops/${r.id}` }))),
  },
  {
    domain: "content_general",
    moduleLabel: "Academic Calendar",
    findPending: async (collegeId) =>
      prisma.academicCalendar.findMany({
        where: { collegeId, status: { in: PENDING_STATUSES } },
        select: { id: true, title: true, status: true, updatedAt: true },
      }).then((rows) => rows.map((r) => ({ ...r, href: `/admin/academic-calendar/${r.id}` }))),
  },
  {
    domain: "content_general",
    moduleLabel: "Timetables",
    findPending: async (collegeId) =>
      prisma.timetable.findMany({
        where: { collegeId, status: { in: PENDING_STATUSES } },
        select: { id: true, classGroup: true, status: true, updatedAt: true },
      }).then((rows) => rows.map((r) => ({ id: r.id, title: `Timetable — ${r.classGroup}`, status: r.status, updatedAt: r.updatedAt, href: `/admin/timetables/${r.id}` }))),
  },
  {
    domain: "content_general",
    moduleLabel: "Documents",
    findPending: async (collegeId) =>
      prisma.document.findMany({
        where: { collegeId, status: { in: PENDING_STATUSES } },
        select: { id: true, title: true, status: true, updatedAt: true },
      }).then((rows) => rows.map((r) => ({ ...r, href: `/admin/documents/${r.id}` }))),
  },
  {
    domain: "content_general",
    moduleLabel: "Infrastructure",
    findPending: async (collegeId) =>
      prisma.infrastructure.findMany({
        where: { collegeId, status: { in: PENDING_STATUSES } },
        select: { id: true, name: true, status: true, updatedAt: true },
      }).then((rows) => rows.map((r) => ({ id: r.id, title: r.name, status: r.status, updatedAt: r.updatedAt, href: `/admin/infrastructure/${r.id}` }))),
  },
  {
    domain: "content_general",
    moduleLabel: "Activities",
    findPending: async (collegeId) =>
      prisma.activity.findMany({
        where: { collegeId, status: { in: PENDING_STATUSES } },
        select: { id: true, title: true, status: true, updatedAt: true },
      }).then((rows) => rows.map((r) => ({ ...r, href: `/admin/activities/${r.id}` }))),
  },
  {
    domain: "content_general",
    moduleLabel: "Gallery albums",
    findPending: async (collegeId) =>
      prisma.galleryAlbum.findMany({
        where: { collegeId, status: { in: PENDING_STATUSES } },
        select: { id: true, title: true, status: true, updatedAt: true },
      }).then((rows) => rows.map((r) => ({ ...r, href: `/admin/gallery/${r.id}` }))),
  },
  {
    domain: "content_general",
    moduleLabel: "Gallery photos",
    findPending: async (collegeId) =>
      prisma.galleryItem.findMany({
        where: { collegeId, status: { in: PENDING_STATUSES } },
        select: { id: true, albumId: true, caption: true, status: true, updatedAt: true },
      }).then((rows) => rows.map((r) => ({ id: r.id, title: r.caption ?? "Untitled photo", status: r.status, updatedAt: r.updatedAt, href: `/admin/gallery/${r.albumId}/items/${r.id}` }))),
  },
  {
    domain: "content_general",
    moduleLabel: "Scholarships",
    findPending: async (collegeId) =>
      prisma.scholarship.findMany({
        where: { collegeId, status: { in: PENDING_STATUSES } },
        select: { id: true, name: true, status: true, updatedAt: true },
      }).then((rows) => rows.map((r) => ({ id: r.id, title: r.name, status: r.status, updatedAt: r.updatedAt, href: `/admin/scholarships/${r.id}` }))),
  },
  {
    domain: "content_general",
    moduleLabel: "Student support",
    findPending: async (collegeId) =>
      prisma.studentSupport.findMany({
        where: { collegeId, status: { in: PENDING_STATUSES } },
        select: { id: true, name: true, status: true, updatedAt: true },
      }).then((rows) => rows.map((r) => ({ id: r.id, title: r.name, status: r.status, updatedAt: r.updatedAt, href: `/admin/student-support/${r.id}` }))),
  },
  {
    domain: "content_general",
    moduleLabel: "Policies",
    findPending: async (collegeId) =>
      prisma.policy.findMany({
        where: { collegeId, status: { in: PENDING_STATUSES } },
        select: { id: true, title: true, status: true, updatedAt: true },
      }).then((rows) => rows.map((r) => ({ ...r, href: `/admin/policies/${r.id}` }))),
  },
  {
    domain: "content_general",
    moduleLabel: "Regulations",
    findPending: async (collegeId) =>
      prisma.regulation.findMany({
        where: { collegeId, status: { in: PENDING_STATUSES } },
        select: { id: true, title: true, status: true, updatedAt: true },
      }).then((rows) => rows.map((r) => ({ ...r, href: `/admin/regulations/${r.id}` }))),
  },
  {
    domain: "content_general",
    moduleLabel: "Affiliation",
    findPending: async (collegeId) =>
      prisma.affiliation.findMany({
        where: { collegeId, status: { in: PENDING_STATUSES } },
        select: { id: true, universityName: true, status: true, updatedAt: true },
      }).then((rows) => rows.map((r) => ({ id: r.id, title: `Affiliation — ${r.universityName}`, status: r.status, updatedAt: r.updatedAt, href: `/admin/affiliation/${r.id}` }))),
  },
  {
    domain: "content_general",
    moduleLabel: "Contact",
    findPending: async (collegeId) =>
      prisma.contact.findMany({
        where: { collegeId, status: { in: PENDING_STATUSES } },
        select: { id: true, label: true, type: true, status: true, updatedAt: true },
      }).then((rows) => rows.map((r) => ({ id: r.id, title: r.label ?? `${r.type} contact`, status: r.status, updatedAt: r.updatedAt, href: `/admin/contact/${r.id}` }))),
  },
  {
    domain: "content_general",
    moduleLabel: "College profile",
    findPending: async (collegeId) =>
      prisma.collegeProfile.findMany({
        where: { collegeId, status: { in: PENDING_STATUSES } },
        select: { id: true, status: true, updatedAt: true },
      }).then((rows) => rows.map((r) => ({ id: r.id, title: "College profile", status: r.status, updatedAt: r.updatedAt, href: `/admin/college-profile` }))),
  },
  {
    domain: "content_general",
    moduleLabel: "Location",
    findPending: async (collegeId) =>
      prisma.location.findMany({
        where: { collegeId, status: { in: PENDING_STATUSES } },
        select: { id: true, status: true, updatedAt: true },
      }).then((rows) => rows.map((r) => ({ id: r.id, title: "Location", status: r.status, updatedAt: r.updatedAt, href: `/admin/location` }))),
  },
  {
    domain: "content_faculty",
    moduleLabel: "Faculty",
    findPending: async (collegeId) =>
      prisma.faculty.findMany({
        where: { collegeId, status: { in: PENDING_STATUSES } },
        select: { id: true, name: true, status: true, updatedAt: true },
      }).then((rows) => rows.map((r) => ({ id: r.id, title: r.name, status: r.status, updatedAt: r.updatedAt, href: `/admin/faculty/${r.id}` }))),
  },
  {
    domain: "content_faculty",
    moduleLabel: "Staff",
    findPending: async (collegeId) =>
      prisma.staff.findMany({
        where: { collegeId, status: { in: PENDING_STATUSES } },
        select: { id: true, name: true, status: true, updatedAt: true },
      }).then((rows) => rows.map((r) => ({ id: r.id, title: r.name, status: r.status, updatedAt: r.updatedAt, href: `/admin/staff/${r.id}` }))),
  },
  {
    domain: "content_faculty",
    moduleLabel: "Clubs",
    findPending: async (collegeId) =>
      prisma.club.findMany({
        where: { collegeId, status: { in: PENDING_STATUSES } },
        select: { id: true, name: true, status: true, updatedAt: true },
      }).then((rows) => rows.map((r) => ({ id: r.id, title: r.name, status: r.status, updatedAt: r.updatedAt, href: `/admin/clubs/${r.id}` }))),
  },
  {
    domain: "content_admissions",
    moduleLabel: "Admissions",
    findPending: async (collegeId) =>
      prisma.admission.findMany({
        where: { collegeId, status: { in: PENDING_STATUSES } },
        select: { id: true, academicYear: true, status: true, updatedAt: true },
      }).then((rows) => rows.map((r) => ({ id: r.id, title: `Admission cycle ${r.academicYear}`, status: r.status, updatedAt: r.updatedAt, href: `/admin/admissions/${r.id}` }))),
  },
  {
    domain: "content_admissions",
    moduleLabel: "Fee structures",
    findPending: async (collegeId) =>
      prisma.feeStructure.findMany({
        where: { collegeId, status: { in: PENDING_STATUSES } },
        select: { id: true, feeType: true, status: true, updatedAt: true },
      }).then((rows) => rows.map((r) => ({ id: r.id, title: r.feeType, status: r.status, updatedAt: r.updatedAt, href: `/admin/fee-structures/${r.id}` }))),
  },
  {
    domain: "content_admissions",
    moduleLabel: "Enrollment statistics",
    findPending: async (collegeId) =>
      prisma.enrollmentStatistic.findMany({
        where: { collegeId, status: { in: PENDING_STATUSES } },
        select: { id: true, academicYear: true, status: true, updatedAt: true },
      }).then((rows) => rows.map((r) => ({ id: r.id, title: `Enrollment statistics ${r.academicYear}`, status: r.status, updatedAt: r.updatedAt, href: `/admin/enrollment-statistics/${r.id}` }))),
  },
  {
    domain: "content_examinations",
    moduleLabel: "Examinations",
    findPending: async (collegeId) =>
      prisma.examination.findMany({
        where: { collegeId, status: { in: PENDING_STATUSES } },
        select: { id: true, examType: true, status: true, updatedAt: true },
      }).then((rows) => rows.map((r) => ({ id: r.id, title: r.examType, status: r.status, updatedAt: r.updatedAt, href: `/admin/exams/${r.id}` }))),
  },
  {
    domain: "content_examinations",
    moduleLabel: "Results",
    findPending: async (collegeId) =>
      prisma.result.findMany({
        where: { collegeId, status: { in: PENDING_STATUSES } },
        select: { id: true, status: true, updatedAt: true, examination: { select: { examType: true } } },
      }).then((rows) => rows.map((r) => ({ id: r.id, title: `Result — ${r.examination.examType}`, status: r.status, updatedAt: r.updatedAt, href: `/admin/results/${r.id}` }))),
  },
];

const DOMAIN_PUBLISH_PERMISSION: Record<Domain, Permission> = {
  content_general: "content_general:publish",
  content_admissions: "content_admissions:publish",
  content_examinations: "content_examinations:publish",
  content_faculty: "content_faculty:publish",
};

/** Everything currently pending a publish-tier action, across every domain `granted`
 * includes the `:publish` permission for — newest-updated first. */
export async function getApprovalQueue(granted: ReadonlySet<Permission>): Promise<ApprovalQueueItem[]> {
  const college = await getPrimaryCollege();
  if (!college) return [];

  const applicableModules = QUEUE_MODULES.filter((m) => granted.has(DOMAIN_PUBLISH_PERMISSION[m.domain]));
  const results = await Promise.all(applicableModules.map((m) => m.findPending(college.id).then((rows) => rows.map((r) => ({ ...r, moduleLabel: m.moduleLabel })))));

  return results
    .flat()
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}
