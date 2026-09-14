"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { optionalDateField } from "@/lib/admin/zod-helpers";
import {
  applyWorkflowTransition,
  WorkflowError,
  MANAGE_PERMISSION_ACTIONS,
  type WorkflowActionName,
} from "@/lib/content-workflow";
import { logAudit } from "@/lib/audit";
import { getPrimaryCollege } from "@/lib/content";

const PERMISSIONS = MODULE_PERMISSIONS.admissions;
const ENTITY_TYPE = "Admission";

const admissionSchema = z.object({
  programId: z.string().trim().min(1, "Program is required"),
  academicYear: z.string().trim().min(1, "Academic year is required").max(20),
  eligibilityCriteria: z.string().trim().max(4000).optional(),
  applicationStartDate: optionalDateField,
  applicationEndDate: optionalDateField,
});

export type AdmissionFormState = { error: string | null };

function parseForm(formData: FormData) {
  return admissionSchema.safeParse({
    programId: formData.get("programId"),
    academicYear: formData.get("academicYear"),
    eligibilityCriteria: formData.get("eligibilityCriteria") || undefined,
    applicationStartDate: formData.get("applicationStartDate") || undefined,
    applicationEndDate: formData.get("applicationEndDate") || undefined,
  });
}

async function resolveProgramId(
  programId: string,
  collegeId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const program = await prisma.program.findUnique({ where: { id: programId } });
  if (!program || program.collegeId !== collegeId) {
    return { ok: false, error: "Select a valid program." };
  }
  return { ok: true };
}

export async function createAdmission(
  _prevState: AdmissionFormState,
  formData: FormData,
): Promise<AdmissionFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const college = await getPrimaryCollege();
  if (!college) {
    return { error: "No college record exists yet — cannot create content." };
  }

  const program = await resolveProgramId(parsed.data.programId, college.id);
  if (!program.ok) return { error: program.error };

  const admission = await prisma.admission.create({
    data: {
      collegeId: college.id,
      programId: parsed.data.programId,
      academicYear: parsed.data.academicYear,
      eligibilityCriteria: parsed.data.eligibilityCriteria || null,
      applicationStartDate: parsed.data.applicationStartDate ?? null,
      applicationEndDate: parsed.data.applicationEndDate ?? null,
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
    entityId: admission.id,
    after: admission,
  });

  redirect(`/admin/admissions/${admission.id}`);
}

export async function updateAdmission(
  id: string,
  _prevState: AdmissionFormState,
  formData: FormData,
): Promise<AdmissionFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const before = await prisma.admission.findUnique({ where: { id } });
  if (!before) {
    return { error: "Admission not found." };
  }

  const program = await resolveProgramId(parsed.data.programId, before.collegeId);
  if (!program.ok) return { error: program.error };

  const after = await prisma.admission.update({
    where: { id },
    data: {
      programId: parsed.data.programId,
      academicYear: parsed.data.academicYear,
      eligibilityCriteria: parsed.data.eligibilityCriteria || null,
      applicationStartDate: parsed.data.applicationStartDate ?? null,
      applicationEndDate: parsed.data.applicationEndDate ?? null,
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

  redirect(`/admin/admissions/${id}`);
}

export async function transitionAdmission(
  id: string,
  action: WorkflowActionName,
  formData: FormData,
): Promise<void> {
  const user = await requirePermission(
    MANAGE_PERMISSION_ACTIONS.has(action) ? PERMISSIONS.manage : PERMISSIONS.publish,
  );
  const comment = formData.get("comment")?.toString();

  const admission = await prisma.admission.findUniqueOrThrow({ where: { id } });

  try {
    await applyWorkflowTransition({
      entityType: ENTITY_TYPE,
      entityId: id,
      currentStatus: admission.status,
      action,
      actorId: user.id,
      comment,
      update: (data) => prisma.admission.update({ where: { id }, data }),
    });
  } catch (error) {
    if (!(error instanceof WorkflowError)) throw error;
    redirect(`/admin/admissions/${id}?workflowError=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/admissions/${id}`);
}
