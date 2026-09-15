import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findMany: vi.fn() } },
}));

import { prisma } from "@/lib/prisma";
import { getEligibleGrievanceAssignees } from "@/lib/admin/grievance-assignees";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getEligibleGrievanceAssignees", () => {
  it("queries only active users with a role granting grievances:manage", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);

    await getEligibleGrievanceAssignees("college-1");

    const callArgs = vi.mocked(prisma.user.findMany).mock.calls[0]?.[0] as {
      where: { collegeId: string; status: string; roles: { some: { role: { name: { in: string[] } } } } };
    };
    expect(callArgs.where).toMatchObject({ collegeId: "college-1", status: "ACTIVE" });
    const roleNames = callArgs.where.roles.some.role.name.in;
    // Derived from the permission matrix (src/lib/auth/permissions.ts) — currently exactly
    // the roles with institutional accountability.
    expect(roleNames).toEqual(expect.arrayContaining(["PRINCIPAL", "ADMINISTRATOR", "SUPER_ADMIN"]));
    expect(roleNames).not.toContain("EDITOR");
  });
});
