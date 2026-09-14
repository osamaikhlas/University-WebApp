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

const PERMISSIONS = MODULE_PERMISSIONS.studentSupport;
const ENTITY_TYPE = "StudentSupport";

const studentSupportSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(300),
  description: z.string().trim().max(4000).optional(),
  contactInfo: z.string().trim().max(500).optional(),
});

export type StudentSupportFormState = { error: string | null };

function parseForm(formData: FormData) {
  return studentSupportSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    contactInfo: formData.get("contactInfo") || undefined,
  });
}

export async function createStudentSupport(
  _prevState: StudentSupportFormState,
  formData: FormData,
): Promise<StudentSupportFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const college = await getPrimaryCollege();
  if (!college) {
    return { error: "No college record exists yet — cannot create content." };
  }

  const studentSupport = await prisma.studentSupport.create({
    data: {
      collegeId: college.id,
      name: parsed.data.name,
      description: parsed.data.description || null,
      contactInfo: parsed.data.contactInfo || null,
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
    entityId: studentSupport.id,
    after: studentSupport,
  });

  redirect(`/admin/student-support/${studentSupport.id}`);
}

export async function updateStudentSupport(
  id: string,
  _prevState: StudentSupportFormState,
  formData: FormData,
): Promise<StudentSupportFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const before = await prisma.studentSupport.findUnique({ where: { id } });
  if (!before) {
    return { error: "Student support service not found." };
  }

  const after = await prisma.studentSupport.update({
    where: { id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      contactInfo: parsed.data.contactInfo || null,
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

  redirect(`/admin/student-support/${id}`);
}

export async function transitionStudentSupport(
  id: string,
  action: WorkflowActionName,
  formData: FormData,
): Promise<void> {
  const user = await requirePermission(
    MANAGE_PERMISSION_ACTIONS.has(action) ? PERMISSIONS.manage : PERMISSIONS.publish,
  );
  const comment = formData.get("comment")?.toString();

  const studentSupport = await prisma.studentSupport.findUniqueOrThrow({ where: { id } });

  try {
    await applyWorkflowTransition({
      entityType: ENTITY_TYPE,
      entityId: id,
      currentStatus: studentSupport.status,
      action,
      actorId: user.id,
      comment,
      update: (data) => prisma.studentSupport.update({ where: { id }, data }),
    });
  } catch (error) {
    if (!(error instanceof WorkflowError)) throw error;
    redirect(`/admin/student-support/${id}?workflowError=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/student-support/${id}`);
}
