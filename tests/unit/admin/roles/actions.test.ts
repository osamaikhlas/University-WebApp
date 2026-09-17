import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    role: { findUnique: vi.fn() },
    permission: { findMany: vi.fn() },
    rolePermission: { deleteMany: vi.fn(), createMany: vi.fn() },
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
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
import { updateRolePermissions } from "@/app/admin/roles/actions";

const actor = { id: "actor-1" } as never;

function formData(permissions: string[]): FormData {
  const data = new FormData();
  for (const key of permissions) data.append("permissions", key);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requirePermission).mockResolvedValue(actor);
});

describe("updateRolePermissions", () => {
  it("requires roles:manage", async () => {
    vi.mocked(prisma.role.findUnique).mockResolvedValue({
      id: "role-1",
      name: "EDITOR",
      permissions: [],
    } as never);
    vi.mocked(prisma.permission.findMany).mockResolvedValue([]);

    await expect(updateRolePermissions("role-1", { error: null }, formData([]))).rejects.toThrow(
      "REDIRECT:/admin/roles/role-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("roles:manage");
  });

  it("returns an error when the role doesn't exist", async () => {
    vi.mocked(prisma.role.findUnique).mockResolvedValue(null);
    const result = await updateRolePermissions("missing", { error: null }, formData([]));
    expect(result.error).toBeTruthy();
  });

  it("refuses to edit SUPER_ADMIN", async () => {
    vi.mocked(prisma.role.findUnique).mockResolvedValue({
      id: "role-super",
      name: "SUPER_ADMIN",
      permissions: [],
    } as never);

    const result = await updateRolePermissions(
      "role-super",
      { error: null },
      formData(["dashboard:view"]),
    );
    expect(result.error).toMatch(/SUPER_ADMIN/);
    expect(prisma.rolePermission.deleteMany).not.toHaveBeenCalled();
  });

  it("replaces the role's grants with exactly the submitted, valid permission keys", async () => {
    vi.mocked(prisma.role.findUnique).mockResolvedValue({
      id: "role-editor",
      name: "EDITOR",
      permissions: [{ permission: { key: "dashboard:view" } }],
    } as never);
    vi.mocked(prisma.permission.findMany).mockResolvedValue([
      { id: "perm-1", key: "content_general:view" },
      { id: "perm-2", key: "content_general:manage" },
    ] as never);

    await expect(
      updateRolePermissions(
        "role-editor",
        { error: null },
        // "not-a-real-permission" must be silently filtered out, not passed to Prisma.
        formData(["content_general:view", "content_general:manage", "not-a-real-permission"]),
      ),
    ).rejects.toThrow("REDIRECT:/admin/roles/role-editor");

    expect(prisma.permission.findMany).toHaveBeenCalledWith({
      where: { key: { in: ["content_general:view", "content_general:manage"] } },
    });
    expect(prisma.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { roleId: "role-editor" } });
    expect(prisma.rolePermission.createMany).toHaveBeenCalledWith({
      data: [
        { roleId: "role-editor", permissionId: "perm-1" },
        { roleId: "role-editor", permissionId: "perm-2" },
      ],
      skipDuplicates: true,
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "UPDATE",
        entityType: "Role",
        entityId: "role-editor",
        actorId: "actor-1",
      }),
    });
  });
});
