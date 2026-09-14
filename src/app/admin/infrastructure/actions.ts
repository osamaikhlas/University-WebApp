"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { applyWorkflowTransition, WorkflowError, type WorkflowActionName } from "@/lib/content-workflow";
import { logAudit } from "@/lib/audit";
import { getPrimaryCollege } from "@/lib/content";

const PERMISSIONS = MODULE_PERMISSIONS.infrastructure;
const ENTITY_TYPE = "Infrastructure";

const INFRASTRUCTURE_CATEGORIES = [
  "CLASSROOM",
  "LAB",
  "LIBRARY",
  "COMPUTER_LAB",
  "MOOT_COURT",
  "OFFICE",
  "SPORTS",
  "OTHER",
] as const;

const infrastructureSchema = z.object({
  category: z.enum(INFRASTRUCTURE_CATEGORIES, { error: "Select a valid category" }),
  name: z.string().trim().min(1, "Name is required").max(300),
  description: z.string().trim().max(4000).optional(),
});

export type InfrastructureFormState = { error: string | null };

function parseForm(formData: FormData) {
  return infrastructureSchema.safeParse({
    category: formData.get("category"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
}

export async function createInfrastructure(
  _prevState: InfrastructureFormState,
  formData: FormData,
): Promise<InfrastructureFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const college = await getPrimaryCollege();
  if (!college) {
    return { error: "No college record exists yet — cannot create content." };
  }

  const infrastructure = await prisma.infrastructure.create({
    data: {
      collegeId: college.id,
      category: parsed.data.category,
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
    entityId: infrastructure.id,
    after: infrastructure,
  });

  redirect(`/admin/infrastructure/${infrastructure.id}`);
}

export async function updateInfrastructure(
  id: string,
  _prevState: InfrastructureFormState,
  formData: FormData,
): Promise<InfrastructureFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const before = await prisma.infrastructure.findUnique({ where: { id } });
  if (!before) {
    return { error: "Infrastructure item not found." };
  }

  const after = await prisma.infrastructure.update({
    where: { id },
    data: {
      category: parsed.data.category,
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

  redirect(`/admin/infrastructure/${id}`);
}

export async function transitionInfrastructure(
  id: string,
  action: WorkflowActionName,
  _formData: FormData,
): Promise<void> {
  const user = await requirePermission(
    action === "submit_for_review" ? PERMISSIONS.manage : PERMISSIONS.publish,
  );

  const infrastructure = await prisma.infrastructure.findUniqueOrThrow({ where: { id } });

  try {
    await applyWorkflowTransition({
      entityType: ENTITY_TYPE,
      entityId: id,
      currentStatus: infrastructure.status,
      action,
      actorId: user.id,
      update: (data) => prisma.infrastructure.update({ where: { id }, data }),
    });
  } catch (error) {
    if (!(error instanceof WorkflowError)) throw error;
  }

  redirect(`/admin/infrastructure/${id}`);
}
