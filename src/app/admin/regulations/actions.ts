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

const PERMISSIONS = MODULE_PERMISSIONS.regulations;
const ENTITY_TYPE = "Regulation";

const regulationSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(300),
  category: z.string().trim().max(200).optional(),
  body: z.string().trim().max(20000).optional(),
  regulatingBody: z.string().trim().max(300).optional(),
});

export type RegulationFormState = { error: string | null };

function parseForm(formData: FormData) {
  return regulationSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category") || undefined,
    body: formData.get("body") || undefined,
    regulatingBody: formData.get("regulatingBody") || undefined,
  });
}

export async function createRegulation(
  _prevState: RegulationFormState,
  formData: FormData,
): Promise<RegulationFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const college = await getPrimaryCollege();
  if (!college) {
    return { error: "No college record exists yet — cannot create content." };
  }

  const regulation = await prisma.regulation.create({
    data: {
      collegeId: college.id,
      title: parsed.data.title,
      category: parsed.data.category || null,
      body: parsed.data.body || null,
      regulatingBody: parsed.data.regulatingBody || null,
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
    entityId: regulation.id,
    after: regulation,
  });

  redirect(`/admin/regulations/${regulation.id}`);
}

export async function updateRegulation(
  id: string,
  _prevState: RegulationFormState,
  formData: FormData,
): Promise<RegulationFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const before = await prisma.regulation.findUnique({ where: { id } });
  if (!before) {
    return { error: "Regulation not found." };
  }

  const after = await prisma.regulation.update({
    where: { id },
    data: {
      title: parsed.data.title,
      category: parsed.data.category || null,
      body: parsed.data.body || null,
      regulatingBody: parsed.data.regulatingBody || null,
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

  redirect(`/admin/regulations/${id}`);
}

export async function transitionRegulation(
  id: string,
  action: WorkflowActionName,
  formData: FormData,
): Promise<void> {
  const user = await requirePermission(
    MANAGE_PERMISSION_ACTIONS.has(action) ? PERMISSIONS.manage : PERMISSIONS.publish,
  );
  const comment = formData.get("comment")?.toString();

  const regulation = await prisma.regulation.findUniqueOrThrow({ where: { id } });

  try {
    await applyWorkflowTransition({
      entityType: ENTITY_TYPE,
      entityId: id,
      currentStatus: regulation.status,
      action,
      actorId: user.id,
      comment,
      update: (data) => prisma.regulation.update({ where: { id }, data }),
    });
  } catch (error) {
    if (!(error instanceof WorkflowError)) throw error;
    redirect(`/admin/regulations/${id}?workflowError=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/regulations/${id}`);
}
