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

const PERMISSIONS = MODULE_PERMISSIONS.feeStructures;
const ENTITY_TYPE = "FeeStructure";

const feeStructureSchema = z.object({
  programId: z.string().trim().min(1, "Program is required"),
  admissionId: z.string().trim().optional(),
  academicYear: z.string().trim().min(1, "Academic year is required").max(20),
  feeType: z.string().trim().min(1, "Fee type is required").max(200),
  amount: z.coerce
    .number({ error: "Enter a valid amount" })
    .positive("Amount must be greater than zero"),
  currency: z.string().trim().max(10).optional(),
});

export type FeeStructureFormState = { error: string | null };

function parseForm(formData: FormData) {
  return feeStructureSchema.safeParse({
    programId: formData.get("programId"),
    admissionId: formData.get("admissionId") || undefined,
    academicYear: formData.get("academicYear"),
    feeType: formData.get("feeType"),
    amount: formData.get("amount"),
    currency: formData.get("currency") || undefined,
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

async function resolveAdmissionId(
  admissionId: string | undefined,
  collegeId: string,
): Promise<{ ok: true; admissionId: string | null } | { ok: false; error: string }> {
  if (!admissionId) return { ok: true, admissionId: null };
  const admission = await prisma.admission.findUnique({ where: { id: admissionId } });
  if (!admission || admission.collegeId !== collegeId) {
    return { ok: false, error: "Select a valid admission cycle." };
  }
  return { ok: true, admissionId };
}

export async function createFeeStructure(
  _prevState: FeeStructureFormState,
  formData: FormData,
): Promise<FeeStructureFormState> {
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

  const admission = await resolveAdmissionId(parsed.data.admissionId, college.id);
  if (!admission.ok) return { error: admission.error };

  const feeStructure = await prisma.feeStructure.create({
    data: {
      collegeId: college.id,
      programId: parsed.data.programId,
      admissionId: admission.admissionId,
      academicYear: parsed.data.academicYear,
      feeType: parsed.data.feeType,
      amount: parsed.data.amount,
      currency: parsed.data.currency || "PKR",
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
    entityId: feeStructure.id,
    after: feeStructure,
  });

  redirect(`/admin/fee-structures/${feeStructure.id}`);
}

export async function updateFeeStructure(
  id: string,
  _prevState: FeeStructureFormState,
  formData: FormData,
): Promise<FeeStructureFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const before = await prisma.feeStructure.findUnique({ where: { id } });
  if (!before) {
    return { error: "Fee structure not found." };
  }

  const program = await resolveProgramId(parsed.data.programId, before.collegeId);
  if (!program.ok) return { error: program.error };

  const admission = await resolveAdmissionId(parsed.data.admissionId, before.collegeId);
  if (!admission.ok) return { error: admission.error };

  const after = await prisma.feeStructure.update({
    where: { id },
    data: {
      programId: parsed.data.programId,
      admissionId: admission.admissionId,
      academicYear: parsed.data.academicYear,
      feeType: parsed.data.feeType,
      amount: parsed.data.amount,
      currency: parsed.data.currency || "PKR",
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

  redirect(`/admin/fee-structures/${id}`);
}

export async function transitionFeeStructure(
  id: string,
  action: WorkflowActionName,
  formData: FormData,
): Promise<void> {
  const user = await requirePermission(
    MANAGE_PERMISSION_ACTIONS.has(action) ? PERMISSIONS.manage : PERMISSIONS.publish,
  );
  const comment = formData.get("comment")?.toString();

  const feeStructure = await prisma.feeStructure.findUniqueOrThrow({ where: { id } });

  try {
    await applyWorkflowTransition({
      entityType: ENTITY_TYPE,
      entityId: id,
      currentStatus: feeStructure.status,
      action,
      actorId: user.id,
      comment,
      update: (data) => prisma.feeStructure.update({ where: { id }, data }),
    });
  } catch (error) {
    if (!(error instanceof WorkflowError)) throw error;
    redirect(`/admin/fee-structures/${id}?workflowError=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/fee-structures/${id}`);
}
