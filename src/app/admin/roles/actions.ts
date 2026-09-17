"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/guard";
import { isPermission } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";

export type UpdateRolePermissionsState = { error: string | null };

/**
 * The one real write path for the runtime permission matrix. `RolePermission` rows are what
 * `getCurrentUser()` actually reads at request time (src/lib/auth/permissions.ts), so this
 * takes effect immediately for every future request — no cache to invalidate. `prisma/
 * seed.ts`'s RBAC bootstrap only ever *adds* a role's missing default grants in production
 * (never removes an edit made here) — see its own comment — so this module's changes survive
 * a redeploy.
 */
export async function updateRolePermissions(
  roleId: string,
  _prevState: UpdateRolePermissionsState,
  formData: FormData,
): Promise<UpdateRolePermissionsState> {
  const actor = await requirePermission("roles:manage");

  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: { permissions: { include: { permission: true } } },
  });
  if (!role) return { error: "Role not found." };

  // SUPER_ADMIN must always hold every permission — otherwise a mistaken edit here could
  // strip the one role guaranteed to be able to fix any resulting lockout, including this
  // page's own roles:manage grant.
  if (role.name === "SUPER_ADMIN") {
    return { error: "SUPER_ADMIN always holds every permission and cannot be edited." };
  }

  const selectedKeys = formData.getAll("permissions").map(String).filter(isPermission);
  const before = role.permissions.map((rp) => rp.permission.key).sort();

  const permissions = await prisma.permission.findMany({ where: { key: { in: selectedKeys } } });

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId } }),
    prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({ roleId, permissionId: permission.id })),
      skipDuplicates: true,
    }),
  ]);

  const after = permissions.map((permission) => permission.key).sort();

  await logAudit({
    actorId: actor.id,
    action: "UPDATE",
    entityType: "Role",
    entityId: roleId,
    before: { permissions: before },
    after: { permissions: after },
    comment: `Updated permission grants for role ${role.name}.`,
  });

  redirect(`/admin/roles/${roleId}`);
}
