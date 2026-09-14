"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { applyWorkflowTransition, WorkflowError, type WorkflowActionName } from "@/lib/content-workflow";
import { logAudit } from "@/lib/audit";
import { getPrimaryCollege } from "@/lib/content";

const PERMISSIONS = MODULE_PERMISSIONS.scholarships;
const ENTITY_TYPE = "Scholarship";

const scholarshipSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(300),
  description: z.string().trim().max(4000).optional(),
  eligibility: z.string().trim().max(4000).optional(),
});

export type ScholarshipFormState = { error: string | null };

function parseForm(formData: FormData) {
  return scholarshipSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    eligibility: formData.get("eligibility") || undefined,
  });
}

export async function createScholarship(
  _prevState: ScholarshipFormState,
  formData: FormData,
): Promise<ScholarshipFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const college = await getPrimaryCollege();
  if (!college) {
    return { error: "No college record exists yet — cannot create content." };
  }

  const scholarship = await prisma.scholarship.create({
    data: {
      collegeId: college.id,
      name: parsed.data.name,
      description: parsed.data.description || null,
      eligibility: parsed.data.eligibility || null,
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
    entityId: scholarship.id,
    after: scholarship,
  });

  redirect(`/admin/scholarships/${scholarship.id}`);
}

export async function updateScholarship(
  id: string,
  _prevState: ScholarshipFormState,
  formData: FormData,
): Promise<ScholarshipFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const before = await prisma.scholarship.findUnique({ where: { id } });
  if (!before) {
    return { error: "Scholarship not found." };
  }

  const after = await prisma.scholarship.update({
    where: { id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      eligibility: parsed.data.eligibility || null,
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

  redirect(`/admin/scholarships/${id}`);
}

export async function transitionScholarship(
  id: string,
  action: WorkflowActionName,
  _formData: FormData,
): Promise<void> {
  const user = await requirePermission(
    action === "submit_for_review" ? PERMISSIONS.manage : PERMISSIONS.publish,
  );

  const scholarship = await prisma.scholarship.findUniqueOrThrow({ where: { id } });

  try {
    await applyWorkflowTransition({
      entityType: ENTITY_TYPE,
      entityId: id,
      currentStatus: scholarship.status,
      action,
      actorId: user.id,
      update: (data) => prisma.scholarship.update({ where: { id }, data }),
    });
  } catch (error) {
    if (!(error instanceof WorkflowError)) throw error;
  }

  redirect(`/admin/scholarships/${id}`);
}
