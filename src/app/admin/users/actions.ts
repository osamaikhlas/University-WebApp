"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/guard";
import { isRoleName } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";

/**
 * Permission changes, in this app's data model, mean *which roles a user holds*
 * (`UserRole`) — the roles' own permission grants (`ROLE_PERMISSIONS` /
 * `RolePermission`) are fixed in code and seeded, not edited at runtime (see
 * src/lib/auth/permissions.ts's doc comment). Assigning/revoking a role is the one real
 * "permission change" a human can make, so it's the one this module implements and audits
 * (`ROLE_CHANGE`) — not a full role/permission-matrix editor, which CLAUDE.md's required
 * scope lists as a separate, still-unbuilt module (`/admin/roles`, `/admin/permissions`).
 */

async function currentRoleNames(userId: string, collegeId: string): Promise<string[]> {
  const rows = await prisma.userRole.findMany({
    where: { userId, collegeId },
    include: { role: { select: { name: true } } },
  });
  return rows.map((r) => r.role.name).sort();
}

export async function assignRoleAction(userId: string, formData: FormData): Promise<void> {
  const actor = await requirePermission("users:manage");
  const roleName = formData.get("roleName")?.toString();

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) redirect("/admin/users?roleError=User not found.");
  if (!roleName || !isRoleName(roleName)) {
    redirect(`/admin/users?roleError=${encodeURIComponent("Select a valid role.")}`);
  }

  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) redirect(`/admin/users?roleError=${encodeURIComponent("That role does not exist.")}`);

  const before = await currentRoleNames(userId, target.collegeId);
  if (before.includes(roleName)) {
    redirect(`/admin/users?roleError=${encodeURIComponent(`${target.name} already holds ${roleName}.`)}`);
  }

  await prisma.userRole.create({
    data: { userId, roleId: role.id, collegeId: target.collegeId },
  });
  const after = await currentRoleNames(userId, target.collegeId);

  await logAudit({
    actorId: actor.id,
    action: "ROLE_CHANGE",
    entityType: "User",
    entityId: userId,
    before: { roles: before },
    after: { roles: after },
    metadata: { changeType: "added", role: roleName, targetUserEmail: target.email },
    comment: `Assigned role ${roleName} to ${target.email}.`,
  });

  redirect("/admin/users");
}

export async function removeRoleAction(userId: string, formData: FormData): Promise<void> {
  const actor = await requirePermission("users:manage");
  const roleName = formData.get("roleName")?.toString();

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) redirect("/admin/users?roleError=User not found.");
  if (!roleName || !isRoleName(roleName)) {
    redirect(`/admin/users?roleError=${encodeURIComponent("Select a valid role.")}`);
  }

  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) redirect(`/admin/users?roleError=${encodeURIComponent("That role does not exist.")}`);

  const before = await currentRoleNames(userId, target.collegeId);
  if (!before.includes(roleName)) {
    redirect(`/admin/users?roleError=${encodeURIComponent(`${target.name} does not hold ${roleName}.`)}`);
  }
  // Every user must retain at least one role — a user with zero roles can sign in (a valid
  // session) but would be unable to reach a single permission-gated page, effectively a
  // silent lockout rather than a deliberate account suspension (User.status exists for that).
  if (before.length <= 1) {
    redirect(
      `/admin/users?roleError=${encodeURIComponent(`Cannot remove ${target.name}'s last role — they would lose all admin access. Suspend the account instead if that's the intent.`)}`,
    );
  }

  await prisma.userRole.deleteMany({ where: { userId, roleId: role.id, collegeId: target.collegeId } });
  const after = await currentRoleNames(userId, target.collegeId);

  await logAudit({
    actorId: actor.id,
    action: "ROLE_CHANGE",
    entityType: "User",
    entityId: userId,
    before: { roles: before },
    after: { roles: after },
    metadata: { changeType: "removed", role: roleName, targetUserEmail: target.email },
    comment: `Removed role ${roleName} from ${target.email}.`,
  });

  redirect("/admin/users");
}
