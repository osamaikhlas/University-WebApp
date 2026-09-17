import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn() },
    role: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn() },
    userRole: { findMany: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));

vi.mock("@/lib/auth/guard", () => ({ requirePermission: vi.fn() }));
vi.mock("@/lib/auth/password", () => ({ hashPassword: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/guard";
import { hashPassword } from "@/lib/auth/password";
import { assignRoleAction, createUserAction, removeRoleAction } from "@/app/admin/users/actions";

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

describe("createUserAction", () => {
  it("requires users:manage", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null); // no existing account with this email
    vi.mocked(hashPassword).mockResolvedValue("hashed");
    vi.mocked(prisma.user.create).mockResolvedValue({ id: "user-new" } as never);

    await expect(
      createUserAction(formData({ name: "New Person", email: "new@example.invalid", password: "longenoughpw" })),
    ).rejects.toThrow("REDIRECT:/admin/users");
    expect(requirePermission).toHaveBeenCalledWith("users:manage");
  });

  it("rejects a password under 8 characters without touching the database", async () => {
    await expect(
      createUserAction(formData({ name: "New Person", email: "new@example.invalid", password: "short" })),
    ).rejects.toThrow(/userError=/);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("rejects an invalid email without touching the database", async () => {
    await expect(
      createUserAction(formData({ name: "New Person", email: "not-an-email", password: "longenoughpw" })),
    ).rejects.toThrow(/userError=/);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("rejects an invalid starting role without touching the database", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    await expect(
      createUserAction(
        formData({
          name: "New Person",
          email: "new@example.invalid",
          password: "longenoughpw",
          roleName: "NOT_A_ROLE",
        }),
      ),
    ).rejects.toThrow(/userError=/);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("refuses a duplicate email", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(targetUser as never);
    await expect(
      createUserAction(
        formData({ name: "New Person", email: targetUser.email, password: "longenoughpw" }),
      ),
    ).rejects.toThrow(/userError=.*already%20exists/i);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("lowercases the email, hashes the password, and creates the account with no starting role", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(hashPassword).mockResolvedValue("hashed-pw");
    vi.mocked(prisma.user.create).mockResolvedValue({ id: "user-new" } as never);

    await expect(
      createUserAction(
        formData({ name: "New Person", email: "New@Example.invalid", password: "longenoughpw" }),
      ),
    ).rejects.toThrow("REDIRECT:/admin/users");

    expect(hashPassword).toHaveBeenCalledWith("longenoughpw");
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { collegeId: "college-1", name: "New Person", email: "new@example.invalid", passwordHash: "hashed-pw" },
    });
    expect(prisma.userRole.create).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: "actor-1",
        action: "CREATE",
        entityType: "User",
        entityId: "user-new",
      }),
    });
  });

  it("assigns the chosen starting role", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(hashPassword).mockResolvedValue("hashed-pw");
    vi.mocked(prisma.user.create).mockResolvedValue({ id: "user-new" } as never);
    vi.mocked(prisma.role.findUniqueOrThrow).mockResolvedValue(editorRole as never);

    await expect(
      createUserAction(
        formData({
          name: "New Person",
          email: "new@example.invalid",
          password: "longenoughpw",
          roleName: "EDITOR",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/admin/users");

    expect(prisma.userRole.create).toHaveBeenCalledWith({
      data: { userId: "user-new", roleId: "role-editor", collegeId: "college-1" },
    });
  });
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
