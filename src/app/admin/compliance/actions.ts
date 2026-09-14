"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/guard";
import {
  applyComplianceTransition,
  ComplianceWorkflowError,
  VIEW_PERMISSION_ACTIONS,
  type ComplianceActionName,
} from "@/lib/compliance-workflow";
import { logAudit } from "@/lib/audit";

const ENTITY_TYPE = "ComplianceRequirement";

export async function transitionRequirement(
  id: string,
  action: ComplianceActionName,
  formData: FormData,
): Promise<void> {
  const user = await requirePermission(
    VIEW_PERMISSION_ACTIONS.has(action) ? "compliance:view" : "compliance:verify",
  );
  const comment = formData.get("comment")?.toString();

  const requirement = await prisma.complianceRequirement.findUniqueOrThrow({ where: { id } });

  try {
    await applyComplianceTransition({
      requirementId: id,
      currentStatus: requirement.status,
      action,
      actorId: user.id,
      comment,
    });
  } catch (error) {
    if (!(error instanceof ComplianceWorkflowError)) throw error;
    redirect(`/admin/compliance/${id}?workflowError=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/compliance/${id}`);
}

const evidenceSchema = z.object({
  entityType: z.string().trim().min(1, "Entity type is required").max(100),
  entityId: z.string().trim().min(1, "Entity ID is required").max(200),
  note: z.string().trim().max(2000).optional(),
});

export type EvidenceFormState = { error: string | null };

export async function addEvidence(
  requirementId: string,
  _prevState: EvidenceFormState,
  formData: FormData,
): Promise<EvidenceFormState> {
  const user = await requirePermission("compliance:view");

  const parsed = evidenceSchema.safeParse({
    entityType: formData.get("entityType"),
    entityId: formData.get("entityId"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const evidence = await prisma.complianceEvidence.create({
    data: {
      requirementId,
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
      note: parsed.data.note || null,
      addedById: user.id,
    },
  });

  await logAudit({
    actorId: user.id,
    action: "COMPLIANCE_EVIDENCE_ADDED",
    entityType: ENTITY_TYPE,
    entityId: requirementId,
    after: evidence,
  });

  redirect(`/admin/compliance/${requirementId}`);
}
