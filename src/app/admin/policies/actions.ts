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

const PERMISSIONS = MODULE_PERMISSIONS.policies;
const ENTITY_TYPE = "Policy";

const policySchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(300),
  category: z.string().trim().max(200).optional(),
  body: z.string().trim().max(20000).optional(),
});

export type PolicyFormState = { error: string | null };

function parseForm(formData: FormData) {
  return policySchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category") || undefined,
    body: formData.get("body") || undefined,
  });
}

export async function createPolicy(
  _prevState: PolicyFormState,
  formData: FormData,
): Promise<PolicyFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const college = await getPrimaryCollege();
  if (!college) {
    return { error: "No college record exists yet — cannot create content." };
  }

  const policy = await prisma.policy.create({
    data: {
      collegeId: college.id,
      title: parsed.data.title,
      category: parsed.data.category || null,
      body: parsed.data.body || null,
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
    entityId: policy.id,
    after: policy,
  });

  redirect(`/admin/policies/${policy.id}`);
}

export async function updatePolicy(
  id: string,
  _prevState: PolicyFormState,
  formData: FormData,
): Promise<PolicyFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const before = await prisma.policy.findUnique({ where: { id } });
  if (!before) {
    return { error: "Policy not found." };
  }

  const after = await prisma.policy.update({
    where: { id },
    data: {
      title: parsed.data.title,
      category: parsed.data.category || null,
      body: parsed.data.body || null,
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

  redirect(`/admin/policies/${id}`);
}

export async function transitionPolicy(
  id: string,
  action: WorkflowActionName,
  formData: FormData,
): Promise<void> {
  const user = await requirePermission(
    MANAGE_PERMISSION_ACTIONS.has(action) ? PERMISSIONS.manage : PERMISSIONS.publish,
  );
  const comment = formData.get("comment")?.toString();

  const policy = await prisma.policy.findUniqueOrThrow({ where: { id } });

  try {
    await applyWorkflowTransition({
      entityType: ENTITY_TYPE,
      entityId: id,
      currentStatus: policy.status,
      action,
      actorId: user.id,
      comment,
      update: (data) => prisma.policy.update({ where: { id }, data }),
    });
  } catch (error) {
    if (!(error instanceof WorkflowError)) throw error;
    redirect(`/admin/policies/${id}?workflowError=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/policies/${id}`);
}
