import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Runtime role/permission-matrix reads (the write path lives in
 * src/app/admin/roles/actions.ts). `RolePermission` is already the actual source of truth
 * `getCurrentUser()` reads at request time (src/lib/auth/permissions.ts's doc comment) — the
 * `ROLE_PERMISSIONS` constant in that file only seeds the *initial* baseline (see
 * prisma/seed.ts), so reading straight from the database here reflects any admin edit made
 * through this module, not the code default.
 */

export async function getRolesOverview() {
  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { permissions: true } } },
  });
  return roles.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    permissionCount: role._count.permissions,
  }));
}

export async function getRoleWithPermissions(roleId: string) {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: { permissions: { include: { permission: true } } },
  });
  if (!role) return null;

  return {
    id: role.id,
    name: role.name,
    description: role.description,
    grantedKeys: new Set(role.permissions.map((rp) => rp.permission.key)),
  };
}

export type PermissionMatrix = {
  roleNames: string[];
  permissionKeys: string[];
  isGranted: (permissionKey: string, roleName: string) => boolean;
};

/** The full role × permission grid, read live from the database. */
export async function getPermissionMatrix(): Promise<PermissionMatrix> {
  const [roles, permissions] = await Promise.all([
    prisma.role.findMany({
      orderBy: { name: "asc" },
      include: { permissions: { include: { permission: true } } },
    }),
    prisma.permission.findMany({ orderBy: { key: "asc" } }),
  ]);

  const grantsByRole = new Map<string, Set<string>>(
    roles.map((role) => [role.name, new Set(role.permissions.map((rp) => rp.permission.key))]),
  );

  return {
    roleNames: roles.map((role) => role.name),
    permissionKeys: permissions.map((permission) => permission.key),
    isGranted: (permissionKey, roleName) => grantsByRole.get(roleName)?.has(permissionKey) ?? false,
  };
}
