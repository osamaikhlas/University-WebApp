import { describe, expect, it } from "vitest";
import {
  PERMISSIONS,
  ROLE_DESCRIPTIONS,
  ROLE_NAMES,
  ROLE_PERMISSIONS,
  hasAllPermissions,
  hasPermission,
  isPermission,
} from "@/lib/auth/permissions";

describe("permission matrix", () => {
  it("defines exactly the 8 required roles", () => {
    expect([...ROLE_NAMES].sort()).toEqual(
      [
        "SUPER_ADMIN",
        "PRINCIPAL",
        "ADMINISTRATOR",
        "EDITOR",
        "REVIEWER",
        "ADMISSION_OFFICER",
        "EXAMINATION_OFFICER",
        "FACULTY_EDITOR",
      ].sort(),
    );
  });

  it("has a grant list and a description for every role", () => {
    for (const role of ROLE_NAMES) {
      expect(ROLE_PERMISSIONS[role]).toBeDefined();
      expect(ROLE_PERMISSIONS[role].length).toBeGreaterThan(0);
      expect(ROLE_DESCRIPTIONS[role]).toBeTruthy();
    }
  });

  it("only grants permissions that exist in PERMISSIONS", () => {
    for (const role of ROLE_NAMES) {
      for (const permission of ROLE_PERMISSIONS[role]) {
        expect(PERMISSIONS).toContain(permission);
      }
    }
  });

  it("gives SUPER_ADMIN every permission", () => {
    expect(new Set(ROLE_PERMISSIONS.SUPER_ADMIN)).toEqual(new Set(PERMISSIONS));
  });

  it("gives every role dashboard:view", () => {
    for (const role of ROLE_NAMES) {
      expect(ROLE_PERMISSIONS[role]).toContain("dashboard:view");
    }
  });

  it("enforces separation of duties: no role can both manage and publish the same content domain", () => {
    const domains = ["content_general", "content_admissions", "content_examinations", "content_faculty"];
    for (const role of ROLE_NAMES) {
      const granted = new Set(ROLE_PERMISSIONS[role]);
      for (const domain of domains) {
        const manage = granted.has(`${domain}:manage` as never);
        const publish = granted.has(`${domain}:publish` as never);
        if (role !== "SUPER_ADMIN") {
          expect(manage && publish).toBe(false);
        }
      }
    }
  });

  it("restricts users/roles/permissions management to ADMINISTRATOR and SUPER_ADMIN", () => {
    const managementPermissions = ["users:manage", "roles:manage", "permissions:manage"] as const;
    for (const role of ROLE_NAMES) {
      const granted = new Set(ROLE_PERMISSIONS[role]);
      const hasAnyManagement = managementPermissions.some((permission) => granted.has(permission));
      if (role === "ADMINISTRATOR" || role === "SUPER_ADMIN") {
        expect(hasAnyManagement).toBe(true);
      } else {
        expect(hasAnyManagement).toBe(false);
      }
    }
  });

  it("restricts grievance and compliance access to PRINCIPAL, ADMINISTRATOR, SUPER_ADMIN", () => {
    const restricted = ["grievances:view", "grievances:manage", "compliance:view", "compliance:verify"] as const;
    for (const role of ROLE_NAMES) {
      const granted = new Set(ROLE_PERMISSIONS[role]);
      const hasAny = restricted.some((permission) => granted.has(permission));
      if (role === "PRINCIPAL" || role === "ADMINISTRATOR" || role === "SUPER_ADMIN") {
        expect(hasAny).toBe(true);
      } else {
        expect(hasAny).toBe(false);
      }
    }
  });
});

describe("isPermission", () => {
  it("accepts known permission keys", () => {
    expect(isPermission("dashboard:view")).toBe(true);
  });

  it("rejects unknown strings", () => {
    expect(isPermission("not:a-real-permission")).toBe(false);
  });
});

describe("hasPermission / hasAllPermissions", () => {
  it("checks single and multiple permission membership", () => {
    const granted = new Set<(typeof PERMISSIONS)[number]>(["dashboard:view", "content_general:view"]);
    expect(hasPermission(granted, "dashboard:view")).toBe(true);
    expect(hasPermission(granted, "users:manage")).toBe(false);
    expect(hasAllPermissions(granted, ["dashboard:view", "content_general:view"])).toBe(true);
    expect(hasAllPermissions(granted, ["dashboard:view", "users:manage"])).toBe(false);
  });
});
