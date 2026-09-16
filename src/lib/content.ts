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

// The site logo and principal's photo are ordinary `Media` rows attached generically via
// (entityType, entityId) rather than a dedicated column (schema.prisma §15) — mirror the
// visibility rules in src/app/api/files/media/[id]/route.ts's `resolveMediaVisibility` (a
// logo is public once the college is real, non-placeholder data; a principal photo is public
// once its CollegeProfile is PUBLISHED) so these never resolve to an asset the file route
// would actually refuse to serve.
export const getCollegeLogo = cache(async () => {
  const college = await getPrimaryCollege();
  if (!college || college.isPlaceholder) return null;
  return prisma.media.findFirst({
    where: { collegeId: college.id, entityType: "College", entityId: college.id },
    orderBy: { createdAt: "desc" },
  });
});

export const getPrincipalPhoto = cache(async () => {
  const profile = await getCollegeProfile();
  if (!profile) return null;
  return prisma.media.findFirst({
    where: { entityType: "CollegeProfile", entityId: profile.id },
    orderBy: { createdAt: "desc" },
  });
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
    // `nulls: "last"` matters here: Postgres's default for `DESC` is NULLS FIRST, which
    // would otherwise rank every notice with no explicit publishDate ahead of every dated
    // one — the opposite of "most recent first."
    orderBy: [{ publishDate: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
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
    // See getNotices()'s comment — NULLS LAST, or an undated notice would always outrank a
    // dated one as "the current announcement," regardless of actual recency.
    orderBy: [{ publishDate: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
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

/**
 * Published gallery photos keyed by their (lowercased, trimmed) caption — lets other public
 * sections (Hero, IntroSection, FacilitiesSection, EventsSection, ...) reuse a real Gallery
 * photo as their own illustrative image, by matching against their own content's name/title,
 * without a bespoke Media upload flow (and its own visibility-route branch) for every module.
 * A soft, content-based link rather than a real FK — captions can drift from what a section
 * looks up for, in which case that section's slot just falls back to MediaSlot's placeholder.
 */
export const getGalleryPhotoMap = cache(async () => {
  const collegeId = await primaryCollegeId();
  const map = new Map<string, { mediaId: string; altText: string }>();
  if (!collegeId) return map;

  const items = await prisma.galleryItem.findMany({
    where: { collegeId, status: "PUBLISHED" },
    include: { media: { select: { id: true, altText: true } } },
  });
  for (const item of items) {
    if (item.caption) {
      map.set(item.caption.trim().toLowerCase(), { mediaId: item.media.id, altText: item.media.altText });
    }
  }
  return map;
});

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
 * True when a document is currently reachable by the public — `status: PUBLISHED` alone
 * isn't enough, since `publishDate`/`expiryDate` let staff schedule a document's live window
 * without a separate status change (mirrors Notice's publishDate/expiryDate pattern above).
 * Reused by the file-serving route (src/app/api/files/documents/[id]/route.ts) so the exact
 * same rule gates both "does it appear on /downloads" and "can the file be downloaded
 * directly" — CLAUDE.md rule 5's "no arbitrary file exposure" would be trivially bypassable
 * if those two checks could ever drift apart.
 */
export function isDocumentPubliclyVisible(document: {
  status: string;
  publishDate: Date | null;
  expiryDate: Date | null;
}): boolean {
  const now = new Date();
  if (document.status !== "PUBLISHED") return false;
  if (document.publishDate && document.publishDate > now) return false;
  if (document.expiryDate && document.expiryDate < now) return false;
  return true;
}

/** The Prisma `where` fragment for "currently within its publish/expiry window" — shared by
 * `getDocuments()` and `searchSite()` so a document's search-result visibility can never
 * drift from its `/downloads` visibility (both ultimately answer the same question
 * `isDocumentPubliclyVisible` answers for a single already-fetched row). */
function documentWindowWhere(now: Date) {
  return [
    { OR: [{ publishDate: null }, { publishDate: { lte: now } }] },
    { OR: [{ expiryDate: null }, { expiryDate: { gte: now } }] },
  ];
}

/**
 * `Document` is a generic attachment keyed by `(entityType, entityId)` — see
 * prisma/schema.prisma §15 — but now carries its own `status`/publish lifecycle (rule 4),
 * so this only ever returns documents an EDITOR/REVIEWER has explicitly published, not
 * every attachment on every record for the college.
 */
export async function getDocuments() {
  const collegeId = await primaryCollegeId();
  if (!collegeId) return [];
  const now = new Date();
  return prisma.document.findMany({
    where: { collegeId, status: "PUBLISHED", AND: documentWindowWhere(now) },
    orderBy: { uploadedAt: "desc" },
  });
}

// --- Search ----------------------------------------------------------------------------------

/**
 * Static site pages searchable alongside database content — there's no "Page" table, so this
 * is the same 20-route set `src/lib/navigation.ts`'s `PUBLIC_NAV_LINKS` renders as the main
 * nav, enriched with a short description to search/snippet against and match on. Purely
 * navigational chrome text (not college-specific data), consistent with every other bit of
 * static UI copy elsewhere on the site (CLAUDE.md rule 1). `/search` itself is excluded —
 * searching for the search page isn't a useful result.
 */
const SEARCHABLE_PAGES: { title: string; description: string; href: string }[] = [
  { title: "Home", description: "College homepage — announcements, quick links, and an overview.", href: "/" },
  { title: "About", description: "College profile, history, vision and mission, and the Principal's message.", href: "/about" },
  { title: "Academics", description: "Departments, academic programs, the academic calendar, and timetables.", href: "/academics" },
  { title: "Admissions", description: "Admission cycles, eligibility criteria, fee structures, and enrollment statistics.", href: "/admissions" },
  { title: "Faculty", description: "Teaching staff — designations, qualifications, and contact details.", href: "/faculty" },
  { title: "Staff", description: "Non-teaching staff directory.", href: "/staff" },
  { title: "Campus", description: "Campus infrastructure and location.", href: "/campus" },
  { title: "Notices", description: "Official notices and circulars.", href: "/notices" },
  { title: "Events", description: "Events, seminars, workshops, and activities.", href: "/events" },
  { title: "Gallery", description: "Photo gallery of college life.", href: "/gallery" },
  { title: "Examinations", description: "Examination schedules and information.", href: "/examinations" },
  { title: "Results", description: "Published examination results.", href: "/results" },
  { title: "Scholarships", description: "Scholarships available to students.", href: "/scholarships" },
  { title: "Student Support", description: "Student support services offered by the college.", href: "/student-support" },
  { title: "Rules & Regulations", description: "College policies and regulations.", href: "/rules" },
  { title: "Affiliation", description: "University affiliation details.", href: "/affiliation" },
  { title: "Grievance", description: "Submit a confidential grievance to the college.", href: "/grievance" },
  { title: "Contact", description: "How to contact the college.", href: "/contact" },
  { title: "Downloads", description: "Downloadable forms, circulars, and documents.", href: "/downloads" },
];

export const SEARCH_CATEGORIES = [
  "pages",
  "notices",
  "events",
  "programs",
  "faculty",
  "documents",
  "policies",
  "regulations",
] as const;

export type SearchCategory = (typeof SEARCH_CATEGORIES)[number];

export const SEARCH_CATEGORY_LABELS: Record<SearchCategory, string> = {
  pages: "Pages",
  notices: "Notices",
  events: "Events",
  programs: "Programs",
  faculty: "Faculty",
  documents: "Documents",
  policies: "Policies",
  regulations: "Regulations",
};

export function isSearchCategory(value: string): value is SearchCategory {
  return (SEARCH_CATEGORIES as readonly string[]).includes(value);
}

export type SearchResult = {
  type: SearchCategory;
  typeLabel: string;
  title: string;
  snippet: string | null;
  href: string;
};

export type SearchResponse = {
  results: SearchResult[];
  totalCount: number;
  totalPages: number;
  page: number;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * A simple, deterministic relevance score (not a generic full-text-search substitute — this
 * app has no full-text index, and every candidate is already a substring match from the
 * database query, so this only has to *rank* matches, not find them): an exact title match
 * ranks highest, then a title that starts with the query, then a whole-word match inside the
 * title, then any other substring match in the title, with a small bonus if the query also
 * appears in the snippet/body. Ties break alphabetically by title so ordering stays stable
 * across runs (never by timestamp, which would make test expectations flaky).
 */
function scoreMatch(query: string, title: string, snippet: string | null): number {
  const q = query.toLowerCase();
  const t = title.toLowerCase();
  let score = 0;

  if (t === q) {
    score += 100;
  } else if (t.startsWith(q)) {
    score += 70;
  } else if (new RegExp(`\\b${escapeRegExp(q)}\\b`).test(t)) {
    score += 50;
  } else if (t.includes(q)) {
    score += 30;
  }

  if (snippet && snippet.toLowerCase().includes(q)) {
    score += 10;
  }

  return score;
}

const SEARCH_DEFAULT_PAGE_SIZE = 10;
// Bounds how many rows per category are pulled from the database before in-memory ranking —
// generous for a single-college site's realistic content volume, and prevents one very large
// table from making a search request unbounded.
const SEARCH_CANDIDATE_LIMIT = 50;

/**
 * Cross-module keyword search over published content only (CLAUDE.md rule 4 — draft content
 * must never be discoverable publicly, including through search) — pages, notices, events,
 * programs, faculty, documents, policies, and regulations. Supports an optional category
 * filter and paginates the final, relevance-ranked result list (never per-category — a
 * result on page 2 must be the next most relevant overall, not just the next row from
 * whichever table happened to be queried).
 */
export async function searchSite(params: {
  query: string;
  category?: SearchCategory;
  page?: number;
  pageSize?: number;
}): Promise<SearchResponse> {
  const trimmed = params.query.trim();
  const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : SEARCH_DEFAULT_PAGE_SIZE;
  const page = params.page && params.page > 0 ? params.page : 1;

  if (trimmed.length === 0) {
    return { results: [], totalCount: 0, totalPages: 1, page: 1 };
  }

  const collegeId = await primaryCollegeId();
  const wants = (category: SearchCategory) => !params.category || params.category === category;
  const contains = { contains: trimmed, mode: "insensitive" as const };
  const take = SEARCH_CANDIDATE_LIMIT;
  const now = new Date();

  const q = trimmed.toLowerCase();
  const pageMatches =
    wants("pages")
      ? SEARCHABLE_PAGES.filter(
          (p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
        )
      : [];

  const [notices, events, programs, faculty, documents, policies, regulations] = collegeId
    ? await Promise.all([
        wants("notices")
          ? prisma.notice.findMany({
              where: { collegeId, status: "PUBLISHED", OR: [{ title: contains }, { body: contains }] },
              take,
            })
          : Promise.resolve([]),
        wants("events")
          ? prisma.event.findMany({
              where: {
                collegeId,
                status: "PUBLISHED",
                OR: [{ title: contains }, { description: contains }],
              },
              take,
            })
          : Promise.resolve([]),
        wants("programs")
          ? prisma.program.findMany({
              where: {
                collegeId,
                status: "PUBLISHED",
                OR: [{ name: contains }, { description: contains }],
              },
              take,
            })
          : Promise.resolve([]),
        wants("faculty")
          ? prisma.faculty.findMany({
              where: {
                collegeId,
                status: "PUBLISHED",
                OR: [{ name: contains }, { designation: contains }],
              },
              take,
            })
          : Promise.resolve([]),
        wants("documents")
          ? prisma.document.findMany({
              where: {
                collegeId,
                status: "PUBLISHED",
                AND: documentWindowWhere(now),
                OR: [{ title: contains }, { description: contains }],
              },
              take,
            })
          : Promise.resolve([]),
        wants("policies")
          ? prisma.policy.findMany({
              where: { collegeId, status: "PUBLISHED", OR: [{ title: contains }, { body: contains }] },
              take,
            })
          : Promise.resolve([]),
        wants("regulations")
          ? prisma.regulation.findMany({
              where: { collegeId, status: "PUBLISHED", OR: [{ title: contains }, { body: contains }] },
              take,
            })
          : Promise.resolve([]),
      ])
    : [[], [], [], [], [], [], []];

  const all: SearchResult[] = [
    ...pageMatches.map((p) => ({
      type: "pages" as const,
      typeLabel: SEARCH_CATEGORY_LABELS.pages,
      title: p.title,
      snippet: p.description,
      href: p.href,
    })),
    ...notices.map((n) => ({
      type: "notices" as const,
      typeLabel: SEARCH_CATEGORY_LABELS.notices,
      title: n.title,
      snippet: n.body,
      href: "/notices",
    })),
    ...events.map((e) => ({
      type: "events" as const,
      typeLabel: SEARCH_CATEGORY_LABELS.events,
      title: e.title,
      snippet: e.description,
      href: "/events",
    })),
    ...programs.map((p) => ({
      type: "programs" as const,
      typeLabel: SEARCH_CATEGORY_LABELS.programs,
      title: p.name,
      snippet: p.description,
      href: "/academics",
    })),
    ...faculty.map((f) => ({
      type: "faculty" as const,
      typeLabel: SEARCH_CATEGORY_LABELS.faculty,
      title: f.name,
      snippet: f.designation,
      href: "/faculty",
    })),
    ...documents.map((d) => ({
      type: "documents" as const,
      typeLabel: SEARCH_CATEGORY_LABELS.documents,
      title: d.title,
      snippet: d.description,
      href: "/downloads",
    })),
    ...policies.map((p) => ({
      type: "policies" as const,
      typeLabel: SEARCH_CATEGORY_LABELS.policies,
      title: p.title,
      snippet: p.body,
      href: "/rules",
    })),
    ...regulations.map((r) => ({
      type: "regulations" as const,
      typeLabel: SEARCH_CATEGORY_LABELS.regulations,
      title: r.title,
      snippet: r.body,
      href: "/rules",
    })),
  ];

  all.sort((a, b) => {
    const scoreDiff = scoreMatch(trimmed, b.title, b.snippet) - scoreMatch(trimmed, a.title, a.snippet);
    return scoreDiff !== 0 ? scoreDiff : a.title.localeCompare(b.title);
  });

  const totalCount = all.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const skip = (page - 1) * pageSize;
  const results = all.slice(skip, skip + pageSize);

  return { results, totalCount, totalPages, page };
}
