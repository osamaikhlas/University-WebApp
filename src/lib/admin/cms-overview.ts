import "server-only";

import { prisma } from "@/lib/prisma";
import { getPrimaryCollege } from "@/lib/content";
import type { Permission } from "@/lib/auth/permissions";

type Domain = "content_general" | "content_admissions" | "content_examinations" | "content_faculty";

export type CmsModuleSummary = {
  label: string;
  href: string;
  domain: Domain;
  total: number;
  pending: number;
};

type CmsModule = {
  label: string;
  href: string;
  domain: Domain;
  count: (collegeId: string) => Promise<{ total: number; pending: number }>;
};

const PENDING_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "APPROVED"] as const;

function counter(
  find: (args: { where: Record<string, unknown> }) => Promise<number>,
): (collegeId: string) => Promise<{ total: number; pending: number }> {
  return async (collegeId) => {
    const [total, pending] = await Promise.all([
      find({ where: { collegeId } }),
      find({ where: { collegeId, status: { in: PENDING_STATUSES } } }),
    ]);
    return { total, pending };
  };
}

const CMS_MODULES: CmsModule[] = [
  { label: "College Profile", href: "/admin/college-profile", domain: "content_general", count: counter((a) => prisma.collegeProfile.count(a)) },
  { label: "Departments", href: "/admin/departments", domain: "content_general", count: counter((a) => prisma.department.count(a)) },
  { label: "Programs", href: "/admin/programs", domain: "content_general", count: counter((a) => prisma.program.count(a)) },
  { label: "Notices", href: "/admin/notices", domain: "content_general", count: counter((a) => prisma.notice.count(a)) },
  { label: "Events", href: "/admin/events", domain: "content_general", count: counter((a) => prisma.event.count(a)) },
  { label: "Seminars", href: "/admin/seminars", domain: "content_general", count: counter((a) => prisma.seminar.count(a)) },
  { label: "Workshops", href: "/admin/workshops", domain: "content_general", count: counter((a) => prisma.workshop.count(a)) },
  { label: "Academic Calendar", href: "/admin/academic-calendar", domain: "content_general", count: counter((a) => prisma.academicCalendar.count(a)) },
  { label: "Timetables", href: "/admin/timetables", domain: "content_general", count: counter((a) => prisma.timetable.count(a)) },
  { label: "Documents", href: "/admin/documents", domain: "content_general", count: counter((a) => prisma.document.count(a)) },
  { label: "Infrastructure", href: "/admin/infrastructure", domain: "content_general", count: counter((a) => prisma.infrastructure.count(a)) },
  { label: "Activities", href: "/admin/activities", domain: "content_general", count: counter((a) => prisma.activity.count(a)) },
  { label: "Gallery", href: "/admin/gallery", domain: "content_general", count: counter((a) => prisma.galleryAlbum.count(a)) },
  { label: "Scholarships", href: "/admin/scholarships", domain: "content_general", count: counter((a) => prisma.scholarship.count(a)) },
  { label: "Student Support", href: "/admin/student-support", domain: "content_general", count: counter((a) => prisma.studentSupport.count(a)) },
  { label: "Policies", href: "/admin/policies", domain: "content_general", count: counter((a) => prisma.policy.count(a)) },
  { label: "Regulations", href: "/admin/regulations", domain: "content_general", count: counter((a) => prisma.regulation.count(a)) },
  { label: "Affiliation", href: "/admin/affiliation", domain: "content_general", count: counter((a) => prisma.affiliation.count(a)) },
  { label: "Contact", href: "/admin/contact", domain: "content_general", count: counter((a) => prisma.contact.count(a)) },
  { label: "Location", href: "/admin/location", domain: "content_general", count: counter((a) => prisma.location.count(a)) },
  { label: "Faculty", href: "/admin/faculty", domain: "content_faculty", count: counter((a) => prisma.faculty.count(a)) },
  { label: "Staff", href: "/admin/staff", domain: "content_faculty", count: counter((a) => prisma.staff.count(a)) },
  { label: "Clubs", href: "/admin/clubs", domain: "content_faculty", count: counter((a) => prisma.club.count(a)) },
  { label: "Admissions", href: "/admin/admissions", domain: "content_admissions", count: counter((a) => prisma.admission.count(a)) },
  { label: "Fee Structures", href: "/admin/fee-structures", domain: "content_admissions", count: counter((a) => prisma.feeStructure.count(a)) },
  { label: "Enrollment Statistics", href: "/admin/enrollment-statistics", domain: "content_admissions", count: counter((a) => prisma.enrollmentStatistic.count(a)) },
  { label: "Exams", href: "/admin/exams", domain: "content_examinations", count: counter((a) => prisma.examination.count(a)) },
  { label: "Results", href: "/admin/results", domain: "content_examinations", count: counter((a) => prisma.result.count(a)) },
];

const DOMAIN_VIEW_PERMISSION: Record<Domain, Permission> = {
  content_general: "content_general:view",
  content_admissions: "content_admissions:view",
  content_examinations: "content_examinations:view",
  content_faculty: "content_faculty:view",
};

export const CMS_DOMAIN_LABELS: Record<Domain, string> = {
  content_general: "General content",
  content_admissions: "Admissions",
  content_examinations: "Examinations",
  content_faculty: "Faculty & staff",
};

/** Every CMS module the current user can view, grouped by domain, with a total record count
 * and how many are currently sitting in SUBMITTED/UNDER_REVIEW/APPROVED (need attention). */
export async function getCmsOverview(
  granted: ReadonlySet<Permission>,
): Promise<Record<Domain, CmsModuleSummary[]>> {
  const college = await getPrimaryCollege();
  const empty: Record<Domain, CmsModuleSummary[]> = {
    content_general: [],
    content_admissions: [],
    content_examinations: [],
    content_faculty: [],
  };
  if (!college) return empty;

  const visibleModules = CMS_MODULES.filter((m) => granted.has(DOMAIN_VIEW_PERMISSION[m.domain]));
  const summaries = await Promise.all(
    visibleModules.map(async (m) => {
      const { total, pending } = await m.count(college.id);
      return { label: m.label, href: m.href, domain: m.domain, total, pending };
    }),
  );

  const grouped = { ...empty };
  for (const summary of summaries) {
    grouped[summary.domain] = [...grouped[summary.domain], summary];
  }
  return grouped;
}
