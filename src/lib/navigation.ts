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

export const PUBLIC_NAV_LINKS: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/college-profile", label: "College Profile" },
  { href: "/history", label: "History" },
  { href: "/vision-mission", label: "Vision/Mission" },
  { href: "/principals-message", label: "Principal's Message" },
  { href: "/departments", label: "Departments" },
  { href: "/programs", label: "Programs" },
  { href: "/faculty", label: "Faculty" },
  { href: "/non-teaching-staff", label: "Non-teaching Staff" },
  { href: "/infrastructure", label: "Infrastructure" },
  { href: "/admissions", label: "Admissions" },
  { href: "/academic-calendar", label: "Academic Calendar" },
  { href: "/timetable", label: "Timetable" },
  { href: "/examinations", label: "Examinations" },
  { href: "/results", label: "Results" },
  { href: "/notices", label: "Notices" },
  { href: "/events", label: "Events" },
  { href: "/activities", label: "Activities" },
  { href: "/gallery", label: "Gallery" },
  { href: "/scholarships", label: "Scholarships" },
  { href: "/student-support", label: "Student Support" },
  { href: "/rules-regulations", label: "Rules and Regulations" },
  { href: "/affiliation", label: "Affiliation" },
  { href: "/grievance", label: "Grievance" },
  { href: "/contact", label: "Contact" },
  { href: "/location", label: "Location" },
  { href: "/downloads", label: "Downloads" },
  { href: "/search", label: "Search" },
];

export const ADMIN_NAV_LINKS: NavLink[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/cms", label: "CMS" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/roles", label: "Roles" },
  { href: "/admin/permissions", label: "Permissions" },
  { href: "/admin/notices", label: "Notices" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/faculty", label: "Faculty" },
  { href: "/admin/staff", label: "Staff" },
  { href: "/admin/programs", label: "Programs" },
  { href: "/admin/admissions", label: "Admissions" },
  { href: "/admin/timetables", label: "Timetables" },
  { href: "/admin/academic-calendar", label: "Academic Calendar" },
  { href: "/admin/exams", label: "Exams" },
  { href: "/admin/results", label: "Results" },
  { href: "/admin/documents", label: "Documents" },
  { href: "/admin/gallery", label: "Gallery" },
  { href: "/admin/scholarships", label: "Scholarships" },
  { href: "/admin/student-support", label: "Student Support" },
  { href: "/admin/grievances", label: "Grievances" },
  { href: "/admin/compliance", label: "Compliance" },
  { href: "/admin/audit-logs", label: "Audit logs" },
  { href: "/admin/approval-workflow", label: "Approval workflow" },
];
