"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { optionalDateField, requiredDateField } from "@/lib/admin/zod-helpers";
import { applyWorkflowTransition, WorkflowError, type WorkflowActionName } from "@/lib/content-workflow";
import { logAudit } from "@/lib/audit";
import { getPrimaryCollege } from "@/lib/content";

const PERMISSIONS = MODULE_PERMISSIONS.workshops;
const ENTITY_TYPE = "Workshop";

const workshopSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(300),
  departmentId: z.string().trim().optional(),
  description: z.string().trim().max(4000).optional(),
  facilitator: z.string().trim().max(300).optional(),
  startDate: requiredDateField,
  endDate: optionalDateField,
  venue: z.string().trim().max(300).optional(),
});

export type WorkshopFormState = { error: string | null };

function parseForm(formData: FormData) {
  return workshopSchema.safeParse({
    title: formData.get("title"),
    departmentId: formData.get("departmentId") || undefined,
    description: formData.get("description") || undefined,
    facilitator: formData.get("facilitator") || undefined,
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") || undefined,
    venue: formData.get("venue") || undefined,
  });
}

async function resolveDepartmentId(
  departmentId: string | undefined,
  collegeId: string,
): Promise<{ ok: true; departmentId: string | null } | { ok: false; error: string }> {
  if (!departmentId) return { ok: true, departmentId: null };
  const department = await prisma.department.findUnique({ where: { id: departmentId } });
  if (!department || department.collegeId !== collegeId) {
    return { ok: false, error: "Select a valid department." };
  }
  return { ok: true, departmentId };
}

export async function createWorkshop(
  _prevState: WorkshopFormState,
  formData: FormData,
): Promise<WorkshopFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const college = await getPrimaryCollege();
  if (!college) {
    return { error: "No college record exists yet — cannot create content." };
  }

  const department = await resolveDepartmentId(parsed.data.departmentId, college.id);
  if (!department.ok) return { error: department.error };

  const workshop = await prisma.workshop.create({
    data: {
      collegeId: college.id,
      departmentId: department.departmentId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      facilitator: parsed.data.facilitator || null,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate ?? null,
      venue: parsed.data.venue || null,
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
    entityId: workshop.id,
    after: workshop,
  });

  redirect(`/admin/workshops/${workshop.id}`);
}

export async function updateWorkshop(
  id: string,
  _prevState: WorkshopFormState,
  formData: FormData,
): Promise<WorkshopFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const before = await prisma.workshop.findUnique({ where: { id } });
  if (!before) {
    return { error: "Workshop not found." };
  }

  const department = await resolveDepartmentId(parsed.data.departmentId, before.collegeId);
  if (!department.ok) return { error: department.error };

  const after = await prisma.workshop.update({
    where: { id },
    data: {
      title: parsed.data.title,
      departmentId: department.departmentId,
      description: parsed.data.description || null,
      facilitator: parsed.data.facilitator || null,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate ?? null,
      venue: parsed.data.venue || null,
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

  redirect(`/admin/workshops/${id}`);
}

export async function transitionWorkshop(
  id: string,
  action: WorkflowActionName,
  _formData: FormData,
): Promise<void> {
  const user = await requirePermission(
    action === "submit_for_review" ? PERMISSIONS.manage : PERMISSIONS.publish,
  );

  const workshop = await prisma.workshop.findUniqueOrThrow({ where: { id } });

  try {
    await applyWorkflowTransition({
      entityType: ENTITY_TYPE,
      entityId: id,
      currentStatus: workshop.status,
      action,
      actorId: user.id,
      update: (data) => prisma.workshop.update({ where: { id }, data }),
    });
  } catch (error) {
    if (!(error instanceof WorkflowError)) throw error;
  }

  redirect(`/admin/workshops/${id}`);
}
