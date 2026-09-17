"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/guard";
import { isRoleName } from "@/lib/auth/permissions";
import { hashPassword } from "@/lib/auth/password";
import { logAudit } from "@/lib/audit";

/**
 * User accounts: creating one (`createUserAction`) and assigning/revoking which roles it
 * holds (`assignRoleAction`/`removeRoleAction`, `UserRole`). A role's own permission grants
 * (`ROLE_PERMISSIONS`/`RolePermission`) are a separate, runtime-editable concern — see
 * src/app/admin/roles/actions.ts.
 *
 * There is no email-sending/invite flow in this app, so account creation is admin-set-initial-
 * password, not an emailed invite link — the creating admin relays the password to the new
 * person out of band and they're expected to change it themselves (no forced-change-on-
 * first-login flag exists either; a real gap worth closing later, not invented here).
 */

const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().min(1, "Email is required").toLowerCase().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  roleName: z.string().trim().optional(),
});

export async function createUserAction(formData: FormData): Promise<void> {
  const actor = await requirePermission("users:manage");

  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    roleName: formData.get("roleName") || undefined,
  });
  if (!parsed.success) {
    redirect(`/admin/users?userError=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`);
  }
  const { name, email, password, roleName } = parsed.data;

  if (roleName && !isRoleName(roleName)) {
    redirect(`/admin/users?userError=${encodeURIComponent("Select a valid role.")}`);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    redirect(`/admin/users?userError=${encodeURIComponent("A user with that email already exists.")}`);
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { collegeId: actor.collegeId, name, email, passwordHash },
  });

  if (roleName) {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } });
    await prisma.userRole.create({
      data: { userId: user.id, roleId: role.id, collegeId: actor.collegeId },
    });
  }

  await logAudit({
    actorId: actor.id,
    action: "CREATE",
    entityType: "User",
    entityId: user.id,
    after: { name: user.name, email: user.email, initialRole: roleName ?? null },
    comment: `Created user ${email}${roleName ? ` with role ${roleName}` : ""}.`,
  });

  redirect("/admin/users");
}

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
