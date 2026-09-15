import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    role: { findUnique: vi.fn() },
    userRole: { findMany: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));

vi.mock("@/lib/auth/guard", () => ({ requirePermission: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/guard";
import { assignRoleAction, removeRoleAction } from "@/app/admin/users/actions";

const actor = { id: "actor-1", collegeId: "college-1", permissions: new Set() } as never;
const targetUser = { id: "user-2", name: "Jane Editor", email: "jane@example.invalid", collegeId: "college-1" };
const editorRole = { id: "role-editor", name: "EDITOR" };
const reviewerRole = { id: "role-reviewer", name: "REVIEWER" };

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requirePermission).mockResolvedValue(actor);
  vi.mocked(prisma.user.findUnique).mockResolvedValue(targetUser as never);
});

describe("assignRoleAction", () => {
  it("requires users:manage", async () => {
    vi.mocked(prisma.role.findUnique).mockResolvedValue(reviewerRole as never);
    vi.mocked(prisma.userRole.findMany).mockResolvedValue([{ role: editorRole }] as never);
    vi.mocked(prisma.userRole.create).mockResolvedValue({} as never);

    await expect(
      assignRoleAction("user-2", formData({ roleName: "REVIEWER" })),
    ).rejects.toThrow("REDIRECT:/admin/users");
    expect(requirePermission).toHaveBeenCalledWith("users:manage");
  });

  it("rejects an invalid role name without touching the database", async () => {
    await expect(assignRoleAction("user-2", formData({ roleName: "NOT_A_ROLE" }))).rejects.toThrow(
      /roleError=/,
    );
    expect(prisma.userRole.create).not.toHaveBeenCalled();
  });

  it("refuses to assign a role the user already holds", async () => {
    vi.mocked(prisma.role.findUnique).mockResolvedValue(editorRole as never);
    vi.mocked(prisma.userRole.findMany).mockResolvedValue([{ role: editorRole }] as never);

    await expect(assignRoleAction("user-2", formData({ roleName: "EDITOR" }))).rejects.toThrow(
      /roleError=/,
    );
    expect(prisma.userRole.create).not.toHaveBeenCalled();
  });

  it("creates the UserRole row and logs ROLE_CHANGE with before/after role lists", async () => {
    vi.mocked(prisma.role.findUnique).mockResolvedValue(reviewerRole as never);
    vi.mocked(prisma.userRole.findMany)
      .mockResolvedValueOnce([{ role: editorRole }] as never) // before
      .mockResolvedValueOnce([{ role: editorRole }, { role: reviewerRole }] as never); // after
    vi.mocked(prisma.userRole.create).mockResolvedValue({} as never);

    await expect(
      assignRoleAction("user-2", formData({ roleName: "REVIEWER" })),
    ).rejects.toThrow("REDIRECT:/admin/users");

    expect(prisma.userRole.create).toHaveBeenCalledWith({
      data: { userId: "user-2", roleId: "role-reviewer", collegeId: "college-1" },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: "actor-1",
        action: "ROLE_CHANGE",
        entityType: "User",
        entityId: "user-2",
        beforeSnapshot: { roles: ["EDITOR"] },
        afterSnapshot: { roles: ["EDITOR", "REVIEWER"] },
        metadata: { changeType: "added", role: "REVIEWER", targetUserEmail: targetUser.email },
      }),
    });
  });
});

describe("removeRoleAction", () => {
  it("refuses to remove a user's last role", async () => {
    vi.mocked(prisma.role.findUnique).mockResolvedValue(editorRole as never);
    vi.mocked(prisma.userRole.findMany).mockResolvedValue([{ role: editorRole }] as never);

    await expect(removeRoleAction("user-2", formData({ roleName: "EDITOR" }))).rejects.toThrow(
      /roleError=.*last%20role/i,
    );
    expect(prisma.userRole.deleteMany).not.toHaveBeenCalled();
  });

  it("refuses to remove a role the user does not hold", async () => {
    vi.mocked(prisma.role.findUnique).mockResolvedValue(reviewerRole as never);
    vi.mocked(prisma.userRole.findMany).mockResolvedValue([{ role: editorRole }] as never);

    await expect(removeRoleAction("user-2", formData({ roleName: "REVIEWER" }))).rejects.toThrow(
      /roleError=/,
    );
    expect(prisma.userRole.deleteMany).not.toHaveBeenCalled();
  });

  it("removes the role and logs ROLE_CHANGE when the user retains at least one other role", async () => {
    vi.mocked(prisma.role.findUnique).mockResolvedValue(reviewerRole as never);
    vi.mocked(prisma.userRole.findMany)
      .mockResolvedValueOnce([{ role: editorRole }, { role: reviewerRole }] as never) // before
      .mockResolvedValueOnce([{ role: editorRole }] as never); // after
    vi.mocked(prisma.userRole.deleteMany).mockResolvedValue({ count: 1 } as never);

    await expect(
      removeRoleAction("user-2", formData({ roleName: "REVIEWER" })),
    ).rejects.toThrow("REDIRECT:/admin/users");

    expect(prisma.userRole.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-2", roleId: "role-reviewer", collegeId: "college-1" },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "ROLE_CHANGE",
        beforeSnapshot: { roles: ["EDITOR", "REVIEWER"] },
        afterSnapshot: { roles: ["EDITOR"] },
        metadata: { changeType: "removed", role: "REVIEWER", targetUserEmail: targetUser.email },
      }),
    });
  });
});
