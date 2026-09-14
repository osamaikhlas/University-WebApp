/**
 * Route tables for the public site and admin system, kept in one place so the layout
 * navigation and the route structure can't silently drift apart. Matches the scope listed
 * in CLAUDE.md ("Required scope" section), which in turn maps to the 20 circular
 * requirements documented in docs/compliance-matrix.md.
 */

export type NavLink = {
  href: string;
  label: string;
};

/**
 * Phase 4 consolidates the Phase 1 scaffold's 29 one-per-circular-item routes into 20
 * broader sections — each circular content category still gets its own clearly-labeled
 * section (e.g. History and Vision/Mission are `<h2>` sections within `/about`, Departments
 * and Programs within `/academics`), just not its own top-level URL. See progress.md's
 * decisions log for the full old-route -> new-route mapping.
 */
export const PUBLIC_NAV_LINKS: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/academics", label: "Academics" },
  { href: "/admissions", label: "Admissions" },
  { href: "/faculty", label: "Faculty" },
  { href: "/staff", label: "Staff" },
  { href: "/campus", label: "Campus" },
  { href: "/notices", label: "Notices" },
  { href: "/events", label: "Events" },
  { href: "/gallery", label: "Gallery" },
  { href: "/examinations", label: "Examinations" },
  { href: "/results", label: "Results" },
  { href: "/scholarships", label: "Scholarships" },
  { href: "/student-support", label: "Student Support" },
  { href: "/rules", label: "Rules & Regulations" },
  { href: "/affiliation", label: "Affiliation" },
  { href: "/grievance", label: "Grievance" },
  { href: "/contact", label: "Contact" },
  { href: "/downloads", label: "Downloads" },
  { href: "/search", label: "Search" },
];

export const ADMIN_NAV_LINKS: NavLink[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/cms", label: "CMS" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/roles", label: "Roles" },
  { href: "/admin/permissions", label: "Permissions" },
  { href: "/admin/college-profile", label: "College Profile" },
  { href: "/admin/departments", label: "Departments" },
  { href: "/admin/notices", label: "Notices" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/seminars", label: "Seminars" },
  { href: "/admin/workshops", label: "Workshops" },
  { href: "/admin/activities", label: "Activities" },
  { href: "/admin/clubs", label: "Clubs" },
  { href: "/admin/faculty", label: "Faculty" },
  { href: "/admin/staff", label: "Staff" },
  { href: "/admin/programs", label: "Programs" },
  { href: "/admin/infrastructure", label: "Infrastructure" },
  { href: "/admin/admissions", label: "Admissions" },
  { href: "/admin/fee-structures", label: "Fee Structures" },
  { href: "/admin/enrollment-statistics", label: "Enrollment Statistics" },
  { href: "/admin/timetables", label: "Timetables" },
  { href: "/admin/academic-calendar", label: "Academic Calendar" },
  { href: "/admin/exams", label: "Exams" },
  { href: "/admin/results", label: "Results" },
  { href: "/admin/documents", label: "Documents" },
  { href: "/admin/gallery", label: "Gallery" },
  { href: "/admin/scholarships", label: "Scholarships" },
  { href: "/admin/student-support", label: "Student Support" },
  { href: "/admin/policies", label: "Policies" },
  { href: "/admin/regulations", label: "Regulations" },
  { href: "/admin/affiliation", label: "Affiliation" },
  { href: "/admin/contact", label: "Contact" },
  { href: "/admin/location", label: "Location" },
  { href: "/admin/grievances", label: "Grievances" },
  { href: "/admin/compliance", label: "Compliance" },
  { href: "/admin/audit-logs", label: "Audit logs" },
  { href: "/admin/approval-workflow", label: "Approval workflow" },
];
