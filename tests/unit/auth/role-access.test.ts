import { describe, expect, it } from "vitest";
import { hasPermission, ROLE_PERMISSIONS } from "@/lib/auth/permissions";
import { ADMIN_ROUTE_PERMISSIONS } from "@/lib/auth/route-permissions";

/**
 * Role-specific access: for each of the 8 required roles, exercises the exact
 * `hasPermission(user.permissions, requiredPermission)` check every admin page performs,
 * against a representative sample of real admin routes — not just the abstract matrix.
 */
function canAccess(role: keyof typeof ROLE_PERMISSIONS, route: string): boolean {
  const required = ADMIN_ROUTE_PERMISSIONS[route];
  if (!required) throw new Error(`no permission declared for ${route}`);
  return hasPermission(new Set(ROLE_PERMISSIONS[role]), required);
}

describe("role-specific access", () => {
  it("every role can reach the dashboard", () => {
    for (const role of Object.keys(ROLE_PERMISSIONS) as (keyof typeof ROLE_PERMISSIONS)[]) {
      expect(canAccess(role, "/admin")).toBe(true);
    }
  });

  it("SUPER_ADMIN can reach every admin route", () => {
    for (const route of Object.keys(ADMIN_ROUTE_PERMISSIONS)) {
      expect(canAccess("SUPER_ADMIN", route)).toBe(true);
    }
  });

  it("EDITOR can manage general content but not users, admissions, or exams", () => {
    expect(canAccess("EDITOR", "/admin/notices")).toBe(true);
    expect(canAccess("EDITOR", "/admin/users")).toBe(false);
    expect(canAccess("EDITOR", "/admin/admissions")).toBe(false);
    expect(canAccess("EDITOR", "/admin/exams")).toBe(false);
  });

  it("ADMISSION_OFFICER can view admissions but not exams, faculty, or users", () => {
    expect(canAccess("ADMISSION_OFFICER", "/admin/admissions")).toBe(true);
    expect(canAccess("ADMISSION_OFFICER", "/admin/exams")).toBe(false);
    expect(canAccess("ADMISSION_OFFICER", "/admin/faculty")).toBe(false);
    expect(canAccess("ADMISSION_OFFICER", "/admin/users")).toBe(false);
  });

  it("EXAMINATION_OFFICER can view exams/results but not admissions or faculty", () => {
    expect(canAccess("EXAMINATION_OFFICER", "/admin/exams")).toBe(true);
    expect(canAccess("EXAMINATION_OFFICER", "/admin/results")).toBe(true);
    expect(canAccess("EXAMINATION_OFFICER", "/admin/admissions")).toBe(false);
    expect(canAccess("EXAMINATION_OFFICER", "/admin/faculty")).toBe(false);
  });

  it("FACULTY_EDITOR can view faculty/staff but not admissions or exams", () => {
    expect(canAccess("FACULTY_EDITOR", "/admin/faculty")).toBe(true);
    expect(canAccess("FACULTY_EDITOR", "/admin/staff")).toBe(true);
    expect(canAccess("FACULTY_EDITOR", "/admin/admissions")).toBe(false);
    expect(canAccess("FACULTY_EDITOR", "/admin/exams")).toBe(false);
  });

  it("REVIEWER can reach the approval workflow but ordinary EDITOR cannot", () => {
    expect(canAccess("REVIEWER", "/admin/approval-workflow")).toBe(true);
    expect(canAccess("EDITOR", "/admin/approval-workflow")).toBe(false);
  });

  it("only PRINCIPAL, ADMINISTRATOR, and SUPER_ADMIN can view grievances and compliance", () => {
    for (const route of ["/admin/grievances", "/admin/compliance"]) {
      expect(canAccess("PRINCIPAL", route)).toBe(true);
      expect(canAccess("ADMINISTRATOR", route)).toBe(true);
      expect(canAccess("SUPER_ADMIN", route)).toBe(true);
      expect(canAccess("EDITOR", route)).toBe(false);
      expect(canAccess("REVIEWER", route)).toBe(false);
      expect(canAccess("ADMISSION_OFFICER", route)).toBe(false);
      expect(canAccess("EXAMINATION_OFFICER", route)).toBe(false);
      expect(canAccess("FACULTY_EDITOR", route)).toBe(false);
    }
  });

  it("only ADMINISTRATOR and SUPER_ADMIN can manage users, roles, and permissions", () => {
    for (const route of ["/admin/users", "/admin/roles", "/admin/permissions"]) {
      expect(canAccess("ADMINISTRATOR", route)).toBe(true);
      expect(canAccess("SUPER_ADMIN", route)).toBe(true);
      expect(canAccess("PRINCIPAL", route)).toBe(false);
      expect(canAccess("EDITOR", route)).toBe(false);
    }
  });

  it("only PRINCIPAL, ADMINISTRATOR, and SUPER_ADMIN can view audit logs", () => {
    expect(canAccess("PRINCIPAL", "/admin/audit-logs")).toBe(true);
    expect(canAccess("ADMINISTRATOR", "/admin/audit-logs")).toBe(true);
    expect(canAccess("SUPER_ADMIN", "/admin/audit-logs")).toBe(true);
    expect(canAccess("EDITOR", "/admin/audit-logs")).toBe(false);
    expect(canAccess("REVIEWER", "/admin/audit-logs")).toBe(false);
  });
});
