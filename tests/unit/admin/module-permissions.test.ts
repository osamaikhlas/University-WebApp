import { describe, expect, it } from "vitest";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { ROLE_PERMISSIONS } from "@/lib/auth/permissions";

describe("MODULE_PERMISSIONS", () => {
  it("puts College Profile, Departments, and Programs in the content_general domain", () => {
    for (const moduleName of ["collegeProfile", "departments", "programs"] as const) {
      expect(MODULE_PERMISSIONS[moduleName]).toEqual({
        view: "content_general:view",
        manage: "content_general:manage",
        publish: "content_general:publish",
      });
    }
  });

  it("puts Faculty and Staff in the content_faculty domain", () => {
    for (const moduleName of ["faculty", "staff"] as const) {
      expect(MODULE_PERMISSIONS[moduleName]).toEqual({
        view: "content_faculty:view",
        manage: "content_faculty:manage",
        publish: "content_faculty:publish",
      });
    }
  });
});

describe("role access derived from the module permission mapping", () => {
  function roleHas(role: keyof typeof ROLE_PERMISSIONS, permission: string): boolean {
    return (ROLE_PERMISSIONS[role] as readonly string[]).includes(permission);
  }

  it("FACULTY_EDITOR can manage Faculty/Staff but not Departments/Programs/College Profile", () => {
    expect(roleHas("FACULTY_EDITOR", MODULE_PERMISSIONS.faculty.manage)).toBe(true);
    expect(roleHas("FACULTY_EDITOR", MODULE_PERMISSIONS.staff.manage)).toBe(true);
    expect(roleHas("FACULTY_EDITOR", MODULE_PERMISSIONS.departments.manage)).toBe(false);
    expect(roleHas("FACULTY_EDITOR", MODULE_PERMISSIONS.programs.manage)).toBe(false);
    expect(roleHas("FACULTY_EDITOR", MODULE_PERMISSIONS.collegeProfile.manage)).toBe(false);
  });

  it("EDITOR can manage Departments/Programs/College Profile but not Faculty/Staff", () => {
    expect(roleHas("EDITOR", MODULE_PERMISSIONS.departments.manage)).toBe(true);
    expect(roleHas("EDITOR", MODULE_PERMISSIONS.programs.manage)).toBe(true);
    expect(roleHas("EDITOR", MODULE_PERMISSIONS.collegeProfile.manage)).toBe(true);
    expect(roleHas("EDITOR", MODULE_PERMISSIONS.faculty.manage)).toBe(false);
    expect(roleHas("EDITOR", MODULE_PERMISSIONS.staff.manage)).toBe(false);
  });

  it("REVIEWER and PRINCIPAL can publish every one of the 5 modules but manage none of them", () => {
    for (const role of ["REVIEWER", "PRINCIPAL"] as const) {
      for (const modulePermissions of Object.values(MODULE_PERMISSIONS)) {
        expect(roleHas(role, modulePermissions.publish)).toBe(true);
        expect(roleHas(role, modulePermissions.manage)).toBe(false);
      }
    }
  });

  it("ADMINISTRATOR can view every module but neither manage nor publish any of them", () => {
    for (const modulePermissions of Object.values(MODULE_PERMISSIONS)) {
      expect(roleHas("ADMINISTRATOR", modulePermissions.view)).toBe(true);
      expect(roleHas("ADMINISTRATOR", modulePermissions.manage)).toBe(false);
      expect(roleHas("ADMINISTRATOR", modulePermissions.publish)).toBe(false);
    }
  });

  it("no role except SUPER_ADMIN can both manage and publish the same module (no structural self-approval)", () => {
    for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS)) {
      if (role === "SUPER_ADMIN") continue;
      const granted = new Set(permissions as readonly string[]);
      for (const modulePermissions of Object.values(MODULE_PERMISSIONS)) {
        const canBoth = granted.has(modulePermissions.manage) && granted.has(modulePermissions.publish);
        expect(canBoth, `${role} can both manage and publish the same module`).toBe(false);
      }
    }
  });

  it("SUPER_ADMIN can do everything for every module", () => {
    for (const modulePermissions of Object.values(MODULE_PERMISSIONS)) {
      expect(roleHas("SUPER_ADMIN", modulePermissions.view)).toBe(true);
      expect(roleHas("SUPER_ADMIN", modulePermissions.manage)).toBe(true);
      expect(roleHas("SUPER_ADMIN", modulePermissions.publish)).toBe(true);
    }
  });
});
