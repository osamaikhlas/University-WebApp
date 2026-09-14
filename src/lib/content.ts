import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/prisma";

/**
 * Public-site content queries.
 *
 * Every function here filters to `status: "PUBLISHED"` (CLAUDE.md rule 4 — public users see
 * only published information; draft/unapproved content must never reach a public view or
 * API response). Rows may still carry `isPlaceholder: true` — that means the *content* is
 * seed/demo data clearly marked as such (rule 14), not that it bypasses the publish gate;
 * the UI layer renders `DemoDataNotice` next to any placeholder row it displays.
 *
 * This is a single-college deployment for now (see progress.md's open questions on
 * single-tenant vs. template), so every query resolves "the" college once via
 * `getPrimaryCollege`, memoized per request with React's `cache()`.
 */

export const getPrimaryCollege = cache(async () => {
  return prisma.college.findFirst({ orderBy: { createdAt: "asc" } });
});

async function primaryCollegeId(): Promise<string | null> {
  const college = await getPrimaryCollege();
  return college?.id ?? null;
}

export const getCollegeProfile = cache(async () => {
  const collegeId = await primaryCollegeId();
  if (!collegeId) return null;
  return prisma.collegeProfile.findFirst({ where: { collegeId, status: "PUBLISHED" } });
});

// --- Academics -----------------------------------------------------------------------------

export async function getDepartments() {
  const collegeId = await primaryCollegeId();
  if (!collegeId) return [];
  return prisma.department.findMany({
    where: { collegeId, status: "PUBLISHED" },
    orderBy: { name: "asc" },
  });
}

export async function getPrograms() {
  const collegeId = await primaryCollegeId();
  if (!collegeId) return [];
  return prisma.program.findMany({
    where: { collegeId, status: "PUBLISHED" },
    include: { department: true },
    orderBy: { name: "asc" },
  });
}

export async function getAcademicCalendar() {
  const collegeId = await primaryCollegeId();
  if (!collegeId) return [];
  return prisma.academicCalendar.findMany({
    where: { collegeId, status: "PUBLISHED" },
    orderBy: { startDate: "asc" },
  });
}

export async function getTimetables() {
  const collegeId = await primaryCollegeId();
  if (!collegeId) return [];
  return prisma.timetable.findMany({
    where: { collegeId, status: "PUBLISHED" },
    include: { program: true },
    orderBy: { effectiveFrom: "desc" },
  });
}

// --- Admissions ----------------------------------------------------------------------------

export async function getAdmissions() {
  const collegeId = await primaryCollegeId();
  if (!collegeId) return [];
  return prisma.admission.findMany({
    where: { collegeId, status: "PUBLISHED" },
    include: { program: true },
    orderBy: { academicYear: "desc" },
  });
}

export async function getFeeStructures() {
  const collegeId = await primaryCollegeId();
  if (!collegeId) return [];
  return prisma.feeStructure.findMany({
    where: { collegeId, status: "PUBLISHED" },
    include: { program: true },
    orderBy: { academicYear: "desc" },
  });
}

export async function getEnrollmentStatistics() {
  const collegeId = await primaryCollegeId();
  if (!collegeId) return [];
  return prisma.enrollmentStatistic.findMany({
    where: { collegeId, status: "PUBLISHED" },
    include: { program: true },
    orderBy: { academicYear: "desc" },
  });
}

// --- People ----------------------------------------------------------------------------------

export async function getFacultyMembers() {
  const collegeId = await primaryCollegeId();
  if (!collegeId) return [];
  return prisma.faculty.findMany({
    where: { collegeId, status: "PUBLISHED" },
    include: { department: true },
    orderBy: { name: "asc" },
  });
}

export async function getStaffMembers() {
  const collegeId = await primaryCollegeId();
  if (!collegeId) return [];
  return prisma.staff.findMany({
    where: { collegeId, status: "PUBLISHED" },
    orderBy: { name: "asc" },
  });
}

// --- Campus (infrastructure + location) ---------------------------------------------------

export async function getInfrastructureItems() {
  const collegeId = await primaryCollegeId();
  if (!collegeId) return [];
  return prisma.infrastructure.findMany({
    where: { collegeId, status: "PUBLISHED" },
    orderBy: { category: "asc" },
  });
}

export async function getLocation() {
  const collegeId = await primaryCollegeId();
  if (!collegeId) return null;
  return prisma.location.findFirst({ where: { collegeId, status: "PUBLISHED" } });
}

// --- Notices ---------------------------------------------------------------------------------

export async function getNotices() {
  const collegeId = await primaryCollegeId();
  if (!collegeId) return [];
  return prisma.notice.findMany({
    where: { collegeId, status: "PUBLISHED" },
    orderBy: [{ publishDate: "desc" }, { createdAt: "desc" }],
  });
}

/**
 * The single most recent notice that is still current (no `expiryDate`, or one in the
 * future) — used for the homepage's "Important announcement" banner. Deliberately doesn't
 * rely on a `category` naming convention the college may not follow consistently; it's just
 * "the latest thing that hasn't expired yet," which every college's data supports for free.
 */
export async function getImportantAnnouncement() {
  const collegeId = await primaryCollegeId();
  if (!collegeId) return null;
  const now = new Date();
  return prisma.notice.findFirst({
    where: {
      collegeId,
      status: "PUBLISHED",
      OR: [{ expiryDate: null }, { expiryDate: { gte: now } }],
    },
    orderBy: [{ publishDate: "desc" }, { createdAt: "desc" }],
  });
}

// --- Events (events, seminars, workshops, activities, clubs) ----------------------------------

export async function getEvents() {
  const collegeId = await primaryCollegeId();
  if (!collegeId) return [];
  return prisma.event.findMany({
    where: { collegeId, status: "PUBLISHED" },
    orderBy: { startDate: "desc" },
  });
}

/** Events that haven't happened yet, soonest first — for the homepage's "Upcoming events". */
export async function getUpcomingEvents(take = 3) {
  const collegeId = await primaryCollegeId();
  if (!collegeId) return [];
  return prisma.event.findMany({
    where: { collegeId, status: "PUBLISHED", startDate: { gte: new Date() } },
    orderBy: { startDate: "asc" },
    take,
  });
}

export async function getSeminars() {
  const collegeId = await primaryCollegeId();
  if (!collegeId) return [];
  return prisma.seminar.findMany({
    where: { collegeId, status: "PUBLISHED" },
    orderBy: { startDate: "desc" },
  });
}

export async function getWorkshops() {
  const collegeId = await primaryCollegeId();
  if (!collegeId) return [];
  return prisma.workshop.findMany({
    where: { collegeId, status: "PUBLISHED" },
    orderBy: { startDate: "desc" },
  });
}

export async function getActivities() {
  const collegeId = await primaryCollegeId();
  if (!collegeId) return [];
  return prisma.activity.findMany({
    where: { collegeId, status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
  });
}

export async function getClubs() {
  const collegeId = await primaryCollegeId();
  if (!collegeId) return [];
  return prisma.club.findMany({
    where: { collegeId, status: "PUBLISHED" },
    include: { facultyAdvisor: true },
    orderBy: { name: "asc" },
  });
}

// --- Gallery -----------------------------------------------------------------------------------

export async function getGalleryAlbums() {
  const collegeId = await primaryCollegeId();
  if (!collegeId) return [];
  return prisma.galleryAlbum.findMany({
    where: { collegeId, status: "PUBLISHED" },
    include: {
      items: {
        where: { status: "PUBLISHED" },
        include: { media: true },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// --- Examinations & results ---------------------------------------------------------------------

export async function getExaminations() {
  const collegeId = await primaryCollegeId();
  if (!collegeId) return [];
  return prisma.examination.findMany({
    where: { collegeId, status: "PUBLISHED" },
    include: { program: true, notice: true },
    orderBy: { scheduleStartDate: "desc" },
  });
}

export async function getResults() {
  const collegeId = await primaryCollegeId();
  if (!collegeId) return [];
  return prisma.result.findMany({
    where: { collegeId, status: "PUBLISHED", isPublic: true },
    include: { program: true, examination: true },
    orderBy: { publishDate: "desc" },
  });
}

// --- Scholarships & student support -------------------------------------------------------------

export async function getScholarships() {
  const collegeId = await primaryCollegeId();
  if (!collegeId) return [];
  return prisma.scholarship.findMany({
    where: { collegeId, status: "PUBLISHED" },
    orderBy: { name: "asc" },
  });
}

export async function getStudentSupportServices() {
  const collegeId = await primaryCollegeId();
  if (!collegeId) return [];
  return prisma.studentSupport.findMany({
    where: { collegeId, status: "PUBLISHED" },
    orderBy: { name: "asc" },
  });
}

// --- Rules (policies + regulations) -------------------------------------------------------------

export async function getPolicies() {
  const collegeId = await primaryCollegeId();
  if (!collegeId) return [];
  return prisma.policy.findMany({
    where: { collegeId, status: "PUBLISHED" },
    orderBy: { title: "asc" },
  });
}

export async function getRegulations() {
  const collegeId = await primaryCollegeId();
  if (!collegeId) return [];
  return prisma.regulation.findMany({
    where: { collegeId, status: "PUBLISHED" },
    orderBy: { title: "asc" },
  });
}

// --- Affiliation ---------------------------------------------------------------------------------

export async function getAffiliations() {
  const collegeId = await primaryCollegeId();
  if (!collegeId) return [];
  return prisma.affiliation.findMany({
    where: { collegeId, status: "PUBLISHED" },
    include: { program: true },
    orderBy: { validFrom: "desc" },
  });
}

// --- Contact -------------------------------------------------------------------------------------

export async function getContacts() {
  const collegeId = await primaryCollegeId();
  if (!collegeId) return [];
  return prisma.contact.findMany({
    where: { collegeId, status: "PUBLISHED" },
    orderBy: { type: "asc" },
  });
}

// --- Downloads -----------------------------------------------------------------------------------

/**
 * `Document` is a generic attachment keyed by `(entityType, entityId)` — see
 * prisma/schema.prisma §15 — but now carries its own `status`/publish lifecycle (rule 4),
 * so this only ever returns documents an EDITOR/REVIEWER has explicitly published, not
 * every attachment on every record for the college.
 */
export async function getDocuments() {
  const collegeId = await primaryCollegeId();
  if (!collegeId) return [];
  return prisma.document.findMany({
    where: { collegeId, status: "PUBLISHED" },
    orderBy: { uploadedAt: "desc" },
  });
}

// --- Search ----------------------------------------------------------------------------------

export type SearchResult = {
  type: string;
  title: string;
  snippet: string | null;
  href: string;
};

/**
 * A simple cross-module keyword search over published content only (rule 4 — draft content
 * must never be discoverable publicly, including through search). Case-insensitive
 * substring match on title/body-like fields across a representative set of modules;
 * capped per module so one large table can't crowd out the rest of the results.
 */
export async function searchSite(query: string): Promise<SearchResult[]> {
  const collegeId = await primaryCollegeId();
  const trimmed = query.trim();
  if (!collegeId || trimmed.length === 0) return [];

  const contains = { contains: trimmed, mode: "insensitive" as const };
  const take = 10;

  const [notices, events, programs, faculty, scholarships, policies] = await Promise.all([
    prisma.notice.findMany({
      where: { collegeId, status: "PUBLISHED", title: contains },
      take,
    }),
    prisma.event.findMany({
      where: { collegeId, status: "PUBLISHED", title: contains },
      take,
    }),
    prisma.program.findMany({
      where: { collegeId, status: "PUBLISHED", name: contains },
      take,
    }),
    prisma.faculty.findMany({
      where: { collegeId, status: "PUBLISHED", name: contains },
      take,
    }),
    prisma.scholarship.findMany({
      where: { collegeId, status: "PUBLISHED", name: contains },
      take,
    }),
    prisma.policy.findMany({
      where: { collegeId, status: "PUBLISHED", title: contains },
      take,
    }),
  ]);

  return [
    ...notices.map((n) => ({ type: "Notice", title: n.title, snippet: n.body, href: "/notices" })),
    ...events.map((e) => ({ type: "Event", title: e.title, snippet: e.description, href: "/events" })),
    ...programs.map((p) => ({ type: "Program", title: p.name, snippet: p.description, href: "/academics" })),
    ...faculty.map((f) => ({ type: "Faculty", title: f.name, snippet: f.designation, href: "/faculty" })),
    ...scholarships.map((s) => ({
      type: "Scholarship",
      title: s.name,
      snippet: s.description,
      href: "/scholarships",
    })),
    ...policies.map((p) => ({ type: "Policy", title: p.title, snippet: p.body, href: "/rules" })),
  ];
}
