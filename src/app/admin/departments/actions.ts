"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import {
  applyWorkflowTransition,
  WorkflowError,
  MANAGE_PERMISSION_ACTIONS,
  type WorkflowActionName,
} from "@/lib/content-workflow";
import { logAudit } from "@/lib/audit";
import { getPrimaryCollege } from "@/lib/content";

const PERMISSIONS = MODULE_PERMISSIONS.departments;
const ENTITY_TYPE = "Department";

const departmentSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().max(2000).optional(),
});

export type DepartmentFormState = { error: string | null };

export async function createDepartment(
  _prevState: DepartmentFormState,
  formData: FormData,
): Promise<DepartmentFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = departmentSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const college = await getPrimaryCollege();
  if (!college) {
    return { error: "No college record exists yet — cannot create content." };
  }

  const department = await prisma.department.create({
    data: {
      collegeId: college.id,
      name: parsed.data.name,
      description: parsed.data.description || null,
      status: "DRAFT",
      isPlaceholder: false,
      createdBy: user.id,
      updatedBy: user.id,
    },
  });

  await logAudit({
    actorId: user.id,
    action: "CREATE",
    entityType: ENTITY_TYPE,
    entityId: department.id,
    after: department,
  });

  redirect(`/admin/departments/${department.id}`);
}

export async function updateDepartment(
  id: string,
  _prevState: DepartmentFormState,
  formData: FormData,
): Promise<DepartmentFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = departmentSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const before = await prisma.department.findUnique({ where: { id } });
  if (!before) {
    return { error: "Department not found." };
  }

  const after = await prisma.department.update({
    where: { id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      updatedBy: user.id,
    },
  });

  await logAudit({
    actorId: user.id,
    action: "UPDATE",
    entityType: ENTITY_TYPE,
    entityId: id,
    before,
    after,
  });

  redirect(`/admin/departments/${id}`);
}

export async function transitionDepartment(
  id: string,
  action: WorkflowActionName,
  formData: FormData,
): Promise<void> {
  const user = await requirePermission(
    MANAGE_PERMISSION_ACTIONS.has(action) ? PERMISSIONS.manage : PERMISSIONS.publish,
  );
  const comment = formData.get("comment")?.toString();

  const department = await prisma.department.findUniqueOrThrow({ where: { id } });

  try {
    await applyWorkflowTransition({
      entityType: ENTITY_TYPE,
      entityId: id,
      currentStatus: department.status,
      action,
      actorId: user.id,
      comment,
      update: (data) => prisma.department.update({ where: { id }, data }),
    });
  } catch (error) {
    if (!(error instanceof WorkflowError)) throw error;
    redirect(`/admin/departments/${id}?workflowError=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/departments/${id}`);
}
