import type { Permission } from "@/lib/auth/permissions";

/**
 * Declares the permission required to view each admin route. This is documentation +
 * a test fixture (see tests/unit/auth/route-permissions.test.ts, which asserts every
 * `ADMIN_NAV_LINKS` entry has an entry here) — the actual enforcement is each page's own
 * `await requirePermission(...)` call, not this map, since Next.js Server Components have
 * no single choke point that all admin routes pass through with path info attached.
 */
export const ADMIN_ROUTE_PERMISSIONS: Record<string, Permission> = {
  "/admin": "dashboard:view",
  "/admin/cms": "content_general:view",
  "/admin/users": "users:manage",
  "/admin/roles": "roles:manage",
  "/admin/permissions": "permissions:manage",
  "/admin/college-profile": "content_general:view",
  "/admin/departments": "content_general:view",
  "/admin/notices": "content_general:view",
  "/admin/events": "content_general:view",
  "/admin/seminars": "content_general:view",
  "/admin/workshops": "content_general:view",
  "/admin/activities": "content_general:view",
  "/admin/clubs": "content_faculty:view",
  "/admin/faculty": "content_faculty:view",
  "/admin/staff": "content_faculty:view",
  "/admin/programs": "content_general:view",
  "/admin/infrastructure": "content_general:view",
  "/admin/admissions": "content_admissions:view",
  "/admin/fee-structures": "content_admissions:view",
  "/admin/enrollment-statistics": "content_admissions:view",
  "/admin/timetables": "content_general:view",
  "/admin/academic-calendar": "content_general:view",
  "/admin/exams": "content_examinations:view",
  "/admin/results": "content_examinations:view",
  "/admin/documents": "content_general:view",
  "/admin/gallery": "content_general:view",
  "/admin/scholarships": "content_general:view",
  "/admin/student-support": "content_general:view",
  "/admin/policies": "content_general:view",
  "/admin/regulations": "content_general:view",
  "/admin/affiliation": "content_general:view",
  "/admin/contact": "content_general:view",
  "/admin/location": "content_general:view",
  "/admin/grievances": "grievances:view",
  "/admin/compliance": "compliance:view",
  "/admin/audit-logs": "audit_logs:view",
  "/admin/approval-workflow": "approval_workflow:view",
};
